// Operaciones sobre usuarios: alta, baja, actualizacion, roles, permisos y contrasenas.
import crypto from 'crypto';
import { UsuarioRepository, mapPublicUser } from './repositories/dynamodb/usuario';
import { RbacRepository } from './repositories/postgres/rbac';
import { hashPassword, validatePasswordPolicy, passwordInHistory, verifyPassword } from './password';
import { DOCUMENT_TYPES, STATUS_ACTIVE, STATUS_INACTIVE } from './constants';
import { UsuarioDynamo, PoliticaContrasena } from './models';
import { ResponseFactory } from 'ly-nodejs-ts-common';

const PASSWORD_HISTORY_MAX = 5;

function businessError(statusCode: number, message: string): never {
  throw ResponseFactory.error(message, statusCode);
}

export class UsuarioService {
  protected usuarioRepo: UsuarioRepository;
  protected rbac: RbacRepository;

  constructor() {
    this.usuarioRepo = new UsuarioRepository();
    this.rbac = new RbacRepository();
  }

  protected async tenantDefault(): Promise<any> {
    const tenant = await this.rbac.getTenant(process.env.TENANT_DEFAULT || 'GREIP');
    if (!tenant) {
      throw businessError(503, 'Tenant no configurado');
    }
    return tenant;
  }

  protected async defaultPasswordPolicy(tenantId: string): Promise<PoliticaContrasena> {
    const politica = await this.rbac.getPasswordPolicy(tenantId);
    if (!politica) {
      throw businessError(503, 'Politica de contrasenas no configurada para el tenant');
    }
    return politica;
  }

  async createUser(data: any): Promise<{ user: any; person: any; generatedPassword?: string }> {
    const tenant = await this.tenantDefault();
    const politica = await this.defaultPasswordPolicy(tenant.id);

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw businessError(422, 'Email no valido');
    }
    if (!DOCUMENT_TYPES.includes(data.documentType as any)) {
      throw businessError(422, 'Tipo de documento no valido');
    }
    if (!data.documentNumber) {
      throw businessError(422, 'Numero de documento es obligatorio');
    }

    const email = data.email.toLowerCase().trim();
    if (await this.usuarioRepo.emailExists(email)) {
      throw businessError(409, 'El email ya se encuentra registrado');
    }
    if (await this.usuarioRepo.documentExists(data.documentType, data.documentNumber)) {
      throw businessError(409, 'El documento ya se encuentra registrado');
    }
    if (await this.rbac.emailExists(tenant.id, email)) {
      throw businessError(409, 'El email ya se encuentra registrado en la persona');
    }
    if (await this.rbac.documentExists(tenant.id, data.documentType, data.documentNumber)) {
      throw businessError(409, 'El documento ya se encuentra registrado en la persona');
    }

    let generatedPassword: string | undefined;
    let password: string;
    if (data.password) {
      const errores = validatePasswordPolicy(data.password, politica);
      if (errores.length > 0) {
        throw businessError(422, `Contrasena invalida: ${errores.join('; ')}`);
      }
      password = hashPassword(data.password);
    } else {
      generatedPassword = generateTemporaryPassword(politica);
      password = hashPassword(generatedPassword);
    }

    const userId = crypto.randomUUID();
    const ahora = new Date().toISOString();
    const createdBy = data.createdBy || 'SYSTEM';
    const channel = data.channel || 'SYSTEM';
    const persona = await this.rbac.createPerson({
      tenant_id: tenant.id,
      first_name: data.firstName,
      father_last_name: data.fatherLastName,
      mother_last_name: data.motherLastName || null,
      document_type: data.documentType,
      document_number: data.documentNumber,
      email,
      phone: data.phone || null,
      status: STATUS_ACTIVE
    }, createdBy, channel);
    await this.rbac.createUserPersonRelation(userId, String(persona.id), tenant.id, createdBy, channel);

    const usuario: UsuarioDynamo = {
      pk: this.usuarioRepo.userPk(userId),
      sk: 'PROFILE',
      userId,
      tenant: tenant.code,
      email,
      documentKey: this.usuarioRepo.documentKey(data.documentType, data.documentNumber),
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      firstName: data.firstName,
      fatherLastName: data.fatherLastName,
      motherLastName: data.motherLastName,
      phone: data.phone,
      status: STATUS_ACTIVE,
      password,
      passwordHistory: [],
      failedAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: data.password ? ahora : null,
      mfa: {
        totp: { active: false, verified: false },
        sms: { active: false, verified: false },
        email: { active: false, verified: false }
      },
      createdBy,
      createdByChannel: channel,
      createdAt: ahora,
      updatedBy: createdBy,
      updatedByChannel: channel,
      updatedAt: ahora
    };

    await this.usuarioRepo.create(usuario);
    return { user: mapPublicUser(usuario), person: persona, generatedPassword };
  }

  async updateUser(userId: string, campos: any, actor?: string): Promise<any> {
    const tenant = await this.tenantDefault();
    const actual = await this.usuarioRepo.getById(userId);
    if (!actual) {
      throw businessError(404, 'Usuario no encontrado');
    }
    if (actual.tenant !== tenant.code) {
      throw businessError(404, 'Usuario no pertenece al tenant');
    }

    if (campos.email && campos.email.toLowerCase().trim() !== actual.email) {
      if (await this.usuarioRepo.emailExists(campos.email)) {
        throw businessError(409, 'El email ya se encuentra registrado');
      }
      if (await this.rbac.emailExists(tenant.id, campos.email.toLowerCase().trim())) {
        throw businessError(409, 'El email ya se encuentra registrado en la persona');
      }
    }
    if ((campos.documentType && campos.documentNumber) &&
        (campos.documentType !== actual.documentType || campos.documentNumber !== actual.documentNumber)) {
      if (await this.usuarioRepo.documentExists(campos.documentType, campos.documentNumber)) {
        throw businessError(409, 'El documento ya se encuentra registrado');
      }
    }

    const actualizado = await this.usuarioRepo.actualizar(userId, { ...campos, updatedBy: actor || campos.updatedBy || actual.updatedBy, updatedByChannel: campos.updatedByChannel || actual.updatedByChannel });
    if (!actualizado) {
      throw businessError(404, 'Usuario no encontrado');
    }

    const personaActual = await this.rbac.getUserPerson(userId);
    if (personaActual) {
      await this.rbac.updatePerson(String(personaActual.person_id), {
        first_name: campos.firstName,
        father_last_name: campos.fatherLastName,
        mother_last_name: campos.motherLastName,
        document_type: campos.documentType,
        document_number: campos.documentNumber,
        email: campos.email ? campos.email.toLowerCase().trim() : undefined,
        phone: campos.phone,
        status: campos.status
      }, actor, campos.channel || 'SYSTEM');
    }

    return mapPublicUser(actualizado);
  }

  async deleteUser(userId: string, actor?: string, channel?: string): Promise<void> {
    const actual = await this.usuarioRepo.getById(userId);
    if (!actual) {
      throw businessError(404, 'Usuario no encontrado');
    }
    await this.usuarioRepo.actualizar(userId, { status: STATUS_INACTIVE, updatedBy: actor || 'SYSTEM', updatedByChannel: channel || 'SYSTEM' });
  }

  async getUser(userId: string): Promise<{ user: any; person: any; roles: any[]; permissions: string[] }> {
    const usuario = await this.usuarioRepo.getById(userId);
    if (!usuario) {
      throw businessError(404, 'Usuario no encontrado');
    }
    const tenant = await this.tenantDefault();
    const person = await this.rbac.getUserPerson(userId);
    const roles = await this.rbac.getUserRoles(userId);
    const permissions = await this.rbac.getUserPermissions(userId);
    return { user: mapPublicUser(usuario, tenant.id), person, roles, permissions };
  }

  async listUsers(page: number, pageSize: number, filtros?: any): Promise<{ data: any[]; total: number }> {
    const tenant = await this.tenantDefault();
    const resultado = await this.usuarioRepo.list(page, pageSize, filtros);
    return { data: resultado.data.map((u) => mapPublicUser(u, tenant.id)), total: resultado.total };
  }

  async assignRole(userId: string, roleId: string, actor?: string, channel?: string): Promise<void> {
    const tenant = await this.tenantDefault();
    const rol = await this.rbac.getRole(roleId, tenant.id);
    if (!rol) {
      throw businessError(404, 'Rol no encontrado');
    }
    await this.rbac.assignRole(userId, roleId, actor, channel || 'SYSTEM');
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.rbac.removeRole(userId, roleId);
  }

  async listRoles(): Promise<any[]> {
    const tenant = await this.tenantDefault();
    return await this.rbac.listRoles(tenant.id);
  }

  async listPermissions(): Promise<any[]> {
    const tenant = await this.tenantDefault();
    return await this.rbac.listPermissions(tenant.id);
  }

  async createRole(data: any, actor?: string, channel?: string): Promise<any> {
    const tenant = await this.tenantDefault();
    if (!data.code || !data.name) {
      throw businessError(422, 'code y name son obligatorios para el rol');
    }
    const existente = await this.roleByCode(tenant.id, data.code);
    if (existente) {
      throw businessError(409, 'Ya existe un rol con el codigo indicado');
    }
    return await this.rbac.createRole({
      tenant_id: tenant.id,
      code: data.code,
      name: data.name,
      description: data.description || null,
      status: STATUS_ACTIVE
    }, actor, channel || 'SYSTEM');
  }

  async roleByCode(tenantId: number, code: string): Promise<any | null> {
    const roles = await this.rbac.listRoles(String(tenantId));
    return roles.find((r: any) => r.code === code) || null;
  }

  async updateRole(roleId: string, campos: any, actor?: string, channel?: string): Promise<any> {
    const tenant = await this.tenantDefault();
    const rol = await this.rbac.getRole(roleId, tenant.id);
    if (!rol) {
      throw businessError(404, 'Rol no encontrado');
    }
    if (campos.code && campos.code !== rol.code) {
      const existente = await this.roleByCode(tenant.id, campos.code);
      if (existente) {
        throw businessError(409, 'Ya existe un rol con el codigo indicado');
      }
    }
    const actualizado = await this.rbac.updateRole(roleId, tenant.id, {
      name: campos.name,
      description: campos.description,
      status: campos.status
    }, actor, channel || 'SYSTEM');
    if (!actualizado) {
      throw businessError(404, 'Rol no encontrado');
    }
    return actualizado;
  }

  async deleteRole(roleId: string): Promise<void> {
    const tenant = await this.tenantDefault();
    const rol = await this.rbac.getRole(roleId, tenant.id);
    if (!rol) {
      throw businessError(404, 'Rol no encontrado');
    }
    if (rol.code === 'ADMIN') {
      throw businessError(409, 'El rol ADMIN no puede eliminarse');
    }
    await this.rbac.deleteRole(roleId, tenant.id);
  }

  async createPermission(data: any, actor?: string, channel?: string): Promise<any> {
    const tenant = await this.tenantDefault();
    if (!data.code || !data.name) {
      throw businessError(422, 'code y name son obligatorios para el permiso');
    }
    const existente = await this.permissionByCode(tenant.id, data.code);
    if (existente) {
      throw businessError(409, 'Ya existe un permiso con el codigo indicado');
    }
    const creada = await this.rbac.createPermission({
      tenant_id: tenant.id,
      code: data.code,
      name: data.name,
      description: data.description || null
    }, actor, channel || 'SYSTEM');
    if (!creada) {
      throw businessError(409, 'El permiso ya existe o no pudo crearse');
    }
    return creada;
  }

  async permissionByCode(tenantId: number, code: string): Promise<any | null> {
    const permisos = await this.rbac.listPermissions(String(tenantId));
    return permisos.find((p: any) => p.code === code) || null;
  }

  async updatePermission(permissionId: string, campos: any, actor?: string, channel?: string): Promise<any> {
    const tenant = await this.tenantDefault();
    const existente = await this.getPermission(permissionId, tenant.id);
    if (!existente) {
      throw businessError(404, 'Permiso no encontrado');
    }
    if (campos.code && campos.code !== existente.code) {
      const conMismoCodigo = await this.permissionByCode(tenant.id, campos.code);
      if (conMismoCodigo) {
        throw businessError(409, 'Ya existe un permiso con el codigo indicado');
      }
    }
    const actualizado = await this.rbac.updatePermission(permissionId, tenant.id, {
      name: campos.name,
      description: campos.description,
      status: campos.status
    }, actor, channel || 'SYSTEM');
    if (!actualizado) {
      throw businessError(404, 'Permiso no encontrado');
    }
    return actualizado;
  }

  async getPermission(permissionId: string, tenantId: number): Promise<any | null> {
    const permisos = await this.rbac.listPermissions(String(tenantId));
    return permisos.find((p: any) => String(p.id) === String(permissionId)) || null;
  }

  async deletePermission(permissionId: string): Promise<void> {
    const tenant = await this.tenantDefault();
    const existente = await this.getPermission(permissionId, tenant.id);
    if (!existente) {
      throw businessError(404, 'Permiso no encontrado');
    }
    await this.rbac.deletePermission(permissionId, tenant.id);
  }

  async assignRolePermissions(roleId: string, permissionIds: string[], actor?: string, channel?: string): Promise<any> {
    const tenant = await this.tenantDefault();
    const rol = await this.rbac.getRole(roleId, tenant.id);
    if (!rol) {
      throw businessError(404, 'Rol no encontrado');
    }
    for (const permissionId of permissionIds) {
      const permiso = await this.getPermission(permissionId, tenant.id);
      if (!permiso) {
        throw businessError(404, `Permiso ${permissionId} no encontrado`);
      }
      await this.rbac.linkPermissionToRole(roleId, permissionId, tenant.id, actor, channel || 'SYSTEM');
    }
    return await this.rbac.getRolePermissions(roleId, tenant.id);
  }

  async removeRolePermission(roleId: string, permissionId: string): Promise<boolean> {
    const tenant = await this.tenantDefault();
    const actual = await this.rbac.getRolePermissions(roleId, tenant.id);
    const permiso = actual.find((p: any) => String(p.id) === String(permissionId));
    if (!permiso) {
      throw businessError(404, 'El permiso no esta asignado al rol');
    }
    await this.rbac.unlinkPermissionFromRole(roleId, permissionId, tenant.id);
    return true;
  }

  async getRolePermissions(roleId: string): Promise<any[]> {
    const tenant = await this.tenantDefault();
    const rol = await this.rbac.getRole(roleId, tenant.id);
    if (!rol) {
      throw businessError(404, 'Rol no encontrado');
    }
    return await this.rbac.getRolePermissions(roleId, tenant.id);
  }

  async createTenant(data: any, actor?: string, channel?: string): Promise<any> {
    if (!data.code || !data.name) {
      throw businessError(422, 'code y name son obligatorios para el tenant');
    }
    const existente = await this.rbac.getTenant(data.code);
    if (existente) {
      throw businessError(409, 'Ya existe un tenant con este codigo');
    }
    return await this.rbac.createTenant({
      code: data.code,
      name: data.name,
      status: data.status || STATUS_ACTIVE
    }, actor, channel || 'SYSTEM');
  }

  async dashboardSummary(tenantId?: number): Promise<any> {
    const tenant = await this.tenantDefault();
    const counts = await this.rbac.dashboardCounts(String(tenantId || tenant.id));
    return {
      tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
      users: { active: counts?.active_people || 0, total: counts?.total_people || 0 },
      roles: { active: counts?.active_roles || 0, total: counts?.total_roles || 0 },
      permissions: { active: counts?.active_permissions || 0, total: counts?.total_permissions || 0 },
      products: { active: counts?.active_products || 0, total: counts?.total_products || 0 },
      audit: { total: counts?.total_audit || 0, last24h: counts?.audit_last_24h || 0 }
    };
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    return await this.rbac.getUserPermissions(userId);
  }

  async getUserRoles(userId: string): Promise<any[]> {
    return await this.rbac.getUserRoles(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const tenant = await this.tenantDefault();
    const politica = await this.defaultPasswordPolicy(tenant.id);
    const usuario = await this.usuarioRepo.getById(userId);
    if (!usuario) {
      throw businessError(404, 'Usuario no encontrado');
    }
    if (!verifyPassword(currentPassword, usuario.password)) {
      throw businessError(400, 'La contrasena actual es incorrecta');
    }
    this.validateNewPassword(newPassword, politica, usuario);

    const historico = [...(usuario.passwordHistory || []), usuario.password].slice(-PASSWORD_HISTORY_MAX);
    await this.usuarioRepo.actualizar(userId, {
      password: hashPassword(newPassword),
      passwordHistory: historico,
      passwordChangedAt: new Date().toISOString()
    });
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const tenant = await this.tenantDefault();
    const politica = await this.defaultPasswordPolicy(tenant.id);
    const usuario = await this.usuarioRepo.getById(userId);
    if (!usuario) {
      throw businessError(404, 'Usuario no encontrado');
    }
    this.validateNewPassword(newPassword, politica, usuario);

    const historico = [...(usuario.passwordHistory || []), usuario.password].slice(-PASSWORD_HISTORY_MAX);
    await this.usuarioRepo.actualizar(userId, {
      password: hashPassword(newPassword),
      passwordHistory: historico,
      passwordChangedAt: new Date().toISOString(),
      failedAttempts: 0,
      lockedUntil: null
    });
  }

  protected validateNewPassword(newPassword: string, politica: PoliticaContrasena, usuario: UsuarioDynamo): void {
    const errores = validatePasswordPolicy(newPassword, politica);
    if (errores.length > 0) {
      throw businessError(422, `Contrasena invalida: ${errores.join('; ')}`);
    }
    if (passwordInHistory(newPassword, usuario.passwordHistory, politica.max_reuse)) {
      throw businessError(422, 'La contrasena ya fue utilizada recientemente');
    }
    if (verifyPassword(newPassword, usuario.password)) {
      throw businessError(422, 'La contrasena no puede ser igual a la actual');
    }
  }
}

function generateTemporaryPassword(politica: PoliticaContrasena): string {
  const length = Math.max(politica?.min_length ?? 8, 12);
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&*!?';
  let password = '';
  const randomValues = Array.from(crypto.randomBytes(length));
  for (let i = 0; i < length; i++) {
    password += caracteres[randomValues[i] % caracteres.length];
  }
  return password;
}

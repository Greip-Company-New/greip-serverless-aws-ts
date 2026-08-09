// Servicio de usuarios y RBAC.
import { UsuarioService } from '../common/usuario-service';
import { Helpers, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, ResponseFactory } from 'ly-nodejs-ts-common';
import { AUDIT_EVENTS, USER_AUDIT_FIELDS } from '../common/constants';

function businessError(statusCode: number, message: string): never {
  throw ResponseFactory.error(message, statusCode);
}

export default class UsuarioLmbService {
  private usuarioService: UsuarioService;

  constructor() {
    this.usuarioService = new UsuarioService();
  }

  private ctx(payload: any) {
    const headers = payload?.headers || {};
    return {
      requestId: payload?.requestId,
      ip: headers['X-Forwarded-For'] || headers['x-forwarded-for'] || headers['Source-Ip'] || '',
      userAgent: headers['User-Agent'] || headers['user-agent'] || '',
      channel: headers['channel'] || headers['Channel'] || headers['Canal'] || headers['canal'] || ''
    };
  }

  async createUser(payload: any, identity: any): Promise<any> {
    const { ip, userAgent, channel } = this.ctx(payload);
    const resultado = await this.usuarioService.createUser({ ...payload, createdBy: identity?.sub || 'SYSTEM', channel });
    await Helpers.registerEntityChange({
      entity: 'user',
      entityKey: resultado.user.userId,
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.USER_CREATED,
      changeType: 'CREATE',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: Helpers.buildEntityChanges(null, resultado.user, USER_AUDIT_FIELDS)
    }).catch((err) => console.error('[entity-audit] createUser fallo', err));
    return resultado;
  }

  async updateUser(payload: any, identity: any): Promise<any> {
    const { userId, headers, requestId, ...campos } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!userId) {
      throw businessError(400, 'userId es obligatorio');
    }
    const antes = await this.usuarioService.getUser(userId);
    const usuario = await this.usuarioService.updateUser(userId, { ...campos, channel }, identity?.sub);
    const antesUser = antes?.user || null;
    const despuesUser = { ...antesUser, ...campos };
    const cambios = Helpers.buildEntityChanges(antesUser, despuesUser, USER_AUDIT_FIELDS);
    await Helpers.registerEntityChange({
      entity: 'user',
      entityKey: userId,
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.USER_UPDATED,
      changeType: 'UPDATE',
      status: usuario.status,
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: cambios
    }).catch((err) => console.error('[entity-audit] updateUser fallo', err));
    return usuario;
  }

  async deleteUser(payload: any, identity: any): Promise<any> {
    const { userId } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!userId) {
      throw businessError(400, 'userId es obligatorio');
    }
    const antes = await this.usuarioService.getUser(userId);
    await this.usuarioService.deleteUser(userId, identity?.sub, channel);
    const antesUser = antes?.user || null;
    await Helpers.registerEntityChange({
      entity: 'user',
      entityKey: userId,
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.USER_DELETED,
      changeType: 'DELETE',
      status: 'I',
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: Helpers.buildEntityChanges(antesUser, null, USER_AUDIT_FIELDS)
    }).catch((err) => console.error('[entity-audit] deleteUser fallo', err));
    return { deleted: true };
  }

  async listUsers(payload: any): Promise<any> {
    const page = Number(payload.page) || DEFAULT_PAGE;
    const pageSize = Number(payload.pageSize) || DEFAULT_PAGE_SIZE;
    const filtros = { status: payload.status, email: payload.email, document: payload.document };
    return await this.usuarioService.listUsers(page, pageSize, filtros);
  }

  async getUser(payload: any): Promise<any> {
    const { userId } = payload;
    if (!userId) {
      throw businessError(400, 'userId es obligatorio');
    }
    return await this.usuarioService.getUser(userId);
  }

  async assignRoles(payload: any, identity: any): Promise<any> {
    const { userId, roles } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!userId || !Array.isArray(roles) || roles.length === 0) {
      throw businessError(400, 'userId y roles son obligatorios');
    }
    const asignados = [];
    for (const roleId of roles) {
      await this.usuarioService.assignRole(userId, roleId, identity?.sub, channel);
      asignados.push(roleId);
    }
    await Helpers.registerEntityChange({
      entity: 'user',
      entityKey: userId,
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.ROLE_ASSIGNED,
      changeType: 'ASSIGN',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: { roles: { after: asignados } }
    }).catch((err) => console.error('[entity-audit] assignRoles fallo', err));
    return { assigned: asignados };
  }

  async removeRole(payload: any, identity: any): Promise<any> {
    const { userId, roleId } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!userId || !roleId) {
      throw businessError(400, 'userId y roleId son obligatorios');
    }
    await this.usuarioService.removeRole(userId, roleId);
    await Helpers.registerEntityChange({
      entity: 'user',
      entityKey: userId,
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.ROLE_REMOVED,
      changeType: 'REMOVE',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: { roles: { before: [roleId], after: [] } }
    }).catch((err) => console.error('[entity-audit] removeRole fallo', err));
    return { removed: true };
  }

  async getUserPermissions(payload: any): Promise<any> {
    const { userId } = payload;
    if (!userId) {
      throw businessError(400, 'userId es obligatorio');
    }
    const permissions = await this.usuarioService.getUserPermissions(userId);
    return { userId, permissions };
  }

  async createRole(payload: any, identity: any): Promise<any> {
    const { ip, userAgent, channel } = this.ctx(payload);
    const rol = await this.usuarioService.createRole(payload, identity?.sub, channel);
    await Helpers.registerEntityChange({
      entity: 'role',
      entityKey: String(rol.id),
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.ROLE_CREATED,
      changeType: 'CREATE',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: {
        code: { before: null, after: rol.code },
        name: { before: null, after: rol.name },
        description: { before: null, after: rol.description || '' }
      }
    }).catch((err) => console.error('[entity-audit] createRole fallo', err));
    return rol;
  }

  async listRoles(): Promise<any[]> {
    return await this.usuarioService.listRoles();
  }

  async listPermissions(): Promise<any[]> {
    return await this.usuarioService.listPermissions();
  }

  async getRole(payload: any): Promise<any> {
    const { roleId } = payload;
    if (!roleId) {
      throw businessError(400, 'roleId es obligatorio');
    }
    const roles = await this.usuarioService.listRoles();
    const rol = roles.find((r: any) => String(r.id) === String(roleId));
    if (!rol) {
      throw businessError(404, 'Rol no encontrado');
    }
    const permissions = await this.usuarioService.getRolePermissions(roleId);
    return { ...rol, permissions };
  }

  async updateRole(payload: any, identity: any): Promise<any> {
    const { roleId, requestId, headers, ...campos } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!roleId) {
      throw businessError(400, 'roleId es obligatorio');
    }
    const antes = await this.usuarioService.listRoles().then((roles) => roles.find((r: any) => String(r.id) === String(roleId)));
    if (!antes) {
      throw businessError(404, 'Rol no encontrado');
    }
    const rol = await this.usuarioService.updateRole(roleId, campos, identity?.sub, channel);
    const cambios: any = {};
    if (campos.name !== undefined && campos.name !== antes.name) cambios.name = { before: antes.name, after: campos.name };
    if (campos.description !== undefined && campos.description !== antes.description) cambios.description = { before: antes.description || '', after: campos.description || '' };
    if (campos.status !== undefined && campos.status !== antes.status) cambios.status = { before: antes.status, after: campos.status };
    await Helpers.registerEntityChange({
      entity: 'role',
      entityKey: roleId,
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.ROLE_UPDATED || 'ROLE_UPDATED',
      changeType: 'UPDATE',
      status: rol.status,
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: cambios
    }).catch((err) => console.error('[entity-audit] updateRole fallo', err));
    return rol;
  }

  async deleteRole(payload: any, identity: any): Promise<any> {
    const { roleId } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!roleId) {
      throw businessError(400, 'roleId es obligatorio');
    }
    const antes = await this.usuarioService.listRoles().then((roles) => roles.find((r: any) => String(r.id) === String(roleId)));
    if (!antes) {
      throw businessError(404, 'Rol no encontrado');
    }
    await this.usuarioService.deleteRole(roleId);
    await Helpers.registerEntityChange({
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.ROLE_DELETED || 'ROLE_DELETED',
      changeType: 'DELETE',
      status: 'I',
      entity: 'role',
      entityKey: roleId,
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: {
        code: { before: antes.code, after: null },
        name: { before: antes.name, after: null }
      }
    }).catch((err) => console.error('[entity-audit] deleteRole fallo', err));
    return { deleted: true };
  }

  async getRolePermissions(payload: any): Promise<any> {
    const { roleId } = payload;
    if (!roleId) {
      throw businessError(400, 'roleId es obligatorio');
    }
    return { roleId, permissions: await this.usuarioService.getRolePermissions(roleId) };
  }

  async assignRolePermissions(payload: any, identity: any): Promise<any> {
    const { roleId, permissions } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!roleId || !Array.isArray(permissions) || permissions.length === 0) {
      throw businessError(400, 'roleId y permissions son obligatorios');
    }
    const antes = await this.usuarioService.getRolePermissions(roleId);
    const result = await this.usuarioService.assignRolePermissions(roleId, permissions, identity?.sub, channel);
    await Helpers.registerEntityChange({
      entity: 'role',
      entityKey: roleId,
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.ROLE_PERMISSIONS_ASSIGNED,
      changeType: 'ASSIGN',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: {
        permissions: { before: antes.map((p: any) => p.code), after: result.map((p: any) => p.code) }
      }
    }).catch((err) => console.error('[entity-audit] assignRolePermissions fallo', err));
    return { roleId, permissions: result };
  }

  async removeRolePermission(payload: any, identity: any): Promise<any> {
    const { roleId, permissionId } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!roleId || !permissionId) {
      throw businessError(400, 'roleId y permissionId son obligatorios');
    }
    const antes = await this.usuarioService.getRolePermissions(roleId);
    await this.usuarioService.removeRolePermission(roleId, permissionId);
    await Helpers.registerEntityChange({
      entity: 'role',
      entityKey: roleId,
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.ROLE_PERMISSION_REMOVED,
      changeType: 'REMOVE',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: {
        permissions: { before: antes.map((p: any) => p.code), after: [permissionId] }
      }
    }).catch((err) => console.error('[entity-audit] removeRolePermission fallo', err));
    return { removed: true };
  }

  async createPermission(payload: any, identity: any): Promise<any> {
    const { ip, userAgent, channel } = this.ctx(payload);
    const permiso = await this.usuarioService.createPermission(payload, identity?.sub, channel);
    await Helpers.registerEntityChange({
      entity: 'permission',
      entityKey: String(permiso.id),
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.PERMISSION_CREATED,
      changeType: 'CREATE',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: {
        code: { before: null, after: permiso.code },
        name: { before: null, after: permiso.name },
        description: { before: null, after: permiso.description || '' }
      }
    }).catch((err) => console.error('[entity-audit] createPermission fallo', err));
    return permiso;
  }

  async updatePermission(payload: any, identity: any): Promise<any> {
    const { permissionId, headers, requestId, ...campos } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!permissionId) {
      throw businessError(400, 'permissionId es obligatorio');
    }
    const antes = await this.usuarioService.listPermissions().then((ps) => ps.find((p: any) => String(p.id) === String(permissionId)));
    if (!antes) {
      throw businessError(404, 'Permiso no encontrado');
    }
    const permiso = await this.usuarioService.updatePermission(permissionId, campos, identity?.sub, channel);
    const cambios: any = {};
    if (campos.name !== undefined && campos.name !== antes.name) cambios.name = { before: antes.name, after: campos.name };
    if (campos.description !== undefined && campos.description !== antes.description) cambios.description = { before: antes.description || '', after: campos.description || '' };
    if (campos.status !== undefined && campos.status !== antes.status) cambios.status = { before: antes.status, after: campos.status };
    await Helpers.registerEntityChange({
      entity: 'permission',
      entityKey: permissionId,
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.PERMISSION_UPDATED,
      changeType: 'UPDATE',
      status: permiso.status,
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: cambios
    }).catch((err) => console.error('[entity-audit] updatePermission fallo', err));
    return permiso;
  }

  async deletePermission(payload: any, identity: any): Promise<any> {
    const { permissionId } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!permissionId) {
      throw businessError(400, 'permissionId es obligatorio');
    }
    const antes = await this.usuarioService.listPermissions().then((ps) => ps.find((p: any) => String(p.id) === String(permissionId)));
    if (!antes) {
      throw businessError(404, 'Permiso no encontrado');
    }
    await this.usuarioService.deletePermission(permissionId);
    await Helpers.registerEntityChange({
      entity: 'permission',
      entityKey: permissionId,
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.PERMISSION_DELETED,
      changeType: 'DELETE',
      status: 'I',
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: {
        code: { before: antes.code, after: null },
        name: { before: antes.name, after: null }
      }
    }).catch((err) => console.error('[entity-audit] deletePermission fallo', err));
    return { deleted: true };
  }

  async createTenant(payload: any, identity: any): Promise<any> {
    const { ip, userAgent, channel } = this.ctx(payload);
    const tenant = await this.usuarioService.createTenant(payload, identity?.sub, channel);
    await Helpers.registerEntityChange({
      entity: 'tenant',
      entityKey: String(tenant.id),
      tenant: identity?.tenant || process.env.TENANT_DEFAULT || 'GREIP',
      tenantId: identity?.tenantId,
      action: AUDIT_EVENTS.TENANT_CREATED,
      changeType: 'CREATE',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      sourceIp: ip,
      userAgent,
      changes: {
        code: { before: null, after: tenant.code },
        name: { before: null, after: tenant.name }
      }
    }).catch((err) => console.error('[entity-audit] createTenant fallo', err));
    return tenant;
  }

  async dashboardSummary(payload: any): Promise<any> {
    return await this.usuarioService.dashboardSummary(payload?.tenantId);
  }
}

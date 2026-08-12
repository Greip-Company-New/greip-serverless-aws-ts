// Acceso al RBAC en PostgreSQL (schema greip) via PostgresDatabaseService.
import { PostgresDatabaseService } from 'ly-nodejs-ts-postgresdb';
import {
  GET_TENANT_QUERY,
  GET_PASSWORD_POLICY_QUERY,
  DOCUMENT_EXISTS_QUERY,
  EMAIL_EXISTS_QUERY,
  CREATE_PERSON_QUERY,
  CREATE_USER_PERSON_QUERY,
  GET_USER_PERSON_QUERY,
  UPDATE_PERSON_QUERY,
  LIST_ROLES_QUERY,
  CREATE_ROLE_QUERY,
  GET_ROLE_QUERY,
  LIST_PERMISSIONS_QUERY,
  ASSIGN_ROLE_QUERY,
  REMOVE_ROLE_QUERY,
  LINK_PERMISSIONS_TO_ROLE_QUERY,
  USER_ROLES_QUERY,
  USER_PERMISSIONS_QUERY,
  LIST_USER_PERSONS_QUERY,
  CREATE_TENANT_QUERY,
  UPDATE_ROLE_QUERY,
  DELETE_ROLE_QUERY,
  UPDATE_PERMISSION_QUERY,
  DELETE_PERMISSION_QUERY,
  CREATE_ROLE_PERMISSION_QUERY,
  DELETE_ROLE_PERMISSION_QUERY,
  CREATE_PERMISSION_QUERY,
  GET_ROLE_PERMISSIONS_QUERY,
  DASHBOARD_COUNTS_QUERY,
  LIST_TENANTS_QUERY,
  UPDATE_TENANT_QUERY,
  GET_PERSON_ID_BY_USER_QUERY,
  DELETE_USER_ROLES_QUERY,
  DELETE_USER_GROUP_MEMBERS_QUERY,
  DELETE_USER_PERSON_QUERY,
  DELETE_PERSON_IF_UNUSED_QUERY,
  DELETE_ENTITY_CHANGE_LOG_BY_ENTITY_QUERY,
  DELETE_ENTITY_CHANGE_LOG_BY_USER_QUERY,
  LIST_PAISES_QUERY,
  GET_PAIS_QUERY
} from './query';
import { TenantRow, RolRow, PermisoRow, PersonaRow, PoliticaContrasena, PaisRow } from '../../models';

export class RbacRepository {
  private db: PostgresDatabaseService;

  constructor() {
    this.db = new PostgresDatabaseService(process.env.PG_SECRET_DB || 'Greip/postgres/dev');
  }

  async getTenant(code: string): Promise<TenantRow | null> {
    return await this.db.executeOne<TenantRow>(GET_TENANT_QUERY, [code]);
  }

  async getPasswordPolicy(tenantId: string): Promise<PoliticaContrasena | null> {
    return await this.db.executeOne<PoliticaContrasena>(GET_PASSWORD_POLICY_QUERY, [tenantId]);
  }

  async documentExists(tenantId: string, documentType: string, documentNumber: string): Promise<boolean> {
    return await this.db.exists(DOCUMENT_EXISTS_QUERY, [tenantId, documentType, documentNumber]);
  }

  async emailExists(tenantId: string, email: string): Promise<boolean> {
    return await this.db.exists(EMAIL_EXISTS_QUERY, [tenantId, email]);
  }

  async createPerson(p: Omit<PersonaRow, 'id' | 'created_by' | 'created_at' | 'updated_by' | 'updated_at'>, createdBy?: string, channel?: string): Promise<PersonaRow> {
    const actor = createdBy || 'SYSTEM';
    const canal = channel || 'SYSTEM';
    const rows = await this.db.execute<PersonaRow>(CREATE_PERSON_QUERY, [
      p.tenant_id,
      p.first_name,
      p.father_last_name,
      p.mother_last_name,
      p.document_type,
      p.document_number,
      p.email,
      p.phone,
      p.status,
      actor,
      canal
    ]);
    return rows.rows[0];
  }

  async createUserPersonRelation(userId: string, personId: string, tenantId: string, createdBy?: string, channel?: string): Promise<void> {
    await this.db.execute(CREATE_USER_PERSON_QUERY, [userId, personId, tenantId, createdBy || 'SYSTEM', channel || 'SYSTEM']);
  }

  async getUserPerson(userId: string): Promise<PersonaRow | null> {
    return await this.db.executeOne<PersonaRow>(GET_USER_PERSON_QUERY, [userId]);
  }

  async updatePerson(personId: string, campos: Partial<PersonaRow>, updatedBy?: string, channel?: string): Promise<PersonaRow | null> {
    const rows = await this.db.execute<PersonaRow>(UPDATE_PERSON_QUERY, [
      personId,
      campos.first_name,
      campos.father_last_name,
      campos.mother_last_name,
      campos.document_type,
      campos.document_number,
      campos.email,
      campos.phone,
      campos.status,
      updatedBy || 'SYSTEM',
      channel || 'SYSTEM'
    ]);
    return rows.rows[0] || null;
  }

  async listRoles(tenantId: string): Promise<RolRow[]> {
    const result = await this.db.execute<RolRow>(LIST_ROLES_QUERY, [tenantId]);
    return result.rows;
  }

  async createRole(rol: Omit<RolRow, 'id' | 'created_by' | 'created_at' | 'updated_by' | 'updated_at'>, createdBy?: string, channel?: string): Promise<RolRow> {
    const rows = await this.db.execute<RolRow>(CREATE_ROLE_QUERY, [rol.tenant_id, rol.code, rol.name, rol.description, rol.status, createdBy || 'SYSTEM', channel || 'SYSTEM']);
    return rows.rows[0];
  }

  async getRole(rolId: string, tenantId: string): Promise<RolRow | null> {
    return await this.db.executeOne<RolRow>(GET_ROLE_QUERY, [rolId, tenantId]);
  }

  async listPermissions(tenantId: string): Promise<PermisoRow[]> {
    const result = await this.db.execute<PermisoRow>(LIST_PERMISSIONS_QUERY, [tenantId]);
    return result.rows;
  }

  async assignRole(userId: string, roleId: string, createdBy?: string, channel?: string): Promise<void> {
    await this.db.execute(ASSIGN_ROLE_QUERY, [userId, roleId, createdBy || 'SYSTEM', channel || 'SYSTEM']);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.db.execute(REMOVE_ROLE_QUERY, [userId, roleId]);
  }

  async linkPermissionsToRole(roleId: string, tenantId: string, createdBy?: string, channel?: string): Promise<void> {
    await this.db.execute(LINK_PERMISSIONS_TO_ROLE_QUERY, [roleId, tenantId, createdBy || 'SYSTEM', channel || 'SYSTEM']);
  }

  async getUserRoles(userId: string): Promise<RolRow[]> {
    const result = await this.db.execute<RolRow>(USER_ROLES_QUERY, [userId]);
    return result.rows;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const result = await this.db.execute<{ code: string }>(USER_PERMISSIONS_QUERY, [userId]);
    return result.rows.map((r) => r.code);
  }

  async listUserPersons(tenantId: string): Promise<PersonaRow[]> {
    const result = await this.db.execute<PersonaRow>(LIST_USER_PERSONS_QUERY, [tenantId]);
    return result.rows;
  }

  async createTenant(t: Omit<TenantRow, 'id' | 'created_by' | 'created_at' | 'updated_by' | 'updated_at'>, createdBy?: string, channel?: string): Promise<TenantRow> {
    const rows = await this.db.execute<TenantRow>(CREATE_TENANT_QUERY, [
      t.code, t.name,
      t.ruc || null,
      t.razon_social || null,
      t.pais_id || null,
      t.idioma || 'es',
      t.moneda || 'PEN',
      t.formato_fecha || 'DD/MM/YYYY',
      t.formato_fecha_hora || 'DD/MM/YYYY HH:mm',
      t.formato_decimales || '#,##0.00',
      t.status,
      createdBy || 'SYSTEM', channel || 'SYSTEM'
    ]);
    return rows.rows[0];
  }

  async listTenants(): Promise<TenantRow[]> {
    const result = await this.db.execute<TenantRow>(LIST_TENANTS_QUERY, []);
    return result.rows;
  }

  async updateTenant(tenantId: string, campos: Partial<TenantRow>, updatedBy?: string, channel?: string): Promise<TenantRow | null> {
    const rows = await this.db.execute<TenantRow>(UPDATE_TENANT_QUERY, [
      tenantId,
      campos.name || null,
      campos.ruc !== undefined ? campos.ruc : null,
      campos.razon_social !== undefined ? campos.razon_social : null,
      campos.pais_id !== undefined ? campos.pais_id : null,
      campos.idioma !== undefined ? campos.idioma : null,
      campos.moneda !== undefined ? campos.moneda : null,
      campos.formato_fecha !== undefined ? campos.formato_fecha : null,
      campos.formato_fecha_hora !== undefined ? campos.formato_fecha_hora : null,
      campos.formato_decimales !== undefined ? campos.formato_decimales : null,
      campos.status || null,
      updatedBy || 'SYSTEM',
      channel || 'SYSTEM'
    ]);
    return rows.rows[0] || null;
  }

  async listPaises(): Promise<PaisRow[]> {
    const result = await this.db.execute<PaisRow>(LIST_PAISES_QUERY, []);
    return result.rows;
  }

  async getPais(id: string): Promise<PaisRow | null> {
    return await this.db.executeOne<PaisRow>(GET_PAIS_QUERY, [id]);
  }

  async updateRole(roleId: string, tenantId: string, campos: Partial<RolRow>, updatedBy?: string, channel?: string): Promise<RolRow | null> {
    const rows = await this.db.execute<RolRow>(UPDATE_ROLE_QUERY, [
      roleId, tenantId,
      campos.name || null,
      campos.description || null,
      campos.status || null,
      updatedBy || 'SYSTEM',
      channel || 'SYSTEM'
    ]);
    return rows.rows[0] || null;
  }

  async deleteRole(roleId: string, tenantId: string): Promise<void> {
    await this.db.execute(DELETE_ROLE_QUERY, [roleId, tenantId]);
  }

  async createPermission(p: Omit<PermisoRow, 'id' | 'status' | 'created_by' | 'created_at' | 'updated_by' | 'updated_at'>, createdBy?: string, channel?: string): Promise<PermisoRow | null> {
    const rows = await this.db.execute<PermisoRow>(CREATE_PERMISSION_QUERY, [
      p.tenant_id, p.code, p.name, p.description || null,
      createdBy || 'SYSTEM', channel || 'SYSTEM'
    ]);
    return rows.rows[0] || null;
  }

  async updatePermission(permissionId: string, tenantId: string, campos: Partial<PermisoRow>, updatedBy?: string, channel?: string): Promise<PermisoRow | null> {
    const rows = await this.db.execute<PermisoRow>(UPDATE_PERMISSION_QUERY, [
      permissionId, tenantId,
      campos.name || null,
      campos.description || null,
      campos.status || null,
      updatedBy || 'SYSTEM',
      channel || 'SYSTEM'
    ]);
    return rows.rows[0] || null;
  }

  async deletePermission(permissionId: string, tenantId: string): Promise<void> {
    await this.db.execute(DELETE_PERMISSION_QUERY, [permissionId, tenantId]);
  }

  async linkPermissionToRole(roleId: string, permissionId: string, tenantId: string, createdBy?: string, channel?: string): Promise<boolean> {
    const result = await this.db.execute(CREATE_ROLE_PERMISSION_QUERY, [roleId, tenantId, createdBy || 'SYSTEM', channel || 'SYSTEM', permissionId]);
    return result.rows.length > 0;
  }

  async unlinkPermissionFromRole(roleId: string, permissionId: string, tenantId: string): Promise<void> {
    await this.db.execute(DELETE_ROLE_PERMISSION_QUERY, [roleId, permissionId, tenantId]);
  }

  async getRolePermissions(roleId: string, tenantId: string): Promise<PermisoRow[]> {
    const result = await this.db.execute<PermisoRow>(GET_ROLE_PERMISSIONS_QUERY, [roleId, tenantId]);
    return result.rows;
  }

  async dashboardCounts(tenantId: string): Promise<any> {
    const result = await this.db.execute(DASHBOARD_COUNTS_QUERY, [tenantId]);
    return result.rows[0] || null;
  }

  /**
   * Borrado fisico de las relaciones RBAC del usuario en PostgreSQL:
   * user_role, user_group_member y user_person; luego elimina la persona
   * si ya no queda ningun vinculo a ella. Devuelve el person_id eliminado.
   */
  async hardDeleteUserRelations(userId: string): Promise<string | null> {
    const person = await this.db.executeOne<{ person_id: string }>(GET_PERSON_ID_BY_USER_QUERY, [userId]);
    await this.db.execute(DELETE_USER_ROLES_QUERY, [userId]);
    await this.db.execute(DELETE_USER_GROUP_MEMBERS_QUERY, [userId]);
    await this.db.execute(DELETE_USER_PERSON_QUERY, [userId]);
    if (person?.person_id) {
      await this.db.execute(DELETE_PERSON_IF_UNUSED_QUERY, [String(person.person_id)]);
    }
    return person?.person_id ? String(person.person_id) : null;
  }

  /**
   * Borrado fisico del log de auditoria (greip.entity_change_log) asociado al
   * usuario: los registros cuyo entity_key le pertenece y los generados por el
   * usuario como actor.
   */
  async deleteAuditLogs(entity: string, entityKey: string, userId: string): Promise<void> {
    await this.db.execute(DELETE_ENTITY_CHANGE_LOG_BY_ENTITY_QUERY, [entity, entityKey]);
    await this.db.execute(DELETE_ENTITY_CHANGE_LOG_BY_USER_QUERY, [userId]);
  }
}

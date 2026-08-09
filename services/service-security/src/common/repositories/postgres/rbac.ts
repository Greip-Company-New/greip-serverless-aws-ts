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
  DASHBOARD_COUNTS_QUERY
} from './query';
import { TenantRow, RolRow, PermisoRow, PersonaRow, PoliticaContrasena } from '../../models';

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
    const rows = await this.db.execute<TenantRow>(CREATE_TENANT_QUERY, [t.code, t.name, t.status, createdBy || 'SYSTEM', channel || 'SYSTEM']);
    return rows.rows[0];
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
}

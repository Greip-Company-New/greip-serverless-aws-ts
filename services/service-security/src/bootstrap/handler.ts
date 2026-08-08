// Utilidad de bootstrap: crea el rol ADMIN con todos los permisos y el
// usuario administrador inicial. Sin evento HTTP; se invoca manualmente por CLI.
import { RbacRepository } from '../common/repositories/postgres/rbac';
import { UsuarioRepository } from '../common/repositories/dynamodb/usuario';
import { UsuarioService } from '../common/usuario-service';

const ADMIN_ROLE_CODE = 'ADMIN';
const ADMIN_ROLE_NAME = 'Administrador';

async function ensureAdminUser(
  rbac: RbacRepository,
  usuarioRepo: UsuarioRepository,
  usuarioService: UsuarioService,
  adminRoleId: number,
  env: Record<string, any>,
  prefix: string
): Promise<{ userId?: string; created: boolean }> {
  const isInfra = prefix === 'INFRA';
  const email = (env[`${prefix}_EMAIL`] || (isInfra ? 'infra.cloud@greip.com.pe' : 'admin@greip.com.pe')).toLowerCase().trim();
  const password = env[`${prefix}_PASSWORD`];
  const documentNumber = env[`${prefix}_DOCUMENT_NUMBER`] || '00000000';
  const firstName = env[`${prefix}_FIRST_NAME`] || (isInfra ? 'Infra' : 'Admin');
  const fatherLastName = env[`${prefix}_FATHER_LAST_NAME`] || (isInfra ? 'Cloud' : 'Greip');
  const label = prefix.toLowerCase();

  if (!password || password.length < 8) {
    throw new Error(`${prefix}_PASSWORD es obligatorio (minimo 8 caracteres)`);
  }

  let user = await usuarioRepo.getByEmail(email);
  let created = false;
  if (!user) {
    const resultado = await usuarioService.createUser({
      email,
      documentType: 'D',
      documentNumber,
      firstName,
      fatherLastName,
      password,
      createdBy: 'SYSTEM'
    });
    user = await usuarioRepo.getByEmail(email);
    created = true;
    console.log(`[bootstrap] usuario ${label} creado (userId=${resultado.user.userId})`);
  } else {
    console.log(`[bootstrap] usuario ${label} ya existia (userId=${user.userId})`);
  }

  if (user && adminRoleId) {
    await rbac.assignRole(user.userId, String(adminRoleId));
    console.log(`[bootstrap] rol ADMIN asignado al usuario ${label}`);
  }

  return { userId: user?.userId, created };
}

export async function handler(_event: any = {}): Promise<any> {
  const env = { ...process.env, ...(_event?.env || {}) };
  const tenantCode = env.TENANT_DEFAULT || 'GREIP';

  const rbac = new RbacRepository();
  const usuarioRepo = new UsuarioRepository();
  const usuarioService = new UsuarioService();

  const tenant = await rbac.getTenant(tenantCode);
  if (!tenant) {
    throw new Error('Tenant no configurado');
  }

  // 1. Rol ADMIN con todos los permisos activos del tenant.
  let adminRole = (await rbac.listRoles(String(tenant.id))).find((r) => r.code === ADMIN_ROLE_CODE);
  if (!adminRole) {
    adminRole = await rbac.createRole({
      tenant_id: tenant.id,
      code: ADMIN_ROLE_CODE,
      name: ADMIN_ROLE_NAME,
      description: 'Rol administrador con todos los permisos',
      status: 'A'
    }, 'SYSTEM');
    await rbac.linkPermissionsToRole(String(adminRole.id), String(tenant.id), 'SYSTEM');
    console.log(`[bootstrap] rol ADMIN creado (id=${adminRole.id}) con todos los permisos`);
  } else {
    console.log(`[bootstrap] rol ADMIN ya existia (id=${adminRole.id})`);
  }

  // 2. Usuarios administradores por defecto.
  const admin = await ensureAdminUser(rbac, usuarioRepo, usuarioService, adminRole!.id, env, 'ADMIN');
  const infra = await ensureAdminUser(rbac, usuarioRepo, usuarioService, adminRole!.id, env, 'INFRA');

  return {
    statusCode: 200,
    tenant: tenant.code,
    adminRoleId: adminRole?.id,
    adminUserId: admin.userId,
    adminCreated: admin.created,
    infraUserId: infra.userId,
    infraCreated: infra.created
  };
}

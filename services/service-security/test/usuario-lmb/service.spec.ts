import Service from '../../src/usuario-lmb/service';

jest.mock('../../src/common/usuario-service', () => {
  const mock = jest.fn();
  mock.prototype.createRole = jest.fn();
  mock.prototype.updateRole = jest.fn();
  mock.prototype.deleteRole = jest.fn();
  mock.prototype.deleteUserHard = jest.fn();
  mock.prototype.listRoles = jest.fn();
  mock.prototype.listPermissions = jest.fn();
  mock.prototype.getRolePermissions = jest.fn();
  mock.prototype.assignRolePermissions = jest.fn();
  mock.prototype.removeRolePermission = jest.fn();
  mock.prototype.createPermission = jest.fn();
  mock.prototype.updatePermission = jest.fn();
  mock.prototype.deletePermission = jest.fn();
  mock.prototype.createTenant = jest.fn();
  mock.prototype.dashboardSummary = jest.fn();
  return { UsuarioService: mock };
});

jest.mock('ly-nodejs-ts-common', () => {
  const registerEntityChange = jest.fn().mockResolvedValue(undefined);
  return {
    Helpers: {
      registerEntityChange,
      buildEntityChanges: jest.fn(() => ({})),
      __registerEntityChange: registerEntityChange
    },
    ResponseFactory: {
      error: (message: string, _statusCode: number) => new Error(message)
    },
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 10
  };
});

const { Helpers } = jest.requireMock('ly-nodejs-ts-common');
const service = new Service();
const identity = { sub: 'user-1', tenant: 'GREIP', tenantId: 1 };

describe('usuario-lmb/service RBAC', () => {
  const usuarioService = (service as any).usuarioService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updateRole actualiza y audita con before/after', async () => {
    usuarioService.listRoles.mockResolvedValue([{ id: 1, code: 'ADMIN', name: 'Administrador', description: null, status: 'A' }]);
    usuarioService.updateRole.mockResolvedValue({ id: 1, code: 'ADMIN', name: 'Administrador', description: 'Nuevo', status: 'A' });

    const result = await service.updateRole({ roleId: '1', name: 'Administrador', description: 'Nuevo' }, identity);

    expect(usuarioService.updateRole).toHaveBeenCalledWith('1', { name: 'Administrador', description: 'Nuevo' }, 'user-1', '');
    expect(result.name).toBe('Administrador');
    expect(Helpers.registerEntityChange).toHaveBeenCalledTimes(1);
    const event = Helpers.registerEntityChange.mock.calls[0][0];
    expect(event.action).toBe('ROLE_UPDATED');
    expect(event.changeType).toBe('UPDATE');
    expect(event.changes).toHaveProperty('description');
    expect(event.changes.description.before).toBe('');
    expect(event.changes.description.after).toBe('Nuevo');
  });

  it('deleteRole elimina y audita', async () => {
    usuarioService.listRoles.mockResolvedValue([{ id: 3, code: 'VENDEDOR', name: 'Vendedor', status: 'A' }]);
    usuarioService.deleteRole.mockResolvedValue(undefined);

    const result = await service.deleteRole({ roleId: '3' }, identity);

    expect(usuarioService.deleteRole).toHaveBeenCalledWith('3');
    expect(result.deleted).toBe(true);
    const event = Helpers.registerEntityChange.mock.calls[0][0];
    expect(event.action).toBe('ROLE_DELETED');
    expect(event.changes.code.before).toBe('VENDEDOR');
  });

  it('assignRolePermissions asigna permisos y audita', async () => {
    usuarioService.getRolePermissions.mockResolvedValue([{ id: 1, code: 'user.read' }]);
    usuarioService.assignRolePermissions.mockResolvedValue([
      { id: 1, code: 'user.read' },
      { id: 2, code: 'role.manage' }
    ]);

    const result = await service.assignRolePermissions({ roleId: '1', permissions: ['1', '2'] }, identity);

    expect(usuarioService.assignRolePermissions).toHaveBeenCalledWith('1', ['1', '2'], 'user-1', '');
    expect(result.permissions).toHaveLength(2);
    const event = Helpers.registerEntityChange.mock.calls[0][0];
    expect(event.action).toBe('ROLE_PERMISSIONS_ASSIGNED');
    expect(event.changes.permissions.before).toEqual(['user.read']);
    expect(event.changes.permissions.after).toEqual(['user.read', 'role.manage']);
  });

  it('createPermission crea y audita', async () => {
    usuarioService.createPermission.mockResolvedValue({ id: 5, code: 'reports.read', name: 'Leer reportes', status: 'A' });

    const result = await service.createPermission({ code: 'reports.read', name: 'Leer reportes' }, identity);

    expect(usuarioService.createPermission).toHaveBeenCalledWith(
      { code: 'reports.read', name: 'Leer reportes' },
      'user-1',
      ''
    );
    expect(result.code).toBe('reports.read');
    const event = Helpers.registerEntityChange.mock.calls[0][0];
    expect(event.action).toBe('PERMISSION_CREATED');
    expect(event.changes.code.after).toBe('reports.read');
  });

  it('createTenant crea y audita', async () => {
    usuarioService.createTenant.mockResolvedValue({ id: 2, code: 'NUEVO', name: 'Nueva empresa', status: 'A' });

    const result = await service.createTenant({ code: 'NUEVO', name: 'Nueva empresa' }, identity);

    expect(usuarioService.createTenant).toHaveBeenCalledWith({ code: 'NUEVO', name: 'Nueva empresa' }, 'user-1', '');
    expect(result.name).toBe('Nueva empresa');
    const event = Helpers.registerEntityChange.mock.calls[0][0];
    expect(event.action).toBe('TENANT_CREATED');
    expect(event.entity).toBe('tenant');
  });

  it('dashboardSummary delega al servicio', async () => {
    usuarioService.dashboardSummary.mockResolvedValue({
      users: { active: 10, total: 12 }
    });

    const result = await service.dashboardSummary({ tenantId: 1 });

    expect(usuarioService.dashboardSummary).toHaveBeenCalledWith(1);
    expect(result.users.total).toBe(12);
  });

  it('deleteUserHard borra fisicamente y no audita', async () => {
    usuarioService.deleteUserHard.mockResolvedValue(undefined);

    const result = await service.deleteUserHard({ userId: 'usr-99' }, { ...identity, sub: 'admin-1' });

    expect(usuarioService.deleteUserHard).toHaveBeenCalledWith('usr-99', 'admin-1');
    expect(result).toEqual({ deleted: true, userId: 'usr-99' });
    expect(Helpers.registerEntityChange).not.toHaveBeenCalled();
  });

  it('deleteUserHard rechaza eliminar el propio usuario', async () => {
    await expect(service.deleteUserHard({ userId: 'user-1' }, identity)).rejects.toThrow(
      'No puedes eliminar tu propio usuario'
    );
    expect(usuarioService.deleteUserHard).not.toHaveBeenCalled();
  });

  it('deleteUserHard exige userId', async () => {
    await expect(service.deleteUserHard({}, identity)).rejects.toThrow('userId es obligatorio');
  });
});
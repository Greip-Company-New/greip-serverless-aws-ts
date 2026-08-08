import Service from '../../src/entity-audit-lmb/service';

jest.mock('ly-nodejs-ts-postgresdb', () => {
  const mockExecuteOne = jest.fn();
  const mockExecute = jest.fn();
  return {
    PostgresDatabaseService: jest.fn().mockImplementation(() => ({ executeOne: mockExecuteOne, execute: mockExecute })),
    __mockExecuteOne: mockExecuteOne,
    __mockExecute: mockExecute
  };
});

const { __mockExecuteOne: mockExecuteOne, __mockExecute: mockExecute } = jest.requireMock('ly-nodejs-ts-postgresdb');

describe('entity-audit-lmb/service', () => {
  beforeEach(() => {
    mockExecuteOne.mockReset();
    mockExecute.mockReset();
  });

  it('registra un cambio insertando en entity_change_log', async () => {
    mockExecuteOne.mockResolvedValue({
      id: '1', entity: 'product', entity_key: '5', tenant_id: 1,
      change_type: 'UPDATE', status: 'A', user_id: 'user-1',
      channel: 'AppWeb', changes: { name: { before: 'Manzana', after: 'Mansana' } },
      created_at: '2026-08-08T00:15:45.119Z'
    });

    const row = await Service.registerChange({
      entity: 'product',
      entityKey: '5',
      tenantId: 1,
      changeType: 'UPDATE',
      status: 'A',
      userId: 'user-1',
      channel: 'AppWeb',
      changes: { name: { before: 'Manzana', after: 'Mansana' } }
    });

    expect(row.id).toBe('1');
    expect(mockExecuteOne).toHaveBeenCalledTimes(1);
    const params = mockExecuteOne.mock.calls[0][1];
    expect(params[0]).toBe('product');
    expect(params[1]).toBe('5');
    expect(params[2]).toBe(1);
    expect(params[3]).toBe('UPDATE');
    expect(params[4]).toBe('A');
    expect(params[5]).toBe('user-1');
    expect(params[6]).toBe('AppWeb');
    expect(JSON.parse(params[7])).toEqual({ name: { before: 'Manzana', after: 'Mansana' } });
  });

  it('usa SYSTEM como fallback de user y channel', async () => {
    mockExecuteOne.mockResolvedValue({
      id: '2', entity: 'role', entity_key: '9', tenant_id: 1,
      change_type: 'CREATE', status: 'A', user_id: 'SYSTEM',
      channel: 'SYSTEM', changes: {}, created_at: '2026-08-08T00:15:45.119Z'
    });

    await Service.registerChange({
      entity: 'role',
      entityKey: '9',
      tenantId: 1,
      changeType: 'CREATE'
    });

    const params = mockExecuteOne.mock.calls[0][1];
    expect(params[5]).toBe('SYSTEM');
    expect(params[6]).toBe('SYSTEM');
    expect(params[7]).toBe('{}');
  });

  it('lanza error si no se pudo insertar', async () => {
    mockExecuteOne.mockResolvedValue(null);

    await expect(Service.registerChange({
      entity: 'product',
      entityKey: '1',
      tenantId: 1,
      changeType: 'CREATE'
    })).rejects.toThrow('No se pudo registrar el cambio');
  });

  it('listChanges consulta por entity, entityKey y tenantId con paginacion', async () => {
    mockExecute.mockImplementation((sql: string) => {
      if (sql.includes('COUNT')) {
        return Promise.resolve({ rows: [{ total: 1 }] });
      }
      return Promise.resolve({ rows: [{
        id: '3', entity: 'product', entity_key: '5', tenant_id: 1,
        change_type: 'UPDATE', status: 'A', user_id: 'user-1',
        user_first_name: 'Juan', user_father_last_name: 'Perez', user_mother_last_name: 'Garcia',
        channel: 'AppWeb', changes: { name: { before: 'Mansana', after: 'Manzana' } },
        created_at: '2026-08-08T00:15:45.119Z'
      }] });
    });

    const result = await Service.listChanges({ entity: 'product', entityKey: '5', tenantId: 1, page: 1, pageSize: 10 });

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].entity_key).toBe('5');
    expect(result.data[0].user_first_name).toBe('Juan');
    expect(result.data[0].user_father_last_name).toBe('Perez');
    expect(result.data[0].user_mother_last_name).toBe('Garcia');

    // verifica que el COUNT use los 3 campos
    const countParams = mockExecute.mock.calls[0][1];
    expect(countParams).toEqual(['product', '5', 1]);

    // verifica el query de listado con paginacion
    const listParams = mockExecute.mock.calls[1][1];
    expect(listParams.slice(0, 3)).toEqual(['product', '5', 1]);
    expect(listParams[3]).toBe(10); // limit
    expect(listParams[4]).toBe(0);  // offset
  });
});

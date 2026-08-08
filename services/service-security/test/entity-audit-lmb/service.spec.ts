import Service from '../../src/entity-audit-lmb/service';

jest.mock('ly-nodejs-ts-postgresdb', () => {
  const mockExecuteOne = jest.fn();
  return {
    PostgresDatabaseService: jest.fn().mockImplementation(() => ({ executeOne: mockExecuteOne })),
    __mockExecuteOne: mockExecuteOne
  };
});

const { __mockExecuteOne: mockExecuteOne } = jest.requireMock('ly-nodejs-ts-postgresdb');

describe('entity-audit-lmb/service', () => {
  beforeEach(() => {
    mockExecuteOne.mockReset();
  });

  it('registra un cambio insertando en entity_change_log', async () => {
    mockExecuteOne.mockResolvedValue({
      id: '1', entity: 'product', entity_key: '5', tenant_id: 1,
      change_type: 'UPDATE', status: 'A', user_id: 'user-1',
      channel: 'AppWeb', changes: { name: { antes: 'Manzana', despues: 'Mansana' } },
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
      changes: { name: { antes: 'Manzana', despues: 'Mansana' } }
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
    expect(JSON.parse(params[7])).toEqual({ name: { antes: 'Manzana', despues: 'Mansana' } });
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
});

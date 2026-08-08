import Service from '../../src/entity-audit-lmb/service';

jest.mock('ly-nodejs-ts-postgresdb', () => {
  const mockExecute = jest.fn();
  return {
    PostgresDatabaseService: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
    __mockExecute: mockExecute
  };
});

const { __mockExecute: mockExecute } = jest.requireMock('ly-nodejs-ts-postgresdb');

describe('entity-audit-lmb/service', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it('listChanges consulta por entity, entityKey y tenantId con paginacion y filtros', async () => {
    mockExecute.mockImplementation((sql: string) => {
      if (sql.includes('COUNT')) {
        return Promise.resolve({ rows: [{ total: 1 }] });
      }
      return Promise.resolve({ rows: [{
        id: '3', entity: 'product', entity_key: '5', tenant_id: 1,
        change_type: 'UPDATE', action: 'PRODUCT_UPDATED', status: 'A', user_id: 'user-1',
        user_first_name: 'Juan', user_father_last_name: 'Perez', user_mother_last_name: 'Garcia',
        channel: 'AppWeb', source_ip: '181.65.19.105', user_agent: 'curl/8',
        changes: { name: { before: 'Mansana', after: 'Manzana' } },
        created_at: '2026-08-08T00:15:45.119Z'
      }] });
    });

    const result = await Service.listChanges({
      entity: 'product', entityKey: '5', tenantId: 1,
      action: 'PRODUCT_UPDATED', page: 1, pageSize: 10
    });

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].entity_key).toBe('5');
    expect(result.data[0].action).toBe('PRODUCT_UPDATED');
    expect(result.data[0].source_ip).toBe('181.65.19.105');
    expect(result.data[0].user_first_name).toBe('Juan');

    // COUNT: [entity, entityKey, tenantId, ...filtros]
    expect(mockExecute.mock.calls[0][1]).toEqual(['product', '5', 1, 'PRODUCT_UPDATED', null, null]);
    // Listado: [entity, entityKey, tenantId, ...filtros, limit, offset]
    const listParams = mockExecute.mock.calls[1][1];
    expect(listParams.slice(0, 6)).toEqual(['product', '5', 1, 'PRODUCT_UPDATED', null, null]);
    expect(listParams[6]).toBe(10);
    expect(listParams[7]).toBe(0);
  });

  it('listChanges aplica filtros de sourceIp y userAgent', async () => {
    mockExecute.mockImplementation((sql: string) => {
      if (sql.includes('COUNT')) {
        return Promise.resolve({ rows: [{ total: 0 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await Service.listChanges({
      entity: 'product', entityKey: '5', tenantId: 1,
      sourceIp: '181.65.19.105', userAgent: 'curl'
    });

    expect(mockExecute.mock.calls[0][1]).toEqual(['product', '5', 1, null, '181.65.19.105', 'curl']);
  });

  it('listByUser consulta los movimientos de un userId con filtros', async () => {
    mockExecute.mockImplementation((sql: string) => {
      if (sql.includes('COUNT')) {
        return Promise.resolve({ rows: [{ total: 2 }] });
      }
      return Promise.resolve({ rows: [
        {
          id: '30', entity: 'product', entity_key: '10', tenant_id: 1,
          change_type: 'CREATE', action: 'PRODUCT_CREATED', status: 'A', user_id: 'user-1',
          user_first_name: 'Juan', user_father_last_name: 'Perez', user_mother_last_name: null,
          channel: 'AppWeb', source_ip: null, user_agent: null,
          changes: {}, created_at: '2026-08-08T00:15:45.119Z'
        }
      ] });
    });

    const result = await Service.listByUser({ userId: 'user-1', tenantId: 1, action: 'PRODUCT_CREATED', entity: 'product' });

    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].user_id).toBe('user-1');
    expect(result.data[0].action).toBe('PRODUCT_CREATED');

    // COUNT: [userId, tenantId, action, entity]
    expect(mockExecute.mock.calls[0][1]).toEqual(['user-1', 1, 'PRODUCT_CREATED', 'product']);
    // Listado: [userId, tenantId, action, entity, limit, offset]
    const listParams = mockExecute.mock.calls[1][1];
    expect(listParams.slice(0, 4)).toEqual(['user-1', 1, 'PRODUCT_CREATED', 'product']);
    expect(listParams[4]).toBe(10);
    expect(listParams[5]).toBe(0);
  });
});

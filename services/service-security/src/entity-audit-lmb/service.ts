import { PostgresDatabaseService } from 'ly-nodejs-ts-postgresdb';
import { EntityChangeRecord, EntityChangeLogRow } from './models';

const db = new PostgresDatabaseService(process.env.PG_SECRET_DB || 'Greip/postgres/dev');

const INSERT_CHANGE_QUERY = `
INSERT INTO greip.entity_change_log
    (entity, entity_key, tenant_id, change_type, status, user_id, channel, changes)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
RETURNING id, entity, entity_key, tenant_id, change_type, status, user_id, channel, changes, created_at`;

const LIST_CHANGES_QUERY = `
SELECT id, entity, entity_key, tenant_id, change_type, status, user_id, channel, changes, created_at
  FROM greip.entity_change_log
 WHERE entity = $1
   AND entity_key = $2
   AND tenant_id = $3
 ORDER BY id DESC
 LIMIT $4 OFFSET $5`;

const COUNT_CHANGES_QUERY = `
SELECT COUNT(*)::int AS total
  FROM greip.entity_change_log
 WHERE entity = $1
   AND entity_key = $2
   AND tenant_id = $3`;

function mapRow(row: any): EntityChangeLogRow {
  return {
    id: String(row.id),
    entity: row.entity,
    entity_key: row.entity_key,
    tenant_id: row.tenant_id,
    change_type: row.change_type,
    status: row.status,
    user_id: row.user_id,
    channel: row.channel,
    changes: row.changes,
    created_at: row.created_at
  };
}

export default class Service {

  static async registerChange(payload: EntityChangeRecord): Promise<EntityChangeLogRow> {
    const changesJson = payload.changes && Object.keys(payload.changes).length > 0
      ? JSON.stringify(payload.changes)
      : '{}';
    const row = await db.executeOne<EntityChangeLogRow>(INSERT_CHANGE_QUERY, [
      payload.entity,
      payload.entityKey,
      payload.tenantId,
      payload.changeType,
      payload.status || 'A',
      payload.userId || 'SYSTEM',
      payload.channel || 'SYSTEM',
      changesJson
    ]);
    if (!row) {
      throw new Error('No se pudo registrar el cambio');
    }
    return mapRow(row);
  }

  static async listChanges(params: { entity: string; entityKey: string; tenantId: number; page?: number; pageSize?: number }): Promise<{ data: EntityChangeLogRow[]; total: number }> {
    const page = Number(params.page) || 1;
    const pageSize = Math.min(Number(params.pageSize) || 10, 100);
    const offset = (page - 1) * pageSize;

    const countResult = await db.execute<{ total: number }>(COUNT_CHANGES_QUERY, [params.entity, params.entityKey, params.tenantId]);
    const total = countResult.rows[0]?.total || 0;

    const result = await db.execute<EntityChangeLogRow>(LIST_CHANGES_QUERY, [params.entity, params.entityKey, params.tenantId, pageSize, offset]);
    return { data: result.rows.map(mapRow), total };
  }

}

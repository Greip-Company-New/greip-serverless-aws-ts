import { PostgresDatabaseService } from 'ly-nodejs-ts-postgresdb';
import { EntityChangeRecord, EntityChangeLogRow } from './models';

const db = new PostgresDatabaseService(process.env.PG_SECRET_DB || 'Greip/postgres/dev');

const INSERT_CHANGE_QUERY = `
INSERT INTO greip.entity_change_log
    (entity, entity_key, tenant_id, change_type, status, user_id, channel, changes)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
RETURNING id, entity, entity_key, tenant_id, change_type, status, user_id, channel, changes, created_at`;

export default class Service {

  static async registerChange(payload: EntityChangeRecord): Promise<EntityChangeLogRow> {    const changesJson = payload.changes && Object.keys(payload.changes).length > 0
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
    return row;
  }

}

import { PostgresDatabaseService } from 'ly-nodejs-ts-postgresdb';
import { AuditSyncMessage } from './models';

const db = new PostgresDatabaseService(process.env.PG_SECRET_DB || 'Greip/postgres/dev');

const INSERT_CHANGE_QUERY = `
INSERT INTO greip.entity_change_log
    (entity, entity_key, tenant_id, change_type, action, status, user_id, channel, source_ip, user_agent, changes)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
RETURNING id`;

const GET_TENANT_ID_QUERY = `
SELECT id FROM greip.tenant WHERE code = $1`;

export default class Service {

  static async sync(mensaje: AuditSyncMessage): Promise<void> {
    const tenantId = mensaje.tenantId || await Service.resolveTenantId(mensaje.tenant);
    const changesJson = mensaje.changes && Object.keys(mensaje.changes).length > 0
      ? JSON.stringify(mensaje.changes)
      : '{}';
    const row = await db.executeOne<{ id: string }>(INSERT_CHANGE_QUERY, [
      mensaje.entity,
      String(mensaje.entityKey),
      tenantId,
      mensaje.changeType || null,
      mensaje.action || null,
      mensaje.status || 'A',
      mensaje.userId || 'SYSTEM',
      mensaje.channel || 'SYSTEM',
      mensaje.sourceIp || null,
      mensaje.userAgent || null,
      changesJson
    ]);
    if (!row) {
      throw new Error('No se pudo insertar el evento de auditoria');
    }
  }

  private static async resolveTenantId(tenantCode?: string): Promise<number> {
    const code = tenantCode || process.env.TENANT_DEFAULT || 'GREIP';
    const row = await db.executeOne<{ id: number }>(GET_TENANT_ID_QUERY, [code]);
    if (!row) {
      throw new Error(`Tenant no encontrado: ${code}`);
    }
    return row.id;
  }

}

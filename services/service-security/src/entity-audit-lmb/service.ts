import { PostgresDatabaseService } from 'ly-nodejs-ts-postgresdb';
import { EntityChangeLogRow } from './models';

const db = new PostgresDatabaseService(process.env.PG_SECRET_DB || 'Greip/postgres/dev');

const LIST_CHANGES_QUERY = `
SELECT ecl.id, ecl.entity, ecl.entity_key, ecl.tenant_id, ecl.change_type, ecl.action,
       ecl.status, ecl.user_id, ecl.channel, ecl.source_ip, ecl.user_agent,
       ecl.changes, ecl.created_at,
       p.first_name AS user_first_name,
       p.father_last_name AS user_father_last_name,
       p.mother_last_name AS user_mother_last_name
  FROM greip.entity_change_log ecl
  LEFT JOIN greip.user_person up ON up.user_id = ecl.user_id::uuid
  LEFT JOIN greip.person p ON p.id = up.person_id
 WHERE ecl.entity = $1
   AND ecl.entity_key = $2
   AND ecl.tenant_id = $3
   AND ($4::text IS NULL OR ecl.action = $4)
   AND ($5::text IS NULL OR ecl.source_ip = $5)
   AND ($6::text IS NULL OR ecl.user_agent ILIKE '%' || $6 || '%')
 ORDER BY ecl.id DESC
 LIMIT $7 OFFSET $8`;

const COUNT_CHANGES_QUERY = `
SELECT COUNT(*)::int AS total
  FROM greip.entity_change_log
 WHERE entity = $1
   AND entity_key = $2
   AND tenant_id = $3
   AND ($4::text IS NULL OR action = $4)
   AND ($5::text IS NULL OR source_ip = $5)
   AND ($6::text IS NULL OR user_agent ILIKE '%' || $6 || '%')`;

export interface ListChangesParams {
  entity: string;
  entityKey: string;
  tenantId: number;
  action?: string;
  sourceIp?: string;
  userAgent?: string;
  page?: number;
  pageSize?: number;
}

function mapRow(row: any): EntityChangeLogRow {
  return {
    id: String(row.id),
    entity: row.entity,
    entity_key: row.entity_key,
    tenant_id: row.tenant_id,
    change_type: row.change_type,
    action: row.action || null,
    status: row.status,
    user_id: row.user_id,
    user_first_name: row.user_first_name || null,
    user_father_last_name: row.user_father_last_name || null,
    user_mother_last_name: row.user_mother_last_name || null,
    channel: row.channel,
    source_ip: row.source_ip || null,
    user_agent: row.user_agent || null,
    changes: row.changes,
    created_at: row.created_at
  };
}

export default class Service {

  static async listChanges(params: ListChangesParams): Promise<{ data: EntityChangeLogRow[]; total: number }> {
    const page = Number(params.page) || 1;
    const pageSize = Math.min(Number(params.pageSize) || 10, 100);
    const offset = (page - 1) * pageSize;
    const filtros = [params.action || null, params.sourceIp || null, params.userAgent || null];

    const countResult = await db.execute<{ total: number }>(COUNT_CHANGES_QUERY, [params.entity, params.entityKey, params.tenantId, ...filtros]);
    const total = countResult.rows[0]?.total || 0;

    const result = await db.execute<EntityChangeLogRow>(LIST_CHANGES_QUERY, [params.entity, params.entityKey, params.tenantId, ...filtros, pageSize, offset]);
    return { data: result.rows.map(mapRow), total };
  }

}

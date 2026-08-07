// Registro de eventos de auditoria en DynamoDB.
import { AuditoriaEvento } from './models';
import { AuditoriaRepository } from './repositories/dynamodb/auditoria';
import { AUDIT_RETENTION_DAYS } from './constants';

let repo: AuditoriaRepository | null = null;

function getRepo(): AuditoriaRepository {
  if (!repo) {
    repo = new AuditoriaRepository();
  }
  return repo;
}

export interface AuditoriaParams {
  action: string;
  entity: string;
  entityId?: string;
  actor?: string;
  sourceIp?: string;
  userAgent?: string;
  detail?: any;
}

export function createEvent(params: AuditoriaParams, tenant: string): Omit<AuditoriaEvento, 'pk' | 'sk'> {
  return {
    eventId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    tenant,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    actor: params.actor,
    sourceIp: params.sourceIp,
    userAgent: params.userAgent,
    detail: params.detail,
    date: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + AUDIT_RETENTION_DAYS * 24 * 3600
  };
}

export async function registerAudit(params: AuditoriaParams, tenant: string): Promise<void> {
  await getRepo().register(createEvent(params, tenant));
}

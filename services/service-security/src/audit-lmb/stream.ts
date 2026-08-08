// Procesador del DynamoDB Stream de USUARIOS: registra cambios en auditoria.
import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import { AuditoriaRepository } from '../common/repositories/dynamodb/auditoria';
import { AuditoriaEvento } from '../common/models';
import { AUDIT_EVENTS, AUDIT_RETENTION_DAYS } from '../common/constants';

const repo = new AuditoriaRepository();

function extractNew(record: DynamoDBRecord): any {
  return record.dynamodb?.NewImage ? unmarshalImage(record.dynamodb.NewImage) : null;
}

function extractOld(record: DynamoDBRecord): any {
  return record.dynamodb?.OldImage ? unmarshalImage(record.dynamodb.OldImage) : null;
}

function unmarshalImage(image: any): any {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries<any>(image)) {
    if (value?.S !== undefined) {
      result[key] = value.S;
    } else if (value?.N !== undefined) {
      result[key] = Number(value.N);
    } else if (value?.BOOL !== undefined) {
      result[key] = value.BOOL;
    } else if (value?.M !== undefined) {
      result[key] = unmarshalImage(value.M);
    } else if (value?.NULL !== undefined) {
      result[key] = null;
    }
  }
  return result;
}

function actionByEvent(eventName: string): string {
  switch (eventName) {
    case 'INSERT':
      return AUDIT_EVENTS.USER_STREAM_INSERT;
    case 'MODIFY':
      return AUDIT_EVENTS.USER_STREAM_MODIFY;
    case 'REMOVE':
      return AUDIT_EVENTS.USER_STREAM_REMOVE;
    default:
      return 'USER_STREAM_UNKNOWN';
  }
}

export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  const eventos: AuditoriaEvento[] = [];

  for (const record of event.Records) {
    const user = extractNew(record) || extractOld(record);
    if (!user || user.sk !== 'PROFILE') {
      continue;
    }

    const action = actionByEvent(record.eventName || '');
    const tenant = user.tenant || process.env.TENANT_DEFAULT || 'GREIP';
    const date = new Date().toISOString();
    const ahoraSeg = Math.floor(Date.now() / 1000);

    eventos.push({
      pk: `TENANT#${tenant}`,
      sk: `EVENT#${date}#${record.dynamodb?.SequenceNumber || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`,
      eventId: record.dynamodb?.SequenceNumber || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      tenant,
      action,
      entity: 'USER',
      entityId: user.userId,
      actor: user.email,
      detail: {
        documentType: user.documentType,
        documentNumber: user.documentNumber,
        status: user.status
      },
      createdBy: user.email || 'SYSTEM',
      date,
      expiresAt: ahoraSeg + AUDIT_RETENTION_DAYS * 24 * 3600
    });
  }

  if (eventos.length === 0) {
    return;
  }

  // DynamoDB BatchWrite permite hasta 25 items por llamada.
  const BATCH = 25;
  for (let i = 0; i < eventos.length; i += BATCH) {
    const batch = eventos.slice(i, i + BATCH);
    await repo.registerBatch(batch);
  }
}

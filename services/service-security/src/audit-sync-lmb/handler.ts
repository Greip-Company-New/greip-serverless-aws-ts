// Procesador de la cola SQS de auditoria (greip-audit-<env>).
// Recibe los mensajes encolados por Helpers.registerEntityChange y los
// persiste en PostgreSQL (greip.entity_change_log).
import Service from './service';
import { AuditSyncMessage } from './models';

export async function handler(event: any): Promise<void> {
  const records = event?.Records || [];
  for (const record of records) {
    const body = typeof record.body === 'string' ? JSON.parse(record.body) : record.body;
    try {
      await Service.sync(body as AuditSyncMessage);
    } catch (error: any) {
      console.error('[audit-sync] Error procesando mensaje', error);
      throw error; // SQS reintenta el mensaje; despues de N intentos va al DLQ.
    }
  }
}

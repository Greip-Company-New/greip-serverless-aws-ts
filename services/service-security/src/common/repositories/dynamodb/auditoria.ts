// Acceso a la tabla de auditoria (DynamoDB TBL_GREIP_SEGURIDAD_AUDITORIA_<ENV>).
import { DynamoDBService } from 'ly-nodejs-ts-common';
import { scanAll } from './scan';
import { batchWriteItems } from './batch';
import { AuditoriaEvento } from '../../models';

function tablaAuditoria(): string {
  return process.env.TABLA_AUDITORIA || 'TBL_GREIP_SEGURIDAD_AUDITORIA_DEV';
}

export class AuditoriaRepository {
  private db: DynamoDBService;

  constructor() {
    this.db = new DynamoDBService();
  }

  auditPk(tenant: string): string {
    return `TENANT#${tenant}`;
  }

  auditSk(date: string, eventId: string): string {
    return `EVENT#${date}#${eventId}`;
  }

  async register(evento: Omit<AuditoriaEvento, 'pk' | 'sk'>): Promise<void> {
    const sk = this.auditSk(evento.date, evento.eventId);
    await this.db.putItem(tablaAuditoria(), { ...evento, pk: this.auditPk(evento.tenant), sk });
  }

  async registerBatch(eventos: AuditoriaEvento[]): Promise<void> {
    const items = eventos.map((evento) => ({
      ...evento,
      pk: this.auditPk(evento.tenant),
      sk: this.auditSk(evento.date, evento.eventId)
    }));
    await batchWriteItems(tablaAuditoria(), items);
  }

  async list(tenant: string, params: { dateFrom?: string; dateTo?: string; action?: string; entity?: string; actor?: string }): Promise<AuditoriaEvento[]> {
    const todos = (await scanAll({
      TableName: tablaAuditoria(),
      FilterExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': this.auditPk(tenant) }
    })) as AuditoriaEvento[];

    let items = todos;
    if (params.dateFrom) {
      items = items.filter((e) => e.date >= (params.dateFrom as string));
    }
    if (params.dateTo) {
      items = items.filter((e) => e.date <= (params.dateTo as string));
    }
    if (params.action) {
      items = items.filter((e) => e.action === params.action);
    }
    if (params.entity) {
      items = items.filter((e) => e.entity === params.entity);
    }
    if (params.actor) {
      items = items.filter((e) => e.actor && e.actor.includes(params.actor as string));
    }
    items.sort((a, b) => (a.date > b.date ? -1 : 1));
    return items;
  }

  async get(tenant: string, eventId: string, date: string): Promise<AuditoriaEvento | null> {
    return await this.db.getItem(tablaAuditoria(), {
      pk: this.auditPk(tenant),
      sk: this.auditSk(date, eventId)
    });
  }
}

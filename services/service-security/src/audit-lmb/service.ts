// Servicio de consulta de auditoria.
import { AuditoriaRepository } from '../common/repositories/dynamodb/auditoria';
import { AuditoriaEvento } from '../common/models';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from 'ly-nodejs-ts-common';

const SK_PREFIX = 'EVENT#';

export default class AuditService {
  private repo: AuditoriaRepository;

  constructor() {
    this.repo = new AuditoriaRepository();
  }

  async listAudit(payload: any): Promise<{ data: AuditoriaEvento[]; total: number }> {
    const tenant = process.env.TENANT_DEFAULT || 'GREIP';
    const items = await this.repo.list(tenant, {
      dateFrom: payload.dateFrom,
      dateTo: payload.dateTo,
      action: payload.action,
      entity: payload.entity,
      actor: payload.actor
    });

    const page = Number(payload.page) || DEFAULT_PAGE;
    const pageSize = Number(payload.pageSize) || DEFAULT_PAGE_SIZE;
    const inicio = (page - 1) * pageSize;
    return { data: items.slice(inicio, inicio + pageSize), total: items.length };
  }

  async getAudit(payload: any): Promise<AuditoriaEvento | null> {
    const tenant = process.env.TENANT_DEFAULT || 'GREIP';
    const sk = payload.sk || payload.skEvento;
    if (!sk) {
      throw new Error('sk es obligatorio');
    }
    if (!sk.startsWith(SK_PREFIX)) {
      throw new Error('sk invalido');
    }
    const [, date, eventId] = sk.split('#');
    if (!date || !eventId) {
      throw new Error('sk invalido');
    }
    return await this.repo.get(tenant, eventId, date);
  }
}

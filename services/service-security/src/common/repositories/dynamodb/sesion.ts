// Acceso a la tabla de sesiones (DynamoDB TBL_GREIP_SEGURIDAD_SESIONES_<ENV>).
import { DynamoDBService } from 'ly-nodejs-ts-common';
import { SesionDynamo } from '../../models';
import { SESSION_TTL_SECONDS } from '../../constants';

function tablaSesiones(): string {
  return process.env.TABLA_SESIONES || 'TBL_GREIP_SEGURIDAD_SESIONES_DEV';
}

export class SesionRepository {
  private db: DynamoDBService;

  constructor() {
    this.db = new DynamoDBService();
  }

  sessionPk(tenant: string, userId: string): string {
    return `TENANT#${tenant}#USER#${userId}`;
  }

  sessionSk(refreshTokenHash: string): string {
    return `SESSION#${refreshTokenHash}`;
  }

  async create(tenant: string, userId: string, refreshTokenHash: string, userAgent?: string, ip?: string): Promise<void> {
    const ahora = new Date().toISOString();
    const sesion: SesionDynamo = {
      pk: this.sessionPk(tenant, userId),
      sk: this.sessionSk(refreshTokenHash),
      refreshTokenHash,
      userAgent,
      ip,
      createdAt: ahora,
      updatedAt: ahora,
      expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
    };
    await this.db.putItem(tablaSesiones(), sesion);
  }

  async get(tenant: string, userId: string, refreshTokenHash: string): Promise<SesionDynamo | null> {
    return await this.db.getItem(tablaSesiones(), {
      pk: this.sessionPk(tenant, userId),
      sk: this.sessionSk(refreshTokenHash)
    });
  }

  async delete(tenant: string, userId: string, refreshTokenHash: string): Promise<void> {
    await this.db.deleteItem(tablaSesiones(), {
      pk: this.sessionPk(tenant, userId),
      sk: this.sessionSk(refreshTokenHash)
    });
  }

  async deleteAll(tenant: string, userId: string): Promise<void> {
    const items = await this.db.query({
      tableName: tablaSesiones(),
      keyConditionExpression: 'pk = :pk',
      expressionAttributeValues: { ':pk': this.sessionPk(tenant, userId) }
    });
    for (const item of items) {
      await this.db.deleteItem(tablaSesiones(), { pk: item.pk, sk: item.sk });
    }
  }
}

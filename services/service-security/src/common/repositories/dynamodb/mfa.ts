// Acceso a la tabla MFA (DynamoDB TBL_GREIP_SEGURIDAD_MFA_<ENV>).
import { DynamoDBService } from 'ly-nodejs-ts-common';
import { FactorMfaDynamo, DesafioDynamo } from '../../models';
import { OTP_TTL_MIN } from '../../constants';

function tablaMfa(): string {
  return process.env.TABLA_MFA || 'TBL_GREIP_SEGURIDAD_MFA_DEV';
}

export class MfaRepository {
  private db: DynamoDBService;

  constructor() {
    this.db = new DynamoDBService();
  }

  mfaPk(tenant: string, userId: string): string {
    return `TENANT#${tenant}#USER#${userId}`;
  }

  challengeSk(challengeId: string): string {
    return `CHALLENGE#${challengeId}`;
  }

  challengeIdFromSk(sk: string): string {
    return sk.replace(/^CHALLENGE#/, '');
  }

  async getFactor(tenant: string, userId: string, channel: string): Promise<FactorMfaDynamo | null> {
    return await this.db.getItem(tablaMfa(), { pk: this.mfaPk(tenant, userId), sk: channel });
  }

  async saveFactor(factor: FactorMfaDynamo, createdBy?: string): Promise<void> {
    const ahora = new Date().toISOString();
    const enriched: FactorMfaDynamo = {
      ...factor,
      tenant: factor.tenant,
      userId: factor.userId,
      createdBy: factor.createdBy || createdBy || 'SYSTEM',
      createdAt: factor.createdAt || ahora,
      updatedBy: createdBy || factor.updatedBy || 'SYSTEM',
      updatedAt: ahora
    };
    await this.db.putItem(tablaMfa(), enriched);
  }

  async createChallenge(tenant: string, userId: string, challengeId: string, type: string, channel: string, codeHash: string, createdBy?: string): Promise<void> {
    const ahora = new Date();
    const desafio: DesafioDynamo = {
      pk: this.mfaPk(tenant, userId),
      sk: `CHALLENGE#${challengeId}`,
      tenant,
      userId,
      type,
      channel,
      codeHash,
      attempts: 0,
      expiresAt: new Date(ahora.getTime() + OTP_TTL_MIN * 60 * 1000).toISOString(),
      createdBy: createdBy || 'SYSTEM',
      createdAt: ahora.toISOString(),
      ttl: Math.floor(Date.now() / 1000) + OTP_TTL_MIN * 60
    };
    await this.db.putItem(tablaMfa(), desafio);
  }

  async getChallenge(tenant: string, userId: string, challengeId: string): Promise<DesafioDynamo | null> {
    return await this.db.getItem(tablaMfa(), { pk: this.mfaPk(tenant, userId), sk: this.challengeSk(challengeId) });
  }

  /**
   * Desafio de recuperacion de contrasena activo (no expirado) del usuario.
   */
  async getActiveRecoveryChallenge(tenant: string, userId: string): Promise<DesafioDynamo | null> {
    const items = (await this.db.query({
      tableName: tablaMfa(),
      keyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      expressionAttributeValues: { ':pk': this.mfaPk(tenant, userId), ':prefix': 'CHALLENGE#' },
      scanIndexForward: false,
      limit: 25
    })) as DesafioDynamo[];
    const ahora = Date.now();
    const activo = items
      .filter((i) => i.type === 'RECOVERY' && new Date(i.expiresAt).getTime() > ahora)
      .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    return activo[0] || null;
  }

  async deleteChallenge(tenant: string, userId: string, challengeId: string): Promise<void> {
    await this.db.deleteItem(tablaMfa(), { pk: this.mfaPk(tenant, userId), sk: this.challengeSk(challengeId) });
  }

  async deleteFactor(tenant: string, userId: string, channel: string): Promise<void> {
    await this.db.deleteItem(tablaMfa(), { pk: this.mfaPk(tenant, userId), sk: channel });
  }

  async incrementAttempts(desafio: DesafioDynamo): Promise<void> {
    await this.db.updateItem({
      tableName: tablaMfa(),
      key: { pk: desafio.pk, sk: desafio.sk },
      updateExpression: 'SET attempts = :attempts',
      expressionAttributeValues: { ':attempts': desafio.attempts + 1 }
    });
  }

  /**
   * Elimina todos los registros MFA del usuario (factores y desafios activos).
   */
  async deleteAll(tenant: string, userId: string): Promise<void> {
    const items = await this.db.query({
      tableName: tablaMfa(),
      keyConditionExpression: 'pk = :pk',
      expressionAttributeValues: { ':pk': this.mfaPk(tenant, userId) }
    });
    for (const item of items) {
      await this.db.deleteItem(tablaMfa(), { pk: item.pk, sk: item.sk });
    }
  }
}

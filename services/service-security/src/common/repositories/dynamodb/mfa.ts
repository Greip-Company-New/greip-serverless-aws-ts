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

  async getFactor(tenant: string, userId: string, channel: string): Promise<FactorMfaDynamo | null> {
    return await this.db.getItem(tablaMfa(), { pk: this.mfaPk(tenant, userId), sk: channel });
  }

  async saveFactor(factor: FactorMfaDynamo): Promise<void> {
    await this.db.putItem(tablaMfa(), factor);
  }

  async createChallenge(tenant: string, userId: string, challengeId: string, type: string, channel: string, codeHash: string): Promise<void> {
    const ahora = new Date();
    const desafio: DesafioDynamo = {
      pk: this.mfaPk(tenant, userId),
      sk: `CHALLENGE#${challengeId}`,
      type,
      channel,
      codeHash,
      attempts: 0,
      expiresAt: new Date(ahora.getTime() + OTP_TTL_MIN * 60 * 1000).toISOString(),
      createdAt: ahora.toISOString(),
      ttl: Math.floor(Date.now() / 1000) + OTP_TTL_MIN * 60
    };
    await this.db.putItem(tablaMfa(), desafio);
  }

  async getChallenge(tenant: string, userId: string, challengeId: string): Promise<DesafioDynamo | null> {
    return await this.db.getItem(tablaMfa(), { pk: this.mfaPk(tenant, userId), sk: `CHALLENGE#${challengeId}` });
  }

  async deleteChallenge(tenant: string, userId: string, challengeId: string): Promise<void> {
    await this.db.deleteItem(tablaMfa(), { pk: this.mfaPk(tenant, userId), sk: `CHALLENGE#${challengeId}` });
  }

  async incrementAttempts(desafio: DesafioDynamo): Promise<void> {
    await this.db.updateItem({
      tableName: tablaMfa(),
      key: { pk: desafio.pk, sk: desafio.sk },
      updateExpression: 'SET attempts = :attempts',
      expressionAttributeValues: { ':attempts': desafio.attempts + 1 }
    });
  }
}

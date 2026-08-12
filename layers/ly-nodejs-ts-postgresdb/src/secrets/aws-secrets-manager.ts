import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

import { PostgresConfig } from "../types/database.types";

export class AwsSecretsManager {
  private client: SecretsManagerClient;

  constructor(region: string = process.env.AWS_REGION || 'us-east-2') {
    this.client = new SecretsManagerClient({ region });
  }

  async getPostgresCredentials(secretName: string): Promise<PostgresConfig> {
    try {
      if (!secretName) {
        throw new Error(`El secretName no puede ser nulo o vacio!`);
      }

      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error(`El secreto ${secretName} no contiene datos`);
      }

      const secret = JSON.parse(response.SecretString);

      if (!secret.host || !secret.port || !secret.db || !secret.user || !secret.pass) {
        throw new Error(`El secreto ${secretName} no tiene la estructura esperada: {host, port, db, user, pass}`);
      }

      const config: PostgresConfig = {
        host: secret.host,
        port: Number(secret.port),
        db: secret.db,
        user: secret.user,
        pass: secret.pass,
        ssl: secret.ssl,
        poolMax: secret.poolMax,
        poolMin: secret.poolMin,
        idleTimeoutMillis: secret.idleTimeoutMillis,
        connectionTimeoutMillis: secret.connectionTimeoutMillis,
        statementTimeout: secret.statementTimeout
      };

      return config;

    } catch (error) {
      console.error(`Error al obtener secreto ${secretName} para la base de datos:`, error);
      throw error;
    }
  }
}

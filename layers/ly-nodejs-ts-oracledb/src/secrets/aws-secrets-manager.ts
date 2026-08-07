import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

import { OracleConfigDirect, OracleConnectionConfig } from "../types/database.types";

export class AwsSecretsManager {
  private client: SecretsManagerClient;

  constructor(region: string = process.env.AWS_REGION || 'us-east-1') {
    this.client = new SecretsManagerClient({ region });
  }

  async getOracleCredentialsDirect(secretName: string): Promise<OracleConfigDirect> {
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

      if (!secret.userdb || !secret.passdb || !secret.hostdb) {
        throw new Error(`El secreto ${secretName} no tiene la estructura esperada`);
      }

      const config: OracleConfigDirect = {
        userdb: Buffer.from(secret.userdb, 'base64').toString(),
        passdb: Buffer.from(secret.passdb, 'base64').toString(),
        hostdb: secret.hostdb,
        externalAuth: secret.externalAuth,
        stmtCacheSize: secret.stmtCacheSize,
        edition: secret.edition,
        events: secret.events
      };

      // console.log(`✅ Credenciales obtenidas para usuario: ${config.user}`);
      return config;

    } catch (error) {
      console.error(`❌ Error al obtener secreto ${secretName} para la base de datos:`, error);
      throw error;
    }
  }

  async getOracleCredentials(secretName: string): Promise<OracleConnectionConfig> {
    try {
      if (!secretName) {
        throw new Error(`El secretName no puede ser nulo o vacio!`);
      }

      // console.log(`🔐 Obteniendo credenciales desde: ${secretName}`);

      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error(`El secreto ${secretName} no contiene datos`);
      }

      const secret = JSON.parse(response.SecretString);

      if (!secret.userdb || !secret.passdb || !secret.hostdb) {
        throw new Error(`El secreto ${secretName} no tiene la estructura esperada`);
      }

      const config: OracleConnectionConfig = {
        userdb: secret.userdb,
        passdb: secret.passdb,
        hostdb: secret.hostdb,
        poolMin: secret.poolMin || 1,
        poolMax: secret.poolMax || 1,
        poolIncrement: secret.poolIncrement || 1,
        poolTimeout: secret.poolTimeout || 60,
        queueTimeout: secret.queueTimeout || 60000,
        poolPingInterval: secret.poolPingInterval || 60,
        stmtCacheSize: secret.stmtCacheSize || 30
      };

      // console.log(`✅ Credenciales obtenidas para usuario: ${config.user}`);
      return config;

    } catch (error) {
      console.error(`❌ Error al obtener secreto ${secretName} para la base de datos:`, error);
      throw error;
    }
  }
}
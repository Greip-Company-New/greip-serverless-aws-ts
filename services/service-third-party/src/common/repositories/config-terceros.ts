// Acceso a la tabla de configuracion de terceros (DynamoDB TBL_GREIP_TERCEROS_CONFIG_<ENV>).
import { DynamoDBService } from 'ly-nodejs-ts-common';
import { ConfigProveedorDynamo, configVacia } from '../models';
import { tablaTercerosConfig } from '../config';

export class ConfigTercerosRepository {
  private db: DynamoDBService;

  constructor() {
    this.db = new DynamoDBService();
  }

  configKey(tenant: string): { pk: string; sk: string } {
    return { pk: `TENANT#${tenant.toUpperCase()}`, sk: 'CONFIG' };
  }

  async getConfig(tenant: string): Promise<ConfigProveedorDynamo | null> {
    const item = await this.db.getItem(tablaTercerosConfig(), this.configKey(tenant));
    return item as ConfigProveedorDynamo | null;
  }

  async getConfigConDefecto(tenant: string): Promise<ConfigProveedorDynamo> {
    const item = await this.getConfig(tenant);
    if (!item) {
      return configVacia(tenant);
    }
    return item;
  }

  async saveConfig(config: ConfigProveedorDynamo): Promise<void> {
    await this.db.putItem(tablaTercerosConfig(), config);
  }
}


import { Logger, CacheManager } from '../utils.js';
import type { CacheConfig } from '../types.js';
import { SecretsManagerService } from './secretsmanager.js';
import { ParameterStoreService } from './parameterstore.js';

export interface ConfigOptions {
  secrets?: {
    cache?: CacheConfig;
  };
  parameters?: {
    cache?: CacheConfig;
  };
  environment?: string;
}

export interface ConfigSource {
  type: 'secret' | 'parameter' | 'environment';
  path: string;
  key?: string;
  required?: boolean;
  defaultValue?: any;
}

export class ConfigService {
  private secretsManager: SecretsManagerService;
  private parameterStore: ParameterStoreService;
  private logger: Logger;
  private cache: CacheManager;
  private environment: string;
  private configCache: Map<string, any>;

  constructor(options: ConfigOptions = {}) {
    this.secretsManager = new SecretsManagerService(options.secrets?.cache);
    this.parameterStore = new ParameterStoreService(options.parameters?.cache);
    this.logger = new Logger('ConfigService');
    this.cache = new CacheManager(1000);
    this.environment = options.environment || process.env.ENVIRONMENT || 'development';
    this.configCache = new Map();
  }

  /**
   * Cargar configuración desde múltiples fuentes
   */
  async loadConfig(sources: ConfigSource[]): Promise<Record<string, any>> {
    const config: Record<string, any> = {};
    const errors: string[] = [];

    for (const source of sources) {
      try {
        const value = await this.getValueFromSource(source);
        
        if (source.key) {
          config[source.key] = value;
        } else if (typeof value === 'object') {
          Object.assign(config, value);
        }
      } catch (error: any) {
        if (source.required && source.defaultValue === undefined) {
          errors.push(`Failed to load required config: ${source.path} - ${error.message}`);
        } else if (source.defaultValue !== undefined) {
          config[source.key || source.path] = source.defaultValue;
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Config loading failed:\n${errors.join('\n')}`);
    }

    return config;
  }

  /**
   * Cargar configuración por ambiente predefinida
   */
  async loadEnvironmentConfig(environment?: string): Promise<Record<string, any>> {
    const env = environment || this.environment;
    const cacheKey = `environment:${env}`;

    // Verificar cache
    const cached = this.configCache.get(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached environment config', { environment: env });
      return cached;
    }

    const sources: ConfigSource[] = [
      // Secretos comunes
      {
        type: 'secret',
        path: `/app/${env}/database`,
        key: 'database',
        required: false
      },
      {
        type: 'secret',
        path: `/app/${env}/api-keys`,
        key: 'apiKeys',
        required: false
      },
      {
        type: 'secret',
        path: `/app/${env}/jwt`,
        key: 'jwt',
        required: false
      },
      
      // Parámetros comunes
      {
        type: 'parameter',
        path: `/app/${env}/region`,
        key: 'region',
        required: false,
        defaultValue: process.env.AWS_REGION || 'us-east-1'
      },
      {
        type: 'parameter',
        path: `/app/${env}/stage`,
        key: 'stage',
        required: false,
        defaultValue: env
      },
      
      // Feature flags
      {
        type: 'parameter',
        path: `/app/${env}/features`,
        key: 'features',
        required: false,
        defaultValue: {}
      },
      
      // Configuración de servicios
      {
        type: 'parameter',
        path: `/app/${env}/services`,
        key: 'services',
        required: false,
        defaultValue: {}
      }
    ];

    // Agregar parámetros por path
    sources.push({
      type: 'parameter',
      path: `/app/${env}/config/`,
      required: false
    });

    const config = await this.loadConfig(sources);
    
    // Guardar en cache
    this.configCache.set(cacheKey, config);
    
    this.logger.info('Loaded environment config', { 
      environment: env, 
      keys: Object.keys(config).length 
    });
    
    return config;
  }

  /**
   * Obtener variable con fallback a múltiples fuentes
   */
  async get(key: string, defaultValue?: any): Promise<any> {
    const cacheKey = `value:${key}`;
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // 1. Variables de entorno
    if (process.env[key]) {
      const value = this.parseValue(process.env[key]!);
      this.cache.set(cacheKey, value);
      return value;
    }

    // 2. Parameter Store
    try {
      const paramPath = `/app/${this.environment}/${key.toLowerCase()}`;
      const value = await this.parameterStore.getParameterValue(paramPath, true);
      this.cache.set(cacheKey, value);
      return value;
    } catch (error) {
      this.logger.debug(`Parameter not found for key: ${key}`, error);
    }

    // 3. Secrets Manager
    try {
      const secretPath = `/app/${this.environment}/${key.toLowerCase()}`;
      const value = await this.secretsManager.getSecretValue(secretPath);
      this.cache.set(cacheKey, value);
      return value;
    } catch (error) {
      this.logger.debug(`Secret not found for key: ${key}`, error);
    }

    // 4. Valor por defecto
    if (defaultValue !== undefined) {
      this.cache.set(cacheKey, defaultValue);
      return defaultValue;
    }

    throw new Error(`Config value not found for key: ${key}`);
  }

  /**
   * Obtener múltiples valores
   */
  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const key of keys) {
      try {
        results[key] = await this.get(key);
      } catch (error) {
        this.logger.warn(`Failed to get config for key: ${key}`, error);
        results[key] = undefined;
      }
    }
    
    return results;
  }

  /**
   * Invalidar cache para una clave específica
   */
  invalidateCache(key: string): void {
    this.cache.delete(`value:${key}`);
    this.logger.debug('Invalidated cache for key', { key });
  }

  /**
   * Invalidar todo el cache
   */
  clearCache(): void {
    this.cache.clear();
    this.configCache.clear();
    this.logger.debug('Cleared all config cache');
  }

  /**
   * Establecer ambiente
   */
  setEnvironment(environment: string): void {
    this.environment = environment;
    this.clearCache(); // Limpiar cache al cambiar ambiente
    this.logger.info('Environment changed', { environment });
  }

  private async getValueFromSource(source: ConfigSource): Promise<any> {
    switch (source.type) {
      case 'secret':
        const secret = await this.secretsManager.getSecret({ secretId: source.path });
        return secret.value;
        
      case 'parameter':
        if (source.path.endsWith('/')) {
          // Es un path, obtener todos los parámetros
          const params = await this.parameterStore.getAllParametersByPath(source.path, true, true);
          
          // Extraer nombres de parámetros sin el path
          const result: Record<string, any> = {};
          for (const [fullName, value] of Object.entries(params)) {
            const shortName = fullName.replace(source.path, '').replace(/^\//, '');
            if (shortName) {
              result[shortName] = value;
            }
          }
          return result;
        } else {
          // Es un parámetro individual
          return await this.parameterStore.getParameterValue(source.path, true);
        }
        
      case 'environment':
        const value = process.env[source.path];
        if (value === undefined && source.required) {
          throw new Error(`Environment variable not found: ${source.path}`);
        }
        return this.parseValue(value);
        
      default:
        throw new Error(`Unknown config source type: ${source.type}`);
    }
  }

  private parseValue(value: string | undefined): any {
    if (value === undefined) {
      return undefined;
    }
    
    // Intentar parsear JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    // Intentar parsear números
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }
    
    // Intentar parsear booleanos
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      return value.toLowerCase() === 'true';
    }
    
    return value;
  }
}
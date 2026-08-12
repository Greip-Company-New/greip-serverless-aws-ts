import {
  SSMClient,
  GetParameterCommand,
  GetParametersCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
  DeleteParameterCommand,
  DescribeParametersCommand,
  AddTagsToResourceCommand,
  RemoveTagsFromResourceCommand,
  DeleteParametersCommand,
  LabelParameterVersionCommand,
  ParametersFilter,
  ParametersFilterKey
} from '@aws-sdk/client-ssm';
import { Logger, retry, CacheManager } from '../utils.js';
import type { ParameterStoreGetParams, ParameterStorePutParams, ParameterStoreResult, CacheConfig } from '../types.js';

export class ParameterStoreService {
  private client: SSMClient;
  private logger: Logger;
  private cache: CacheManager;
  private cacheConfig: CacheConfig;

  constructor(cacheConfig: CacheConfig = {}) {
    this.client = new SSMClient({
      maxAttempts: 3,
      retryMode: 'standard'
    });
    
    this.logger = new Logger('ParameterStoreService');
    this.cacheConfig = {
      ttl: 5 * 60 * 1000, // 5 minutos por defecto
      enabled: true,
      maxSize: 1000,
      ...cacheConfig
    };
    
    this.cache = new CacheManager(this.cacheConfig.maxSize);
  }

  async getParameter(params: ParameterStoreGetParams): Promise<ParameterStoreResult> {
    const cacheKey = `parameter:${params.name}:${params.withDecryption || false}`;
    
    // Verificar cache
    if (this.cacheConfig.enabled) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Retrieving parameter from cache', { name: params.name });
        return cached;
      }
    }

    try {
      this.logger.debug('Getting parameter', params);
      
      const command = new GetParameterCommand({
        Name: params.name,
        WithDecryption: params.withDecryption
      });

      const response = await retry(() => this.client.send(command));
      
      if (!response.Parameter?.Value) {
        throw new Error(`Parameter not found or has no value: ${params.name}`);
      }

      let value = response.Parameter.Value;
      
      // Intentar parsear JSON si parece serlo
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          value = JSON.parse(value);
        } catch {
          // Mantener como string si no es JSON válido
        }
      }

      const result: ParameterStoreResult = {
        name: response.Parameter.Name!,
        value,
        type: response.Parameter.Type,
        version: response.Parameter.Version,
        lastModifiedDate: response.Parameter.LastModifiedDate
      };

      // Guardar en cache
      if (this.cacheConfig.enabled && this.cacheConfig.ttl) {
        this.cache.set(cacheKey, result, this.cacheConfig.ttl);
      }

      return result;
      
    } catch (error: any) {
      if (error.name === 'ParameterNotFound') {
        this.logger.error('Parameter not found', { name: params.name });
        throw new Error(`Parameter not found: ${params.name}`);
      }
      this.logger.error('Error getting parameter', error);
      throw error;
    }
  }

  async getParameterValue(name: string, withDecryption: boolean = true): Promise<any> {
    const result = await this.getParameter({ name, withDecryption });
    return result.value;
  }

  async getCachedParameter(name: string, ttl: number = 300000): Promise<any> {
    return this.getParameter({ name, withDecryption: true });
  }

  async getParameters(names: string[], withDecryption: boolean = true): Promise<Record<string, any>> {
    try {
      this.logger.debug('Getting multiple parameters', { 
        names, 
        withDecryption,
        count: names.length 
      });
      
      if (names.length === 0) return {};
      
      const command = new GetParametersCommand({
        Names: names,
        WithDecryption: withDecryption
      });

      const response = await retry(() => this.client.send(command));
      const result: Record<string, any> = {};

      if (response.Parameters) {
        for (const param of response.Parameters) {
          if (param.Name && param.Value !== undefined) {
            let value = param.Value;
            
            // Intentar parsear JSON
            if (value.startsWith('{') || value.startsWith('[')) {
              try {
                value = JSON.parse(value);
              } catch {
                // Mantener como string
              }
            }
            
            result[param.Name] = value;
            
            // Actualizar cache para cada parámetro
            if (this.cacheConfig.enabled && this.cacheConfig.ttl) {
              const cacheKey = `parameter:${param.Name}:${withDecryption}`;
              const cacheResult: ParameterStoreResult = {
                name: param.Name,
                value,
                type: param.Type,
                version: param.Version,
                lastModifiedDate: param.LastModifiedDate
              };
              this.cache.set(cacheKey, cacheResult, this.cacheConfig.ttl);
            }
          }
        }
      }

      // Manejar parámetros no encontrados
      if (response.InvalidParameters && response.InvalidParameters.length > 0) {
        this.logger.warn('Invalid parameters found', response.InvalidParameters);
      }

      return result;
      
    } catch (error) {
      this.logger.error('Error getting multiple parameters', error);
      throw error;
    }
  }

  async getParametersByPath(
    path: string, 
    recursive: boolean = true,
    withDecryption: boolean = true,
    nextToken?: string
  ): Promise<{
    parameters: Record<string, any>;
    nextToken?: string;
  }> {
    try {
      this.logger.debug('Getting parameters by path', { 
        path, 
        recursive,
        withDecryption 
      });
      
      const command = new GetParametersByPathCommand({
        Path: path,
        Recursive: recursive,
        WithDecryption: withDecryption,
        NextToken: nextToken
      });

      const response = await retry(() => this.client.send(command));
      const parameters: Record<string, any> = {};

      if (response.Parameters) {
        for (const param of response.Parameters) {
          if (param.Name && param.Value !== undefined) {
            let value = param.Value;
            
            // Intentar parsear JSON
            if (value.startsWith('{') || value.startsWith('[')) {
              try {
                value = JSON.parse(value);
              } catch {
                // Mantener como string
              }
            }
            
            parameters[param.Name] = value;
          }
        }
      }

      return {
        parameters,
        nextToken: response.NextToken
      };
      
    } catch (error) {
      this.logger.error('Error getting parameters by path', error);
      throw error;
    }
  }

  async getAllParametersByPath(
    path: string, 
    recursive: boolean = true,
    withDecryption: boolean = true
  ): Promise<Record<string, any>> {
    let allParameters: Record<string, any> = {};
    let nextToken: string | undefined;

    do {
      const result = await this.getParametersByPath(
        path, 
        recursive, 
        withDecryption, 
        nextToken
      );
      
      Object.assign(allParameters, result.parameters);
      nextToken = result.nextToken;
    } while (nextToken);

    return allParameters;
  }

  async putParameter(params: ParameterStorePutParams): Promise<void> {
    try {
      this.logger.debug('Putting parameter', { 
        name: params.name, 
        type: params.type 
      });
      
      const stringValue = typeof params.value === 'string' 
        ? params.value 
        : JSON.stringify(params.value);
      
      const command = new PutParameterCommand({
        Name: params.name,
        Value: stringValue,
        Type: params.type || 'String',
        Description: params.description,
        Overwrite: true,
        Tags: params.tags,
        Tier: params.tier,
        Policies: params.policies
      });

      await retry(() => this.client.send(command));
      
      // Invalidar cache
      this.invalidateCache(params.name);
      
    } catch (error) {
      this.logger.error('Error putting parameter', error);
      throw error;
    }
  }

  async deleteParameter(name: string): Promise<void> {
    try {
      this.logger.debug('Deleting parameter', { name });
      
      const command = new DeleteParameterCommand({ Name: name });
      await retry(() => this.client.send(command));
      
      // Limpiar cache
      this.invalidateCache(name);
      
    } catch (error) {
      this.logger.error('Error deleting parameter', error);
      throw error;
    }
  }

  async deleteParameters(names: string[]): Promise<{ deleted: string[]; invalid: string[] }> {
    try {
      this.logger.debug('Deleting multiple parameters', { names });
      
      const command = new DeleteParametersCommand({ Names: names });
      const response = await retry(() => this.client.send(command));
      
      // Limpiar cache para los parámetros eliminados
      names.forEach(name => this.invalidateCache(name));
      
      return {
        deleted: response.DeletedParameters || [],
        invalid: response.InvalidParameters || []
      };
      
    } catch (error) {
      this.logger.error('Error deleting multiple parameters', error);
      throw error;
    }
  }

  async describeParameters(
    filters?: ParametersFilter[],
    maxResults?: number,
    nextToken?: string
  ): Promise<{
    parameters: any[];
    nextToken?: string;
  }> {
    try {
      this.logger.debug('Describing parameters', { filters, maxResults });
      
      const command = new DescribeParametersCommand({
        Filters: filters,
        MaxResults: maxResults,
        NextToken: nextToken
      });

      const response = await retry(() => this.client.send(command));
      
      return {
        parameters: response.Parameters || [],
        nextToken: response.NextToken
      };
      
    } catch (error) {
      this.logger.error('Error describing parameters', error);
      throw error;
    }
  }

  async describeParametersWithFilters(
    filters?: Array<{ Key: string; Values: string[] }>,
    maxResults?: number,
    nextToken?: string
  ): Promise<{
    parameters: any[];
    nextToken?: string;
  }> {
    const ssmFilters: ParametersFilter[] | undefined = filters?.map(filter => ({
      Key: filter.Key as ParametersFilterKey,
      Values: filter.Values
    }));

    return this.describeParameters(ssmFilters, maxResults, nextToken);
  }

  async getParametersByName(namePattern: string): Promise<any[]> {
    const filter: ParametersFilter = {
      Key: 'Name',
      Values: [namePattern]
    };
    
    const result = await this.describeParameters([filter]);
    return result.parameters;
  }

  async getParametersByType(type: 'String' | 'StringList' | 'SecureString'): Promise<any[]> {
    const filter: ParametersFilter = {
      Key: 'Type',
      Values: [type]
    };
    
    const result = await this.describeParameters([filter]);
    return result.parameters;
  }

  async getParametersByKeyId(keyId: string): Promise<any[]> {
    const filter: ParametersFilter = {
      Key: 'KeyId',
      Values: [keyId]
    };
    
    const result = await this.describeParameters([filter]);
    return result.parameters;
  }

  
  async searchParameters(searchTerm: string): Promise<any[]> {
    const result = await this.describeParametersWithFilters([
      { Key: 'Name', Values: [`*${searchTerm}*`] }
    ]);
    return result.parameters;
  }

  async addTagsToResource(name: string, tags: Array<{ Key: string; Value: string }>): Promise<void> {
    try {
      this.logger.debug('Adding tags to parameter', { name, tags });
      
      const command = new AddTagsToResourceCommand({
        ResourceType: 'Parameter',
        ResourceId: name,
        Tags: tags
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error adding tags to parameter', error);
      throw error;
    }
  }

  async removeTagsFromResource(name: string, tagKeys: string[]): Promise<void> {
    try {
      this.logger.debug('Removing tags from parameter', { name, tagKeys });
      
      const command = new RemoveTagsFromResourceCommand({
        ResourceType: 'Parameter',
        ResourceId: name,
        TagKeys: tagKeys
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error removing tags from parameter', error);
      throw error;
    }
  }

  async labelParameterVersion(name: string, labels: string[]): Promise<void> {
    try {
      this.logger.debug('Labeling parameter version', { name, labels });
      
      const command = new LabelParameterVersionCommand({
        Name: name,
        Labels: labels
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error labeling parameter version', error);
      throw error;
    }
  }

  invalidateCache(name: string): void {
    // Eliminar todas las versiones del parámetro del cache
    const cacheKeyWithDecryption = `parameter:${name}:true`;
    const cacheKeyWithoutDecryption = `parameter:${name}:false`;
    
    this.cache.delete(cacheKeyWithDecryption);
    this.cache.delete(cacheKeyWithoutDecryption);
    
    this.logger.debug('Invalidating cache for parameter', { name });
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Cleared all parameter cache');
  }

  setCacheConfig(config: CacheConfig): void {
    this.cacheConfig = { ...this.cacheConfig, ...config };
    this.logger.debug('Updated cache config', this.cacheConfig);
  }
}
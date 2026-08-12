import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  ListSecretsCommand,
  PutSecretValueCommand,
  RestoreSecretCommand,
  CancelRotateSecretCommand,
  RotateSecretCommand
} from '@aws-sdk/client-secrets-manager';
import { Logger, retry, CacheManager } from '../utils.js';
import type { SecretsManagerGetParams, SecretsManagerResult, CacheConfig } from '../types.js';

export class SecretsManagerService {
  private client: SecretsManagerClient;
  private logger: Logger;
  private cache: CacheManager;
  private cacheConfig: CacheConfig;

  constructor(cacheConfig: CacheConfig = {}) {
    this.client = new SecretsManagerClient({
      maxAttempts: 3,
      retryMode: 'standard'
    });
    
    this.logger = new Logger('SecretsManagerService');
    this.cacheConfig = {
      ttl: 5 * 60 * 1000, // 5 minutos por defecto
      enabled: true,
      maxSize: 1000,
      ...cacheConfig
    };
    
    this.cache = new CacheManager(this.cacheConfig.maxSize);
  }

  async getSecret(params: SecretsManagerGetParams): Promise<SecretsManagerResult> {
    const cacheKey = `secret:${params.secretId}:${params.versionId || 'latest'}`;
    
    // Verificar cache
    if (this.cacheConfig.enabled) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Retrieving secret from cache', { secretId: params.secretId });
        return cached;
      }
    }

    try {
      this.logger.debug('Getting secret', params);
      
      const command = new GetSecretValueCommand({
        SecretId: params.secretId,
        VersionId: params.versionId,
        VersionStage: params.versionStage
      });

      const response = await retry(() => this.client.send(command));
      
      let secretValue: any;
      
      if (response.SecretString) {
        try {
          secretValue = JSON.parse(response.SecretString);
        } catch {
          secretValue = response.SecretString;
        }
      } else if (response.SecretBinary) {
        secretValue = Buffer.from(response.SecretBinary).toString('utf-8');
        try {
          secretValue = JSON.parse(secretValue);
        } catch {
          // Mantener como string
        }
      }

      const result: SecretsManagerResult = {
        arn: response.ARN,
        name: response.Name,
        value: secretValue,
        versionId: response.VersionId,
        createdDate: response.CreatedDate
      };

      // Guardar en cache
      if (this.cacheConfig.enabled && this.cacheConfig.ttl) {
        this.cache.set(cacheKey, result, this.cacheConfig.ttl);
      }

      return result;
      
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        this.logger.error('Secret not found', { secretId: params.secretId });
        throw new Error(`Secret not found: ${params.secretId}`);
      }
      this.logger.error('Error getting secret', error);
      throw error;
    }
  }

  async getSecretValue(secretId: string): Promise<any> {
    const result = await this.getSecret({ secretId });
    return result.value;
  }

  async getCachedSecret(secretId: string, ttl: number = 300000): Promise<any> {
    return this.getSecret({ secretId });
  }

  async createSecret(
    name: string, 
    value: any, 
    description?: string, 
    tags?: Array<{ Key: string; Value: string }>,
    kmsKeyId?: string
  ): Promise<string> {
    try {
      this.logger.debug('Creating secret', { name, description });
      
      const secretString = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);
      
      const command = new CreateSecretCommand({
        Name: name,
        SecretString: secretString,
        Description: description,
        Tags: tags,
        KmsKeyId: kmsKeyId
      });

      const response = await retry(() => this.client.send(command));
      
      // Invalidar cache si existe
      this.invalidateCache(name);
      
      return response.ARN!;
      
    } catch (error) {
      this.logger.error('Error creating secret', error);
      throw error;
    }
  }

  async updateSecret(
    secretId: string, 
    value: any, 
    description?: string,
    kmsKeyId?: string
  ): Promise<string> {
    try {
      this.logger.debug('Updating secret', { secretId, description });
      
      const secretString = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);
      
      const command = new UpdateSecretCommand({
        SecretId: secretId,
        SecretString: secretString,
        Description: description,
        KmsKeyId: kmsKeyId
      });

      const response = await retry(() => this.client.send(command));
      
      // Invalidar cache
      this.invalidateCache(secretId);
      
      return response.ARN!;
      
    } catch (error) {
      this.logger.error('Error updating secret', error);
      throw error;
    }
  }

  async putSecretValue(secretId: string, value: any): Promise<string> {
    try {
      this.logger.debug('Putting secret value', { secretId });
      
      const secretString = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);
      
      const command = new PutSecretValueCommand({
        SecretId: secretId,
        SecretString: secretString
      });

      const response = await retry(() => this.client.send(command));
      
      // Invalidar cache
      this.invalidateCache(secretId);
      
      return response.ARN!;
      
    } catch (error) {
      this.logger.error('Error putting secret value', error);
      throw error;
    }
  }

  async deleteSecret(
    secretId: string, 
    recoveryWindowInDays?: number, 
    forceDeleteWithoutRecovery: boolean = false
  ): Promise<void> {
    try {
      this.logger.debug('Deleting secret', { 
        secretId, 
        recoveryWindowInDays, 
        forceDeleteWithoutRecovery 
      });
      
      const command = new DeleteSecretCommand({
        SecretId: secretId,
        RecoveryWindowInDays: recoveryWindowInDays,
        ForceDeleteWithoutRecovery: forceDeleteWithoutRecovery
      });

      await retry(() => this.client.send(command));
      
      // Limpiar cache
      this.invalidateCache(secretId);
      
    } catch (error) {
      this.logger.error('Error deleting secret', error);
      throw error;
    }
  }

  async restoreSecret(secretId: string): Promise<void> {
    try {
      this.logger.debug('Restoring secret', { secretId });
      
      const command = new RestoreSecretCommand({ SecretId: secretId });
      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error restoring secret', error);
      throw error;
    }
  }

  async rotateSecret(secretId: string, rotationLambdaARN?: string): Promise<void> {
    try {
      this.logger.debug('Rotating secret', { secretId, rotationLambdaARN });
      
      const command = new RotateSecretCommand({
        SecretId: secretId,
        RotationLambdaARN: rotationLambdaARN
      });

      await retry(() => this.client.send(command));
      
      // Invalidar cache
      this.invalidateCache(secretId);
      
    } catch (error) {
      this.logger.error('Error rotating secret', error);
      throw error;
    }
  }

  async cancelRotateSecret(secretId: string): Promise<void> {
    try {
      this.logger.debug('Canceling secret rotation', { secretId });
      
      const command = new CancelRotateSecretCommand({ SecretId: secretId });
      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error canceling secret rotation', error);
      throw error;
    }
  }

  async describeSecret(secretId: string): Promise<any> {
    try {
      this.logger.debug('Describing secret', { secretId });
      
      const command = new DescribeSecretCommand({ SecretId: secretId });
      const response = await retry(() => this.client.send(command));
      
      return {
        arn: response.ARN,
        name: response.Name,
        description: response.Description,
        kmsKeyId: response.KmsKeyId,
        rotationEnabled: response.RotationEnabled,
        rotationLambdaARN: response.RotationLambdaARN,
        rotationRules: response.RotationRules,
        lastRotatedDate: response.LastRotatedDate,
        lastChangedDate: response.LastChangedDate,
        lastAccessedDate: response.LastAccessedDate,
        deletedDate: response.DeletedDate,
        tags: response.Tags,
        versionIdsToStages: response.VersionIdsToStages,
        owningService: response.OwningService,
        createdDate: response.CreatedDate
      };
      
    } catch (error) {
      this.logger.error('Error describing secret', error);
      throw error;
    }
  }

  async listSecrets(maxResults?: number, nextToken?: string): Promise<{ secrets: any[]; nextToken?: string }> {
    try {
      this.logger.debug('Listing secrets', { maxResults });
      
      const command = new ListSecretsCommand({
        MaxResults: maxResults,
        NextToken: nextToken
      });

      const response = await retry(() => this.client.send(command));
      
      return {
        secrets: response.SecretList || [],
        nextToken: response.NextToken
      };
      
    } catch (error) {
      this.logger.error('Error listing secrets', error);
      throw error;
    }
  }

  async getAllSecrets(): Promise<any[]> {
    let allSecrets: any[] = [];
    let nextToken: string | undefined;

    do {
      const result = await this.listSecrets(100, nextToken);
      allSecrets = allSecrets.concat(result.secrets);
      nextToken = result.nextToken;
    } while (nextToken);

    return allSecrets;
  }

  invalidateCache(secretId: string): void {
    const cacheKey = `secret:${secretId}:latest`;
    this.cache.delete(cacheKey);
    this.logger.debug('Invalidating cache for secret', { secretId });
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Cleared all secret cache');
  }

  setCacheConfig(config: CacheConfig): void {
    this.cacheConfig = { ...this.cacheConfig, ...config };
    this.logger.debug('Updated cache config', this.cacheConfig);
  }
}
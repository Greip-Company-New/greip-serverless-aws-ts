import { 
  S3Client, 
  GetObjectCommand, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Logger, retry, streamToBuffer } from '../utils.js';
import type { S3ObjectParams, S3UploadResult, S3DownloadResult } from '../types.js';

export class S3Service {
  private client: S3Client;
  private logger: Logger;

  constructor() {
    this.client = new S3Client({
      maxAttempts: 3,
      retryMode: 'standard'
    });
    this.logger = new Logger('S3Service');
  }

  async getObject(bucket: string, key: string): Promise<S3DownloadResult> {
    try {
      this.logger.debug('Getting object', { bucket, key });
      
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const response = await retry(() => this.client.send(command));
      
      let body: any;
      let rawBody: Buffer | undefined;
      
      if (response.Body) {
        // Convertir el stream a buffer
        rawBody = await streamToBuffer(response.Body);
        
        // Intentar parsear como JSON si parece serlo
        const contentType = response.ContentType || '';
        const isJson = contentType.includes('application/json') || 
                       key.endsWith('.json') ||
                       (rawBody.length > 0 && 
                        (rawBody[0] === 123 || rawBody[0] === 91)); // '{' o '['
        
        const isText = contentType.includes('text/') ||
                       contentType.includes('application/xml') ||
                       contentType.includes('application/javascript');
        
        if (isJson) {
          try {
            body = JSON.parse(rawBody.toString('utf-8'));
          } catch {
            body = rawBody.toString('utf-8');
          }
        } else if (isText) {
          body = rawBody.toString('utf-8');
        } else {
          body = rawBody;
        }
      }

      return {
        body,
        rawBody,
        contentType: response.ContentType,
        metadata: response.Metadata,
        lastModified: response.LastModified,
        size: response.ContentLength,
        etag: response.ETag,
        versionId: response.VersionId
      };
      
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        this.logger.error('Object not found', { bucket, key });
        throw new Error(`Object not found: s3://${bucket}/${key}`);
      }
      this.logger.error('Error getting object', error);
      throw error;
    }
  }

  async getObjectAsString(bucket: string, key: string): Promise<string> {
    try {
      this.logger.debug('Getting object as string', { bucket, key });
      
      const result = await this.getObject(bucket, key);
      
      if (typeof result.body === 'string') {
        return result.body;
      }
      
      if (Buffer.isBuffer(result.body) || result.body instanceof Uint8Array) {
        return Buffer.from(result.body).toString('utf-8');
      }
      
      return JSON.stringify(result.body);
      
    } catch (error) {
      this.logger.error('Error getting object as string', error);
      throw error;
    }
  }

  async getObjectAsBuffer(bucket: string, key: string): Promise<Buffer> {
    try {
      this.logger.debug('Getting object as buffer', { bucket, key });
      
      const result = await this.getObject(bucket, key);
      
      if (Buffer.isBuffer(result.body)) {
        return result.body;
      }
      
      if (result.body instanceof Uint8Array) {
        return Buffer.from(result.body);
      }
      
      if (typeof result.body === 'string') {
        return Buffer.from(result.body, 'utf-8');
      }
      
      return Buffer.from(JSON.stringify(result.body), 'utf-8');
      
    } catch (error) {
      this.logger.error('Error getting object as buffer', error);
      throw error;
    }
  }

  async getObjectAsJson<T = any>(bucket: string, key: string): Promise<T> {
    try {
      this.logger.debug('Getting object as JSON', { bucket, key });
      
      const result = await this.getObject(bucket, key);
      
      if (typeof result.body === 'string') {
        return JSON.parse(result.body) as T;
      }
      
      if (Buffer.isBuffer(result.body) || result.body instanceof Uint8Array) {
        const text = Buffer.from(result.body).toString('utf-8');
        return JSON.parse(text) as T;
      }
      
      // Si ya es un objeto, devolverlo directamente
      return result.body as T;
      
    } catch (error) {
      this.logger.error('Error getting object as JSON', error);
      throw error;
    }
  }

  async putObject(params: S3ObjectParams): Promise<S3UploadResult> {
    try {
      this.logger.debug('Putting object', { 
        bucket: params.bucket, 
        key: params.key,
        contentType: params.contentType 
      });
      
      let body = params.body;
      
      // Convertir objetos a JSON string si es necesario
      if (body && typeof body === 'object' && !Buffer.isBuffer(body) && !(body instanceof Uint8Array)) {
        body = JSON.stringify(body, null, 2);
      }
      
      // Convertir string a Buffer si es necesario
      if (typeof body === 'string') {
        body = Buffer.from(body, 'utf-8');
      }

      const command = new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        Body: body,
        ContentType: params.contentType || this.getContentType(params.key),
        Metadata: params.metadata
      });

      const response = await retry(() => this.client.send(command));
      
      const location = `https://${params.bucket}.s3.amazonaws.com/${params.key}`;
      
      return {
        bucket: params.bucket,
        key: params.key,
        etag: response.ETag?.replace(/"/g, '') || '',
        versionId: response.VersionId,
        location
      };
      
    } catch (error) {
      this.logger.error('Error putting object', error);
      throw error;
    }
  }

  async putObjectAsJson(bucket: string, key: string, data: any, metadata?: Record<string, string>): Promise<S3UploadResult> {
    return this.putObject({
      bucket,
      key,
      body: data,
      contentType: 'application/json; charset=utf-8',
      metadata
    });
  }

  async putObjectAsText(bucket: string, key: string, text: string, metadata?: Record<string, string>): Promise<S3UploadResult> {
    return this.putObject({
      bucket,
      key,
      body: text,
      contentType: 'text/plain; charset=utf-8',
      metadata
    });
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      this.logger.debug('Deleting object', { bucket, key });
      
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error deleting object', error);
      throw error;
    }
  }

  async deleteObjects(bucket: string, keys: string[]): Promise<void> {
    try {
      this.logger.debug('Deleting multiple objects', { bucket, keysCount: keys.length });
      
      for (const key of keys) {
        await this.deleteObject(bucket, key);
      }
      
    } catch (error) {
      this.logger.error('Error deleting multiple objects', error);
      throw error;
    }
  }

  async listObjects(bucket: string, prefix?: string, maxKeys?: number): Promise<any[]> {
    try {
      this.logger.debug('Listing objects', { bucket, prefix, maxKeys });
      
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      const response = await retry(() => this.client.send(command));
      return response.Contents || [];
      
    } catch (error) {
      this.logger.error('Error listing objects', error);
      throw error;
    }
  }

  async listObjectKeys(bucket: string, prefix?: string): Promise<string[]> {
    try {
      const objects = await this.listObjects(bucket, prefix);
      return objects.map(obj => obj.Key!).filter(Boolean);
      
    } catch (error) {
      this.logger.error('Error listing object keys', error);
      throw error;
    }
  }

  async copyObject(sourceBucket: string, sourceKey: string, destinationBucket: string, destinationKey: string): Promise<void> {
    try {
      this.logger.debug('Copying object', { 
        sourceBucket, 
        sourceKey, 
        destinationBucket, 
        destinationKey 
      });
      
      const command = new CopyObjectCommand({
        CopySource: `${sourceBucket}/${encodeURIComponent(sourceKey)}`,
        Bucket: destinationBucket,
        Key: destinationKey
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error copying object', error);
      throw error;
    }
  }

  async moveObject(sourceBucket: string, sourceKey: string, destinationBucket: string, destinationKey: string): Promise<void> {
    try {
      this.logger.debug('Moving object', { 
        sourceBucket, 
        sourceKey, 
        destinationBucket, 
        destinationKey 
      });
      
      // Copiar
      await this.copyObject(sourceBucket, sourceKey, destinationBucket, destinationKey);
      
      // Eliminar original
      await this.deleteObject(sourceBucket, sourceKey);
      
    } catch (error) {
      this.logger.error('Error moving object', error);
      throw error;
    }
  }

  async objectExists(bucket: string, key: string): Promise<boolean> {
    try {
      this.logger.debug('Checking if object exists', { bucket, key });
      
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key
      });

      await retry(() => this.client.send(command));
      return true;
      
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false;
      }
      this.logger.error('Error checking object existence', error);
      throw error;
    }
  }

  async getObjectMetadata(bucket: string, key: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
    metadata?: Record<string, string>;
    etag?: string;
  }> {
    try {
      this.logger.debug('Getting object metadata', { bucket, key });
      
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const response = await retry(() => this.client.send(command));
      
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata,
        etag: response.ETag
      };
      
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        throw new Error(`Object not found: s3://${bucket}/${key}`);
      }
      this.logger.error('Error getting object metadata', error);
      throw error;
    }
  }

  async getSignedUrl(bucket: string, key: string, expiresIn: number = 3600): Promise<string> {
    try {
      this.logger.debug('Generating signed URL', { bucket, key, expiresIn });
      
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      return await getSignedUrl(this.client, command, { expiresIn });
      
    } catch (error) {
      this.logger.error('Error generating signed URL', error);
      throw error;
    }
  }

  async getPutSignedUrl(bucket: string, key: string, expiresIn: number = 3600, contentType?: string): Promise<string> {
    try {
      this.logger.debug('Generating PUT signed URL', { bucket, key, expiresIn, contentType });
      
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType
      });

      return await getSignedUrl(this.client, command, { expiresIn });
      
    } catch (error) {
      this.logger.error('Error generating PUT signed URL', error);
      throw error;
    }
  }

  async getSignedUploadUrl(bucket: string, key: string, expiresIn: number = 3600, contentType?: string): Promise<string> {
    return this.getPutSignedUrl(bucket, key, expiresIn, contentType);
  }

  private getContentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const contentTypes: Record<string, string> = {
      // Text
      'txt': 'text/plain',
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'ico': 'image/x-icon',
      
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Archives
      'zip': 'application/zip',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      '7z': 'application/x-7z-compressed',
      
      // Audio/Video
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'mpeg': 'video/mpeg',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wav': 'audio/wav'
    };
    
    return contentTypes[extension] || 'application/octet-stream';
  }
}
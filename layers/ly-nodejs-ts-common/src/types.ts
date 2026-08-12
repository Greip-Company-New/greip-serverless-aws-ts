// Tipos comunes para todos los servicios AWS

export interface S3ObjectParams {
  bucket: string;
  key: string;
  body?: any;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface DynamoDBQueryParams {
  tableName: string;
  keyConditionExpression: string;
  expressionAttributeValues: Record<string, any>;
  indexName?: string;
  limit?: number;
  scanIndexForward?: boolean;
}

export interface DynamoDBScanParams {
  tableName: string;
  filterExpression?: string;
  expressionAttributeValues?: Record<string, any>;
  limit?: number;
  select?: string;
}

export interface DynamoDBUpdateParams {
  tableName: string;
  key: Record<string, any>;
  updateExpression: string;
  expressionAttributeValues: Record<string, any>;
  expressionAttributeNames?: Record<string, string>;
  returnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
}

export interface SQSSendParams {
  queueUrl: string;
  messageBody: any;
  delaySeconds?: number;
  messageAttributes?: Record<string, any>;
  messageGroupId?: string;
  messageDeduplicationId?: string;
}

export interface SQSReceiveParams {
  queueUrl: string;
  maxNumberOfMessages?: number;
  waitTimeSeconds?: number;
  visibilityTimeout?: number;
}

export interface SNSPublishParams {
  topicArn: string;
  message: any;
  subject?: string;
  messageAttributes?: Record<string, any>;
}

export interface EventBridgePutParams {
  eventBusName?: string;
  source: string;
  detailType: string;
  detail: any;
  resources?: string[];
  time?: Date;
}

export interface StepFunctionsStartParams {
  stateMachineArn: string;
  input?: any;
  name?: string;
}

export interface SecretsManagerGetParams {
  secretId: string;
  versionId?: string;
  versionStage?: string;
}

export interface ParameterStoreGetParams {
  name: string;
  withDecryption?: boolean;
}

export interface ParameterStorePutParams {
  name: string;
  value: any;
  type?: 'String' | 'StringList' | 'SecureString';
  description?: string;
  tags?: Array<{ Key: string; Value: string }>;
  tier?: 'Standard' | 'Advanced' | 'Intelligent-Tiering';
  policies?: string;
}

export interface CacheConfig {
  ttl?: number; // milliseconds
  enabled?: boolean;
  maxSize?: number;
}

export interface Logger {
  info: (message: string, meta?: any) => void;
  error: (message: string, error?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

export interface LambdaInvokeParams {
  functionName: string;
  payload: any;
  region?: string;
  invocationType?: 'Event' | 'RequestResponse' | 'DryRun';
}

export interface LambdaInvokeResult {
  statusCode: number;
  payload: any;
  executedVersion?: string;
  error?: string;
}

// Result types
export interface S3UploadResult {
  bucket: string;
  key: string;
  etag: string;
  versionId?: string;
  location?: string;
}

export interface S3DownloadResult {
  body: any;
  rawBody?: Buffer | Uint8Array;
  contentType?: string;
  metadata?: Record<string, string>;
  lastModified?: Date;
  size?: number;
  etag?: string;
  versionId?: string;
}

export interface DynamoDBResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface SQSMessage {
  messageId: string;
  receiptHandle: string;
  body: any;
  attributes?: Record<string, any>;
  messageAttributes?: Record<string, any>;
}

export interface EventBridgeResult {
  eventId: string;
  successfulEntryCount: number;
  failedEntryCount: number;
}

export interface StepFunctionsResult {
  executionArn: string;
  startDate: Date;
}

export interface SecretsManagerResult {
  arn?: string;
  name?: string;
  value: any;
  versionId?: string;
  createdDate?: Date;
}

export interface ParameterStoreResult {
  name: string;
  value: any;
  type?: string;
  version?: number;
  lastModifiedDate?: Date;
}
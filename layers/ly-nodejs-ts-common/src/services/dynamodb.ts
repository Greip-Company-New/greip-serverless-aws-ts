import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
  BatchGetCommand,
  TransactWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { Logger, retry } from '../utils.js';
import type { DynamoDBQueryParams, DynamoDBScanParams, DynamoDBUpdateParams, DynamoDBResult } from '../types.js';

export class DynamoDBService {
  private docClient: DynamoDBDocumentClient;
  private logger: Logger;

  constructor() {
    const client = new DynamoDBClient({ 
      maxAttempts: 3,
      retryMode: 'standard'
    });
    
    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });
    
    this.logger = new Logger('DynamoDBService');
  }

  async getItem(tableName: string, key: Record<string, any>): Promise<any> {
    try {
      this.logger.debug('Getting item', { tableName, key });
      
      const command = new GetCommand({
        TableName: tableName,
        Key: key
      });

      const response = await retry(() => this.docClient.send(command));
      return response.Item;
      
    } catch (error) {
      this.logger.error('Error getting item', error);
      throw error;
    }
  }

  async putItem(tableName: string, item: Record<string, any>): Promise<void> {
    try {
      this.logger.debug('Putting item', { tableName, item });
      
      const command = new PutCommand({
        TableName: tableName,
        Item: item
      });

      await retry(() => this.docClient.send(command));
      
    } catch (error) {
      this.logger.error('Error putting item', error);
      throw error;
    }
  }

  async updateItem(params: DynamoDBUpdateParams): Promise<any> {
    try {
      this.logger.debug('Updating item', params);
      
      const command = new UpdateCommand({
        TableName: params.tableName,
        Key: params.key,
        UpdateExpression: params.updateExpression,
        ExpressionAttributeValues: params.expressionAttributeValues,
        ExpressionAttributeNames: params.expressionAttributeNames,
        ReturnValues: params.returnValues || 'ALL_NEW'
      });

      const response = await retry(() => this.docClient.send(command));
      return response.Attributes;
      
    } catch (error) {
      this.logger.error('Error updating item', error);
      throw error;
    }
  }

  async deleteItem(tableName: string, key: Record<string, any>): Promise<void> {
    try {
      this.logger.debug('Deleting item', { tableName, key });
      
      const command = new DeleteCommand({
        TableName: tableName,
        Key: key
      });

      await retry(() => this.docClient.send(command));
      
    } catch (error) {
      this.logger.error('Error deleting item', error);
      throw error;
    }
  }

  async query(params: DynamoDBQueryParams): Promise<any[]> {
    try {
      this.logger.debug('Querying items', params);
      
      const command = new QueryCommand({
        TableName: params.tableName,
        KeyConditionExpression: params.keyConditionExpression,
        ExpressionAttributeValues: params.expressionAttributeValues,
        IndexName: params.indexName,
        Limit: params.limit,
        ScanIndexForward: params.scanIndexForward
      });

      const response = await retry(() => this.docClient.send(command));
      return response.Items || [];
      
    } catch (error) {
      this.logger.error('Error querying items', error);
      throw error;
    }
  }

  // async scan(params: DynamoDBScanParams): Promise<any[]> {
  //   try {
  //     this.logger.debug('Scanning items', params);
      
  //     const command = new ScanCommand({
  //       TableName: params.tableName,
  //       FilterExpression: params.filterExpression,
  //       ExpressionAttributeValues: params.expressionAttributeValues,
  //       Limit: params.limit,
  //       Select: params.select
  //     });

  //     const response = await retry(() => this.docClient.send(command));
  //     return response.Items || [];
      
  //   } catch (error) {
  //     this.logger.error('Error scanning items', error);
  //     throw error;
  //   }
  // }

  async batchGet(tableName: string, keys: Record<string, any>[]): Promise<any[]> {
    try {
      this.logger.debug('Batch getting items', { tableName, keysCount: keys.length });
      
      const command = new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: keys
          }
        }
      });

      const response = await retry(() => this.docClient.send(command));
      return response.Responses?.[tableName] || [];
      
    } catch (error) {
      this.logger.error('Error batch getting items', error);
      throw error;
    }
  }

  async batchWrite(tableName: string, putRequests?: any[], deleteRequests?: any[]): Promise<void> {
    try {
      this.logger.debug('Batch writing items', { 
        tableName, 
        putCount: putRequests?.length, 
        deleteCount: deleteRequests?.length 
      });
      
      const requestItems: any = {};
      
      if (putRequests && putRequests.length > 0) {
        requestItems.PutRequest = putRequests.map(item => ({ Item: item }));
      }
      
      if (deleteRequests && deleteRequests.length > 0) {
        requestItems.DeleteRequest = deleteRequests.map(key => ({ Key: key }));
      }

      const command = new BatchWriteCommand({
        RequestItems: {
          [tableName]: Object.values(requestItems)
        }
      });

      await retry(() => this.docClient.send(command));
      
    } catch (error) {
      this.logger.error('Error batch writing items', error);
      throw error;
    }
  }

  async transactWrite(transactItems: any[]): Promise<void> {
    try {
      this.logger.debug('Transaction write', { itemsCount: transactItems.length });
      
      const command = new TransactWriteCommand({
        TransactItems: transactItems
      });

      await retry(() => this.docClient.send(command));
      
    } catch (error) {
      this.logger.error('Error in transaction write', error);
      throw error;
    }
  }
}
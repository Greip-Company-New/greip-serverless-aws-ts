// Escritura por lotes en DynamoDB (BatchWriteCommand) con chunks de maximo 25 items.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ maxAttempts: 3, retryMode: 'standard' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
  unmarshallOptions: { wrapNumbers: false }
});

const MAX_BATCH = 25;

export async function batchWriteItems(tableName: string, items: any[]): Promise<void> {
  for (let i = 0; i < items.length; i += MAX_BATCH) {
    const chunk = items.slice(i, i + MAX_BATCH);
    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: chunk.map((item) => ({ PutRequest: { Item: item } }))
      }
    });
    await docClient.send(command);
  }
}

// Scan paginado de DynamoDB (el DynamoDBService de la capa comun no expone scan).
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, type ScanCommandInput } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ maxAttempts: 3, retryMode: 'standard' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
  unmarshallOptions: { wrapNumbers: false }
});

export async function scanAll(
  params: Omit<ScanCommandInput, 'TableName'> & { TableName: string }
): Promise<any[]> {
  const items: any[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;
  do {
    const command = new ScanCommand({
      ...params,
      ExclusiveStartKey: lastEvaluatedKey as any
    });
    const response = await docClient.send(command);
    if (response.Items) {
      items.push(...response.Items);
    }
    lastEvaluatedKey = response.LastEvaluatedKey as Record<string, any> | undefined;
  } while (lastEvaluatedKey);
  return items;
}

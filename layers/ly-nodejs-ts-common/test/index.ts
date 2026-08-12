import { awsUtils } from 'aws-utils-layer';

export const handler = async (event: any) => {
  // Usar DynamoDB
  const item = await awsUtils.dynamodb.getItem('MyTable', { id: '123' });
  
  // Usar S3
  await awsUtils.s3.putObject('bk-repository-dev', 'key.txt', 'Hello World');
  
  return { success: true };
};
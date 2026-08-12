import { awsUtils } from '/opt/nodejs/index.js';

export const handler = async (event) => {
  // Crear/Actualizar item
  await awsUtils.dynamodb.putItem('UsersTable', {
    userId: event.userId,
    email: event.email,
    createdAt: new Date().toISOString(),
    profile: {
      name: event.name,
      age: event.age
    }
  });

  // Obtener item
  const user = await awsUtils.dynamodb.getItem('UsersTable', {
    userId: event.userId
  });

  // Actualizar parcialmente
  await awsUtils.dynamodb.updateItem({
    tableName: 'UsersTable',
    key: { userId: event.userId },
    updateExpression: 'SET #status = :status, updatedAt = :now',
    expressionAttributeValues: {
      ':status': 'active',
      ':now': new Date().toISOString()
    },
    expressionAttributeNames: {
      '#status': 'status'
    }
  });

  // Query con filtro
  const activeUsers = await awsUtils.dynamodb.query({
    tableName: 'UsersTable',
    keyConditionExpression: '#status = :status',
    expressionAttributeValues: {
      ':status': 'active'
    },
    expressionAttributeNames: {
      '#status': 'status'
    },
    limit: 100
  });

  // Batch operations
  const users = await awsUtils.dynamodb.batchGet(
    'UsersTable',
    [{ userId: '1' }, { userId: '2' }, { userId: '3' }]
  );

  return { user, activeUsers: activeUsers.length };
};
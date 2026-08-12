import { awsUtils } from '/opt/nodejs/index.js';

export const handler = async (event) => {
  // Obtener secreto (con cache automático)
  const dbSecret = await awsUtils.secretsManager.getSecret({
    secretId: process.env.DB_SECRET_ARN
  });

  // Obtener valor específico
  const apiKey = await awsUtils.secretsManager.getSecretValue('prod/api/keys');

  // Crear nuevo secreto
  const secretArn = await awsUtils.secretsManager.createSecret(
    'app/production/new-api-key',
    {
      apiKey: 'sk_live_abc123',
      apiSecret: 'xyz789',
      environment: 'production'
    },
    'API keys for external service',
    [
      { Key: 'Environment', Value: 'production' },
      { Key: 'Service', Value: 'payment' }
    ]
  );

  // Rotar secreto automáticamente
  await awsUtils.secretsManager.rotateSecret('app/database/credentials');

  // Listar todos los secretos
  const { secrets } = await awsUtils.secretsManager.listSecrets(100);

  return {
    dbHost: dbSecret.value.host,
    apiKey: apiKey.production,
    newSecretArn: secretArn,
    totalSecrets: secrets.length
  };
};
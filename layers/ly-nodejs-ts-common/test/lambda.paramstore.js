import { awsUtils } from '/opt/nodejs/index.js';

export const handler = async (event) => {
  // Obtener parámetro individual
  const timeout = await awsUtils.parameterStore.getParameter({
    name: '/app/production/timeout',
    withDecryption: true
  });

  // Obtener múltiples parámetros
  const params = await awsUtils.parameterStore.getParameters([
    '/app/production/api-url',
    '/app/production/region',
    '/app/production/max-retries'
  ]);

  // Obtener todos los parámetros de un path
  const allConfigs = await awsUtils.parameterStore.getAllParametersByPath(
    '/app/production/config/'
  );

  // Crear/Actualizar parámetro
  await awsUtils.parameterStore.putParameter({
    name: '/app/production/feature-flags',
    value: {
      newDashboard: true,
      darkMode: false,
      experimentalFeatures: ['ai-assistant', 'analytics-v2']
    },
    type: 'String',
    description: 'Feature flags for production',
    tags: [
      { Key: 'Environment', Value: 'production' },
      { Key: 'ManagedBy', Value: 'cloudformation' }
    ]
  });

  // Buscar parámetros
  const searchResults = await awsUtils.parameterStore.searchParameters('database');

  return {
    timeout,
    apiUrl: params['/app/production/api-url'],
    featureFlags: allConfigs['/app/production/config/features'],
    searchResults: searchResults.length
  };
};
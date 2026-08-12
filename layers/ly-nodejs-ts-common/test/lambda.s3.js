import { awsUtils } from '/opt/nodejs/index.js';

export const handler = async (event) => {
  // Subir JSON
  await awsUtils.s3.putObjectAsJson('my-bucket', 'users/123.json', {
    userId: '123',
    name: 'John Doe',
    preferences: { theme: 'dark', language: 'es' }
  });

  // Subir texto
  await awsUtils.s3.putObjectAsText(
    'my-bucket',
    'logs/error.log',
    `Error at ${new Date().toISOString()}: ${event.error}`
  );

  // Leer JSON
  const config = await awsUtils.s3.getObjectAsJson('my-bucket', 'config/app.json');

  // Leer como texto
  const logContent = await awsUtils.s3.getObjectAsString('my-bucket', 'logs/app.log');

  // Leer binario (imagen, PDF, etc.)
  const pdfBuffer = await awsUtils.s3.getObjectAsBuffer('my-bucket', 'documents/report.pdf');

  // Listar objetos
  const userFiles = await awsUtils.s3.listObjects('my-bucket', 'users/');

  // Generar URL firmada para descarga
  const downloadUrl = await awsUtils.s3.getSignedUrl(
    'my-bucket',
    'private/report.pdf',
    3600 // 1 hora
  );

  // Generar URL para upload
  const uploadUrl = await awsUtils.s3.getSignedUploadUrl(
    'my-bucket',
    'uploads/user-avatar.jpg',
    1800, // 30 minutos
    'image/jpeg'
  );

  return {
    config,
    logLines: logContent.split('\n').length,
    userFiles: userFiles.map(f => f.Key),
    downloadUrl,
    uploadUrl
  };
};
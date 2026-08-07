import { awsUtils } from '/opt/nodejs/index.js';

export const handler = async (event) => {
  // Publicar en un topic
  const messageId = await awsUtils.sns.publishMessage({
    topicArn: process.env.SNS_TOPIC_ARN,
    message: {
      event: 'user_registered',
      userId: event.userId,
      email: event.email
    },
    subject: 'Nuevo Usuario Registrado',
    messageAttributes: {
      environment: {
        DataType: 'String',
        StringValue: process.env.ENVIRONMENT
      },
      priority: {
        DataType: 'String',
        StringValue: 'high'
      }
    }
  });

  // Enviar SMS
  await awsUtils.sns.publishToPhone(
    '+1234567890',
    `Tu código de verificación es: ${event.code}`
  );

  return { messageId };
};
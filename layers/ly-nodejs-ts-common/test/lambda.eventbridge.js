import { awsUtils } from '/opt/nodejs/index.js';

export const handler = async (event) => {
  // Publicar evento
  const eventResult = await awsUtils.eventBridge.putEvent({
    eventBusName: process.env.EVENT_BUS_NAME,
    source: 'user.service',
    detailType: 'UserCreated',
    detail: {
      userId: event.userId,
      email: event.email,
      timestamp: new Date().toISOString()
    },
    resources: [`arn:aws:user:${event.userId}`]
  });

  // Publicar múltiples eventos
  await awsUtils.eventBridge.putEvents([
    {
      source: 'order.service',
      detailType: 'OrderPlaced',
      detail: { orderId: '123', amount: 100 },
      eventBusName: 'default'
    },
    {
      source: 'payment.service',
      detailType: 'PaymentProcessed',
      detail: { paymentId: '456', status: 'completed' },
      eventBusName: 'default'
    }
  ]);

  return { eventId: eventResult.eventId };
};
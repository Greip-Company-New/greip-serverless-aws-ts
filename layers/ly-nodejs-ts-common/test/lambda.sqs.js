import { awsUtils, QueueAttributeName } from '/opt/nodejs/index.js';

export const handler = async (event) => {
  // Enviar mensaje
  const messageId = await awsUtils.sqs.sendMessage({
    queueUrl: process.env.QUEUE_URL,
    messageBody: {
      type: 'user_registered',
      userId: event.userId,
      timestamp: new Date().toISOString()
    },
    delaySeconds: 10 // Retrasar 10 segundos
  });

  // Enviar mensajes en lote
  const batchResults = await awsUtils.sqs.sendBatchMessages(
    process.env.QUEUE_URL,
    [
      { id: '1', body: { action: 'process', data: 'A' } },
      { id: '2', body: { action: 'process', data: 'B' } },
      { id: '3', body: { action: 'process', data: 'C' } }
    ]
  );

  // Recibir mensajes
  const messages = await awsUtils.sqs.receiveMessages({
    queueUrl: process.env.QUEUE_URL,
    maxNumberOfMessages: 10,
    waitTimeSeconds: 20 // Long polling
  });

  // Procesar cada mensaje
  for (const message of messages) {
    console.log('Processing:', message.body);
    
    try {
      // Lógica de procesamiento
      await processMessage(message.body);
      
      // Eliminar mensaje después de procesarlo exitosamente
      await awsUtils.sqs.deleteMessage(process.env.QUEUE_URL, message.receiptHandle);
    } catch (error) {
      // Cambiar visibilidad para reintentar más tarde
      await awsUtils.sqs.changeMessageVisibility(
        process.env.QUEUE_URL,
        message.receiptHandle,
        300 // 5 minutos
      );
    }
  }

  // O usar el procesador automático
  const result = await awsUtils.sqs.processMessages(
    process.env.QUEUE_URL,
    async (message) => {
      console.log('Processing:', message.body);
      await processMessage(message.body);
    },
    {
      maxMessages: 10,
      waitTimeSeconds: 20,
      stopWhenEmpty: true,
      maxProcessingTime: 60000 // 1 minuto
    }
  );

  // Obtener métricas de la cola
  const attributes = await awsUtils.sqs.getQueueAttributes(
    process.env.QUEUE_URL,
    [
      QueueAttributeName.ApproximateNumberOfMessages,
      QueueAttributeName.ApproximateNumberOfMessagesNotVisible,
      QueueAttributeName.ApproximateNumberOfMessagesDelayed
    ]
  );

  return {
    sentMessageId: messageId,
    batchResults,
    processedCount: result.processed,
    queueMetrics: attributes
  };
};
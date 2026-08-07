import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  PurgeQueueCommand,
  ChangeMessageVisibilityCommand,
  GetQueueAttributesCommand,
  QueueAttributeName
} from '@aws-sdk/client-sqs';
import { Logger, retry } from '../utils.js';
import type { SQSSendParams, SQSReceiveParams, SQSMessage } from '../types.js';

export class SQSService {
  private client: SQSClient;
  private logger: Logger;

  constructor() {
    this.client = new SQSClient({
      maxAttempts: 3,
      retryMode: 'standard'
    });
    this.logger = new Logger('SQSService');
  }

  async sendMessage(params: SQSSendParams): Promise<string> {
    try {
      this.logger.debug('Sending message', { 
        queueUrl: params.queueUrl, 
        delaySeconds: params.delaySeconds 
      });
      
      const messageBody = typeof params.messageBody === 'string' 
        ? params.messageBody 
        : JSON.stringify(params.messageBody);

      const command = new SendMessageCommand({
        QueueUrl: params.queueUrl,
        MessageBody: messageBody,
        DelaySeconds: params.delaySeconds,
        MessageAttributes: params.messageAttributes,
        MessageGroupId: params.messageGroupId,
        MessageDeduplicationId: params.messageDeduplicationId
      });

      const response = await retry(() => this.client.send(command));
      return response.MessageId!;
      
    } catch (error) {
      this.logger.error('Error sending message', error);
      throw error;
    }
  }

  async receiveMessages(params: SQSReceiveParams): Promise<SQSMessage[]> {
    try {
      this.logger.debug('Receiving messages', { 
        queueUrl: params.queueUrl, 
        maxNumberOfMessages: params.maxNumberOfMessages 
      });
      
      const command = new ReceiveMessageCommand({
        QueueUrl: params.queueUrl,
        MaxNumberOfMessages: params.maxNumberOfMessages || 10,
        WaitTimeSeconds: params.waitTimeSeconds || 20,
        VisibilityTimeout: params.visibilityTimeout,
        AttributeNames: ['All'],
        MessageAttributeNames: ['All']
      });

      const response = await retry(() => this.client.send(command));
      
      if (!response.Messages) {
        return [];
      }

      return response.Messages.map(msg => ({
        messageId: msg.MessageId!,
        receiptHandle: msg.ReceiptHandle!,
        body: this.parseMessageBody(msg.Body),
        attributes: msg.Attributes,
        messageAttributes: msg.MessageAttributes
      }));
      
    } catch (error) {
      this.logger.error('Error receiving messages', error);
      throw error;
    }
  }

  async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    try {
      this.logger.debug('Deleting message', { queueUrl });
      
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error deleting message', error);
      throw error;
    }
  }

  async changeMessageVisibility(queueUrl: string, receiptHandle: string, visibilityTimeout: number): Promise<void> {
    try {
      this.logger.debug('Changing message visibility', { queueUrl, visibilityTimeout });
      
      const command = new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeout
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error changing message visibility', error);
      throw error;
    }
  }

  async purgeQueue(queueUrl: string): Promise<void> {
    try {
      this.logger.debug('Purging queue', { queueUrl });
      
      const command = new PurgeQueueCommand({
        QueueUrl: queueUrl
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error purging queue', error);
      throw error;
    }
  }

  async getQueueAttributes(
    queueUrl: string, 
    attributeNames: QueueAttributeName[] = [QueueAttributeName.All]
  ): Promise<Record<string, string>> {
    try {
      this.logger.debug('Getting queue attributes', { queueUrl });
      
      const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: attributeNames
      });

      const response = await retry(() => this.client.send(command));
      return response.Attributes || {};
      
    } catch (error) {
      this.logger.error('Error getting queue attributes', error);
      throw error;
    }
  }

  async getQueueArn(queueUrl: string): Promise<string> {
    const attributes = await this.getQueueAttributes(queueUrl, [QueueAttributeName.QueueArn]);
    return attributes.QueueArn!;
  }

  async getQueueUrl(queueName: string, accountId?: string): Promise<string> {
    try {
      this.logger.debug('Getting queue URL', { queueName, accountId });
      
      const region = process.env.AWS_REGION || 'us-east-1';
      const queueUrl = accountId 
        ? `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`
        : `https://sqs.${region}.amazonaws.com/${queueName}`;
      
      return queueUrl;
      
    } catch (error) {
      this.logger.error('Error getting queue URL', error);
      throw error;
    }
  }

  async getApproximateNumberOfMessages(queueUrl: string): Promise<number> {
    try {
      const attributes = await this.getQueueAttributes(queueUrl, [
        QueueAttributeName.ApproximateNumberOfMessages,
        QueueAttributeName.ApproximateNumberOfMessagesNotVisible,
        QueueAttributeName.ApproximateNumberOfMessagesDelayed
      ]);
      
      const visible = parseInt(attributes.ApproximateNumberOfMessages || '0');
      const notVisible = parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0');
      const delayed = parseInt(attributes.ApproximateNumberOfMessagesDelayed || '0');
      
      return visible + notVisible + delayed;
      
    } catch (error) {
      this.logger.error('Error getting approximate number of messages', error);
      throw error;
    }
  }

  async sendBatchMessages(
    queueUrl: string,
    messages: Array<{
      id: string;
      body: any;
      delaySeconds?: number;
      messageAttributes?: Record<string, any>;
    }>,
    batchSize: number = 10
  ): Promise<Array<{ id: string; messageId: string; success: boolean; error?: string }>> {
    try {
      this.logger.debug('Sending batch messages', {
        queueUrl,
        messageCount: messages.length,
        batchSize
      });

      const results: Array<{ id: string; messageId: string; success: boolean; error?: string }> = [];

      // Dividir en chunks — SQS permite máximo 10 mensajes por SendMessageBatchCommand
      for (let i = 0; i < messages.length; i += batchSize) {
        const chunk = messages.slice(i, i + batchSize);

        const entries = chunk.map((message, index) => ({
          Id: String(index),
          MessageBody: JSON.stringify(message.body),
          ...(message.delaySeconds !== undefined && { DelaySeconds: message.delaySeconds }),
          ...(message.messageAttributes && { MessageAttributes: message.messageAttributes })
        }));

        const command = new SendMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: entries
        });

        const response = await retry(() => this.client.send(command));

        // Mapear resultados exitosos
        for (const success of response.Successful ?? []) {
          const original = chunk[Number(success.Id)];
          results.push({
            id: original.id,
            messageId: success.MessageId!,
            success: true
          });
        }

        // Mapear resultados fallidos
        for (const failed of response.Failed ?? []) {
          const original = chunk[Number(failed.Id)];
          results.push({
            id: original.id,
            messageId: '',
            success: false,
            error: `${failed.Code}: ${failed.Message}`
          });
        }
      }

      return results;

    } catch (error) {
      this.logger.error('Error sending batch messages', error);
      throw error;
    }
  }

  async processMessages(
    queueUrl: string,
    processor: (message: SQSMessage) => Promise<void>,
    options: {
      maxMessages?: number;
      waitTimeSeconds?: number;
      visibilityTimeout?: number;
      stopWhenEmpty?: boolean;
      maxProcessingTime?: number;
    } = {}
  ): Promise<{ processed: number; failed: number }> {
    try {
      this.logger.debug('Processing messages', { queueUrl });
      
      const startTime = Date.now();
      const maxProcessingTime = options.maxProcessingTime || 300000; // 5 minutos por defecto
      let processed = 0;
      let failed = 0;
      
      while (Date.now() - startTime < maxProcessingTime) {
        const messages = await this.receiveMessages({
          queueUrl,
          maxNumberOfMessages: options.maxMessages,
          waitTimeSeconds: options.waitTimeSeconds,
          visibilityTimeout: options.visibilityTimeout
        });
        
        if (messages.length === 0) {
          if (options.stopWhenEmpty) {
            this.logger.debug('No messages to process, stopping');
            break;
          }
          continue;
        }
        
        // Procesar mensajes en paralelo
        const processingPromises = messages.map(async (message) => {
          try {
            await processor(message);
            await this.deleteMessage(queueUrl, message.receiptHandle);
            processed++;
            this.logger.debug('Message processed successfully', { 
              messageId: message.messageId 
            });
          } catch (error) {
            failed++;
            this.logger.error('Error processing message', { 
              messageId: message.messageId, 
              error 
            });
            
            // Cambiar visibilidad para reintentar más tarde
            try {
              await this.changeMessageVisibility(queueUrl, message.receiptHandle, 30);
            } catch (visibilityError) {
              this.logger.error('Error changing message visibility', visibilityError);
            }
          }
        });
        
        await Promise.all(processingPromises);
      }
      
      return { processed, failed };
      
    } catch (error) {
      this.logger.error('Error processing messages', error);
      throw error;
    }
  }

  private parseMessageBody(body?: string): any {
    if (!body) return null;
    
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
}
import { 
  SNSClient, 
  PublishCommand,
  CreateTopicCommand,
  DeleteTopicCommand,
  ListSubscriptionsByTopicCommand,
  SubscribeCommand,
  UnsubscribeCommand
} from '@aws-sdk/client-sns';
import { Logger, retry } from '../utils.js';
import type { SNSPublishParams } from '../types.js';

export class SNSService {
  private client: SNSClient;
  private logger: Logger;

  constructor() {
    this.client = new SNSClient({
      maxAttempts: 3,
      retryMode: 'standard'
    });
    this.logger = new Logger('SNSService');
  }

  async publishMessage(params: SNSPublishParams): Promise<string> {
    try {
      this.logger.debug('Publishing message', { 
        topicArn: params.topicArn, 
        subject: params.subject 
      });
      
      const message = typeof params.message === 'string' 
        ? params.message 
        : JSON.stringify(params.message);

      const command = new PublishCommand({
        TopicArn: params.topicArn,
        Message: message,
        Subject: params.subject,
        MessageAttributes: params.messageAttributes
      });

      const response = await retry(() => this.client.send(command));
      return response.MessageId!;
      
    } catch (error) {
      this.logger.error('Error publishing message', error);
      throw error;
    }
  }

  async publishToPhone(phoneNumber: string, message: string, senderId?: string): Promise<string> {
    try {
      this.logger.debug('Publishing to phone', { phoneNumber, senderId });
      
      const messageAttributes: Record<string, any> | undefined = senderId
        ? { 'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: senderId } }
        : undefined;

      const command = new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: message,
        MessageAttributes: messageAttributes
      });

      const response = await retry(() => this.client.send(command));
      return response.MessageId!;
      
    } catch (error) {
      this.logger.error('Error publishing to phone', error);
      throw error;
    }
  }

  async createTopic(name: string): Promise<string> {
    try {
      this.logger.debug('Creating topic', { name });
      
      const command = new CreateTopicCommand({
        Name: name
      });

      const response = await retry(() => this.client.send(command));
      return response.TopicArn!;
      
    } catch (error) {
      this.logger.error('Error creating topic', error);
      throw error;
    }
  }

  async deleteTopic(topicArn: string): Promise<void> {
    try {
      this.logger.debug('Deleting topic', { topicArn });
      
      const command = new DeleteTopicCommand({
        TopicArn: topicArn
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error deleting topic', error);
      throw error;
    }
  }

  async listSubscriptions(topicArn: string): Promise<any[]> {
    try {
      this.logger.debug('Listing subscriptions', { topicArn });
      
      const command = new ListSubscriptionsByTopicCommand({
        TopicArn: topicArn
      });

      const response = await retry(() => this.client.send(command));
      return response.Subscriptions || [];
      
    } catch (error) {
      this.logger.error('Error listing subscriptions', error);
      throw error;
    }
  }

  async subscribe(topicArn: string, protocol: string, endpoint: string): Promise<string> {
    try {
      this.logger.debug('Subscribing', { topicArn, protocol, endpoint });
      
      const command = new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: protocol,
        Endpoint: endpoint
      });

      const response = await retry(() => this.client.send(command));
      return response.SubscriptionArn!;
      
    } catch (error) {
      this.logger.error('Error subscribing', error);
      throw error;
    }
  }

  async unsubscribe(subscriptionArn: string): Promise<void> {
    try {
      this.logger.debug('Unsubscribing', { subscriptionArn });
      
      const command = new UnsubscribeCommand({
        SubscriptionArn: subscriptionArn
      });

      await retry(() => this.client.send(command));
      
    } catch (error) {
      this.logger.error('Error unsubscribing', error);
      throw error;
    }
  }
}
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { Logger, retry } from '../utils.js';

export interface SESEmailParams {
  source: string;
  toAddresses: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string[];
}

export class SESService {
  private client: SESClient;
  private logger: Logger;

  constructor() {
    this.client = new SESClient({
      maxAttempts: 3,
      retryMode: 'standard'
    });
    this.logger = new Logger('SESService');
  }

  async sendEmail(params: SESEmailParams): Promise<string> {
    try {
      this.logger.debug('Sending email', {
        source: params.source,
        toAddresses: params.toAddresses,
        subject: params.subject
      });

      const command = new SendEmailCommand({
        Source: params.source,
        Destination: {
          ToAddresses: params.toAddresses
        },
        Message: {
          Subject: { Data: params.subject },
          Body: params.html
            ? { Html: { Data: params.html } }
            : { Text: { Data: params.text || params.subject } }
        },
        ReplyToAddresses: params.replyTo
      });

      const response = await retry(() => this.client.send(command));
      return response.MessageId!;

    } catch (error) {
      this.logger.error('Error sending email', error);
      throw error;
    }
  }
}
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';
import { EmailRequest } from './models';

// Cliente SES reutilizado entre invocaciones de la misma Lambda (warm).
const sesClient = new SESClient({ region: process.env.REGION || 'us-east-2' });

export default class Service {

  static async sendEmail(payload: EmailRequest): Promise<any> {
    try {
      const from = payload.from || process.env.SES_FROM_EMAIL || 'no-reply@greip.com.pe';
      const subject = payload.subject || 'Notificacion GREIP COMPANY';
      const body = payload.html || payload.text || '';

      const command = new SendEmailCommand({
        Source: from,
        Destination: {
          ToAddresses: payload.to
        },
        ReplyToAddresses: payload.replyTo?.length ? payload.replyTo : undefined,
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: payload.html
            ? { Html: { Data: body, Charset: 'UTF-8' } }
            : { Text: { Data: body, Charset: 'UTF-8' } }
        }
      });

      const response = await sesClient.send(command);
      return ResponseFactory.success(
        { messageId: response.MessageId },
        MESSAGES_SUCCESS.PROCESS_SUCCESS
      );
    } catch (err: any) {
      console.error('sendEmail >>> ', err);
      return ResponseFactory.fromError(err);
    }
  }
}

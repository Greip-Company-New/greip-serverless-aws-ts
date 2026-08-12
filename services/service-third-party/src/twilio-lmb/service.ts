import { HttpClient, ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';
import { ConfigTercerosRepository } from '../common/repositories/config-terceros';
import { TercerosSecretsManager } from '../common/terceros-secrets';
import { limpiar, extraerMensajeProveedor } from '../common/helpers';
import { TwilioEmailRequest, TwilioSmsRequest } from './models';

const TWILIO_BASE = process.env.TWILIO_BASE_URL || 'https://api.twilio.com';
const SENDGRID_BASE = process.env.SENDGRID_BASE_URL || 'https://api.sendgrid.com';
// Cliente HTTP reutilizado entre invocaciones de la misma Lambda (warm).
const http = new HttpClient({ baseHeaders: { 'Content-Type': 'application/json' } });

function errorSinConfiguracion(proveedor: string): never {
  const error = ResponseFactory.unprocessableEntity(`El tenant no tiene configurada la integracion con ${proveedor}`);
  throw new Error(JSON.stringify(error));
}

export default class Service {

  static async sendEmail(tenant: string, payload: TwilioEmailRequest): Promise<any> {
    const secretos = new TercerosSecretsManager();
    const repo = new ConfigTercerosRepository();
    const sm = await secretos.getSecretos(tenant);
    const sendgridApiKey = limpiar(sm.twilio?.sendgridApiKey);
    if (!sendgridApiKey) {
      errorSinConfiguracion('Twilio SendGrid (email)');
    }

    const config = await repo.getConfigConDefecto(tenant);
    const fromEmail = limpiar(payload.from) || limpiar(config.twilio?.fromEmail) || '';
    const fromName = limpiar(payload.fromName) || limpiar(config.twilio?.fromName) || '';
    if (!fromEmail) {
      const error = ResponseFactory.unprocessableEntity('No hay remitente de correo configurado para el tenant');
      throw new Error(JSON.stringify(error));
    }

    const subject = payload.subject || 'Notificacion GREIP COMPANY';
    const content = payload.html
      ? [{ type: 'text/html', value: payload.html }]
      : [{ type: 'text/plain', value: payload.text || subject }];

    const body: any = {
      personalizations: payload.to.map((email) => ({
        to: [{ email }],
        subject
      })),
      from: { email: fromEmail, name: fromName || undefined },
      content
    };
    if (payload.attachments?.length) {
      body.attachments = payload.attachments.map(a => ({ content: a.content, filename: a.name, type: a.type || 'application/octet-stream', disposition: 'attachment' }));
    }
    if (payload.replyTo?.length) {
      body.reply_to = { email: payload.replyTo[0] };
    }

    try {
      const response = await http.send<any>({
        url: `${SENDGRID_BASE}/v3/mail/send`,
        method: 'POST',
        data: body,
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      const messageId = response.data?.id || '';
      const xMessageId = (response.headers as any)?.['x-message-id'] || '';
      return ResponseFactory.success({ messageId: messageId || xMessageId, provider: 'TWILIO', channel: 'EMAIL' }, MESSAGES_SUCCESS.PROCESS_SUCCESS);
    } catch (err: any) {
      console.error('SendGrid sendEmail >>> ', err?.exception?.response?.data || err?.response?.data || err);
      const mensaje = extraerMensajeProveedor(err, 'Error al enviar el correo por SendGrid');
      return ResponseFactory.fromError(err, mensaje);
    }
  }

  static async sendSms(tenant: string, payload: TwilioSmsRequest): Promise<any> {
    const secretos = new TercerosSecretsManager();
    const repo = new ConfigTercerosRepository();
    const sm = await secretos.getSecretos(tenant);
    const accountSid = limpiar(sm.twilio?.accountSid);
    const authToken = limpiar(sm.twilio?.authToken);
    if (!accountSid || !authToken) {
      errorSinConfiguracion('Twilio (SMS)');
    }

    const config = await repo.getConfigConDefecto(tenant);
    const fromPhone = limpiar(config.twilio?.fromPhone);
    if (!fromPhone) {
      const error = ResponseFactory.unprocessableEntity('No hay numero de remitente de SMS configurado para el tenant');
      throw new Error(JSON.stringify(error));
    }

    const data = new URLSearchParams({
      To: payload.phoneNumber,
      From: fromPhone,
      Body: payload.message
    });
    if (payload.mediaUrls?.length) {
      payload.mediaUrls.forEach((url) => { data.append('MediaUrl', url); });
    }

    try {
      const response = await http.send<any>({
        url: `${TWILIO_BASE}/2010-04-01/Accounts/${accountSid}/Messages.json`,
        method: 'POST',
        data,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        config: {
          auth: { username: accountSid, password: authToken }
        }
      });
      const messageId = response.data?.sid || '';
      return ResponseFactory.success({ messageId, provider: 'TWILIO', channel: 'SMS' }, MESSAGES_SUCCESS.PROCESS_SUCCESS);
    } catch (err: any) {
      console.error('Twilio sendSms >>> ', err?.exception?.response?.data || err?.response?.data || err);
      const mensaje = extraerMensajeProveedor(err, 'Error al enviar el SMS por Twilio');
      return ResponseFactory.fromError(err, mensaje);
    }
  }

}
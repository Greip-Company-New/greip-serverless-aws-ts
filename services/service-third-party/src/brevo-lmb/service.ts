import { HttpClient, ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';
import { ConfigTercerosRepository } from '../common/repositories/config-terceros';
import { TercerosSecretsManager } from '../common/terceros-secrets';
import { limpiar, extraerMensajeProveedor } from '../common/helpers';
import { BrevoEmailRequest, BrevoSmsRequest } from './models';

const BREVO_BASE = process.env.BREVO_BASE_URL || 'https://api.brevo.com';
// Cliente HTTP reutilizado entre invocaciones de la misma Lambda (warm).
const http = new HttpClient({ baseHeaders: { 'Content-Type': 'application/json' } });

function errorSinConfiguracion(proveedor: string): never {
  const error = ResponseFactory.unprocessableEntity(`El tenant no tiene configurada la integracion con ${proveedor}`);
  throw new Error(JSON.stringify(error));
}

export default class Service {

  static async sendEmail(tenant: string, payload: BrevoEmailRequest): Promise<any> {
    const secretos = new TercerosSecretsManager();
    const repo = new ConfigTercerosRepository();
    const sm = await secretos.getSecretos(tenant);
    const apiKey = limpiar(sm.brevo?.apiKey);
    if (!apiKey) {
      errorSinConfiguracion('Brevo (email)');
    }

    const config = await repo.getConfigConDefecto(tenant);
    const fromEmail = limpiar(payload.from) || limpiar(config.brevo?.fromEmail) || '';
    const fromName = limpiar(payload.fromName) || limpiar(config.brevo?.fromName) || '';
    if (!fromEmail) {
      const error = ResponseFactory.unprocessableEntity('No hay remitente de correo configurado para el tenant');
      throw new Error(JSON.stringify(error));
    }

    const body: any = {
      sender: { name: fromName || undefined, email: fromEmail },
      to: payload.to.map((email) => ({ email })),
      subject: payload.subject || 'Notificacion GREIP COMPANY',
      replyTo: payload.replyTo?.length ? { email: payload.replyTo[0] } : undefined
    };
    if (payload.attachments?.length) {
      body.attachment = payload.attachments.map(a => ({ name: a.name, content: a.content }));
    }
    if (payload.html) {
      body.htmlContent = payload.html;
    }
    if (payload.text) {
      body.textContent = payload.text;
    }
    if (!payload.html && !payload.text) {
      body.textContent = body.subject;
    }

    try {
      const response = await http.post<any>({
        url: `${BREVO_BASE}/v3/smtp/email`,
        data: body,
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          accept: 'application/json'
        }
      });
      const messageId = response.data?.messageId || response.data?.['message-id'] || '';
      return ResponseFactory.success({ messageId, provider: 'BREVO', channel: 'EMAIL' }, MESSAGES_SUCCESS.PROCESS_SUCCESS);
    } catch (err: any) {
      console.error('Brevo sendEmail >>> ', err?.exception?.response?.data || err?.response?.data || err);
      const mensaje = extraerMensajeProveedor(err, 'Error al enviar el correo por Brevo');
      return ResponseFactory.fromError(err, mensaje);
    }
  }

  static async sendSms(tenant: string, payload: BrevoSmsRequest): Promise<any> {
    const secretos = new TercerosSecretsManager();
    const repo = new ConfigTercerosRepository();
    const sm = await secretos.getSecretos(tenant);
    const apiKey = limpiar(sm.brevo?.apiKey);
    if (!apiKey) {
      errorSinConfiguracion('Brevo (SMS)');
    }

    const config = await repo.getConfigConDefecto(tenant);
    const smsSender = limpiar(config.brevo?.smsSender);
    if (!smsSender) {
      const error = ResponseFactory.unprocessableEntity('No hay remitente de SMS configurado para el tenant');
      throw new Error(JSON.stringify(error));
    }

    const body = {
      type: 'transactional',
      unicodeEnabled: true,
      sender: smsSender,
      recipient: payload.phoneNumber,
      content: payload.message
    };

    try {
      const response = await http.post<any>({
        url: `${BREVO_BASE}/v3/transactionalSMS/sms`,
        data: body,
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          accept: 'application/json'
        }
      });
      const messageId = response.data?.messageId || '';
      return ResponseFactory.success({ messageId, provider: 'BREVO', channel: 'SMS' }, MESSAGES_SUCCESS.PROCESS_SUCCESS);
    } catch (err: any) {
      console.error('Brevo sendSms >>> ', err?.exception?.response?.data || err?.response?.data || err);
      const mensaje = extraerMensajeProveedor(err, 'Error al enviar el SMS por Brevo');
      return ResponseFactory.fromError(err, mensaje);
    }
  }

}
import { SESService, SNSService, ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';
import { ConfigTercerosRepository } from '../common/repositories/config-terceros';
import { limpiar, extraerMensajeProveedor } from '../common/helpers';
import { AwsEmailRequest, AwsSmsRequest } from './models';

// Clientes AWS reutilizados entre invocaciones de la misma Lambda (warm).
const ses = new SESService();
const sns = new SNSService();

function errorSinConfiguracion(detalle: string): never {
  const error = ResponseFactory.unprocessableEntity(detalle);
  throw new Error(JSON.stringify(error));
}

export default class Service {

  static async sendEmail(tenant: string, payload: AwsEmailRequest): Promise<any> {
    const repo = new ConfigTercerosRepository();
    const config = await repo.getConfigConDefecto(tenant);
    const sesCfg = config.ses || {};

    const fromEmail = limpiar(payload.from) || limpiar(sesCfg.fromEmail);
    if (!fromEmail) {
      errorSinConfiguracion('No hay remitente de correo configurado para el tenant (SES)');
    }
    const fromName = limpiar(payload.fromName) || limpiar(sesCfg.fromName);
    const source = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
    const subject = payload.subject || 'Notificacion GREIP COMPANY';

    if (payload.attachments?.length) {
      console.warn('[aws-lmb] SES simple no soporta attachments, se omiten');
    }
    try {
      const messageId = await ses.sendEmail({
        source,
        toAddresses: payload.to,
        subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo
      });
      return ResponseFactory.success({ messageId, provider: 'SES', channel: 'EMAIL' }, MESSAGES_SUCCESS.PROCESS_SUCCESS);
    } catch (err: any) {
      console.error('SES sendEmail >>> ', err);
      const mensaje = extraerMensajeProveedor(err, 'Error al enviar el correo por SES');
      return ResponseFactory.fromError(err, mensaje);
    }
  }

  static async sendSms(tenant: string, payload: AwsSmsRequest): Promise<any> {
    const repo = new ConfigTercerosRepository();
    const config = await repo.getConfigConDefecto(tenant);
    const snsCfg = config.sns || {};
    const senderId = limpiar(snsCfg.senderId);
    const fromPhone = limpiar(snsCfg.fromPhone);

    if (!senderId && !fromPhone) {
      errorSinConfiguracion('El tenant no tiene configurado el remitente de SMS (SNS)');
    }

    try {
      const messageId = await sns.publishToPhone(payload.phoneNumber, payload.message, senderId);
      return ResponseFactory.success({ messageId, provider: 'SNS', channel: 'SMS' }, MESSAGES_SUCCESS.PROCESS_SUCCESS);
    } catch (err: any) {
      console.error('SNS sendSms >>> ', err);
      const mensaje = extraerMensajeProveedor(err, 'Error al enviar el SMS por SNS');
      return ResponseFactory.fromError(err, mensaje);
    }
  }

}
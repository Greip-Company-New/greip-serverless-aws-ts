import { ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';
import { ConfigTercerosRepository } from '../common/repositories/config-terceros';
import { TercerosSecretsManager } from '../common/terceros-secrets';
import { ConfigProveedorDynamo, configVacia, SecretoTerceros } from '../common/models';
import { enmascarar, esValorEnmascarado, limpiar } from '../common/helpers';
import { ConfigTercerosInput, ConfigTercerosOutput } from './models';

const REGION_DEFECTO = process.env.REGION || 'us-east-2';

export default class Service {

  static async getConfig(tenant: string): Promise<ConfigTercerosOutput> {
    const repo = new ConfigTercerosRepository();
    const secretos = new TercerosSecretsManager();
    const config = await repo.getConfigConDefecto(tenant);
    const sm = await secretos.getSecretos(tenant);
    const brevo = config.brevo || {};
    const twilio = config.twilio || {};
    const ses = config.ses || {};
    const sns = config.sns || {};

    return {
      tenant,
      emailProvider: config.emailProvider,
      smsProvider: config.smsProvider,
      brevo: {
        enabled: Boolean(brevo.enabled),
        apiKey: enmascarar(sm.brevo?.apiKey),
        fromEmail: brevo.fromEmail || '',
        fromName: brevo.fromName || '',
        smsSender: brevo.smsSender || ''
      },
      twilio: {
        enabled: Boolean(twilio.enabled),
        accountSid: enmascarar(sm.twilio?.accountSid),
        authToken: enmascarar(sm.twilio?.authToken),
        sendgridApiKey: enmascarar(sm.twilio?.sendgridApiKey),
        fromPhone: twilio.fromPhone || '',
        fromEmail: twilio.fromEmail || '',
        fromName: twilio.fromName || ''
      },
      ses: {
        enabled: Boolean(ses.enabled),
        fromEmail: ses.fromEmail || '',
        fromName: ses.fromName || '',
        region: ses.region || REGION_DEFECTO
      },
      sns: {
        enabled: Boolean(sns.enabled),
        senderId: sns.senderId || '',
        fromPhone: sns.fromPhone || '',
        region: sns.region || REGION_DEFECTO
      },
      dub: {
        apiKey: enmascarar(sm.dub?.apiKey),
        workspaceId: enmascarar(sm.dub?.workspaceId),
        domain: sm.dub?.domain || ''
      },
      updatedAt: config.updatedAt || ''
    };
  }

  static async setConfig(tenant: string, input: ConfigTercerosInput, actor: string, channel: string = ''): Promise<ConfigTercerosOutput> {
    const repo = new ConfigTercerosRepository();
    const secretos = new TercerosSecretsManager();
    const actual = await repo.getConfig(tenant) || configVacia(tenant);
    const smActual = await secretos.getSecretos(tenant);

    // 1) Credenciales: conservar valor previo cuando se reenvia el valor enmascarado.
    const brevoSecrets = {
      apiKey: limpiar(input.brevo?.apiKey)
        ? (esValorEnmascarado(input.brevo?.apiKey) ? smActual.brevo?.apiKey : limpiar(input.brevo?.apiKey))
        : smActual.brevo?.apiKey
    };

    const twilioSecrets = {
      accountSid: limpiar(input.twilio?.accountSid)
        ? (esValorEnmascarado(input.twilio?.accountSid) ? smActual.twilio?.accountSid : limpiar(input.twilio?.accountSid))
        : smActual.twilio?.accountSid,
      authToken: limpiar(input.twilio?.authToken)
        ? (esValorEnmascarado(input.twilio?.authToken) ? smActual.twilio?.authToken : limpiar(input.twilio?.authToken))
        : smActual.twilio?.authToken,
      sendgridApiKey: limpiar(input.twilio?.sendgridApiKey)
        ? (esValorEnmascarado(input.twilio?.sendgridApiKey) ? smActual.twilio?.sendgridApiKey : limpiar(input.twilio?.sendgridApiKey))
        : smActual.twilio?.sendgridApiKey
    };

    const dubSecrets = {
      apiKey: limpiar(input.dub?.apiKey)
        ? (esValorEnmascarado(input.dub?.apiKey) ? smActual.dub?.apiKey : limpiar(input.dub?.apiKey))
        : smActual.dub?.apiKey,
      workspaceId: limpiar(input.dub?.workspaceId)
        ? (esValorEnmascarado(input.dub?.workspaceId) ? smActual.dub?.workspaceId : limpiar(input.dub?.workspaceId))
        : smActual.dub?.workspaceId,
      domain: limpiar(input.dub?.domain) || smActual.dub?.domain
    };

    const secretosNuevos: SecretoTerceros = {
      brevo: { apiKey: brevoSecrets.apiKey },
      twilio: {
        accountSid: twilioSecrets.accountSid,
        authToken: twilioSecrets.authToken,
        sendgridApiKey: twilioSecrets.sendgridApiKey
      },
      dub: {
        apiKey: dubSecrets.apiKey,
        workspaceId: dubSecrets.workspaceId,
        domain: dubSecrets.domain
      }
    };

    if (brevoSecrets.apiKey || twilioSecrets.accountSid || twilioSecrets.authToken || twilioSecrets.sendgridApiKey || dubSecrets.apiKey || dubSecrets.workspaceId) {
      await secretos.guardarSecretos(tenant, secretosNuevos);
    }

    // 2) Configuracion (metadatos no secretos) en DynamoDB.
    const ahora = new Date().toISOString();
    const region = limpiar(input.ses?.region) || limpiar(input.sns?.region) || REGION_DEFECTO;
    const config: ConfigProveedorDynamo = {
      pk: `TENANT#${tenant}`,
      sk: 'CONFIG',
      tenant,
      emailProvider: input.emailProvider || actual.emailProvider || 'BREVO',
      smsProvider: input.smsProvider || actual.smsProvider || 'BREVO',
      brevo: {
        enabled: typeof input.brevo?.enabled === 'boolean' ? input.brevo.enabled : Boolean(actual.brevo?.enabled),
        fromEmail: limpiar(input.brevo?.fromEmail) || actual.brevo?.fromEmail,
        fromName: limpiar(input.brevo?.fromName) || actual.brevo?.fromName,
        smsSender: limpiar(input.brevo?.smsSender) || actual.brevo?.smsSender
      },
      twilio: {
        enabled: typeof input.twilio?.enabled === 'boolean' ? input.twilio.enabled : Boolean(actual.twilio?.enabled),
        fromPhone: limpiar(input.twilio?.fromPhone) || actual.twilio?.fromPhone,
        fromEmail: limpiar(input.twilio?.fromEmail) || actual.twilio?.fromEmail,
        fromName: limpiar(input.twilio?.fromName) || actual.twilio?.fromName
      },
      ses: {
        enabled: typeof input.ses?.enabled === 'boolean' ? input.ses.enabled : Boolean(actual.ses?.enabled),
        fromEmail: limpiar(input.ses?.fromEmail) || actual.ses?.fromEmail,
        fromName: limpiar(input.ses?.fromName) || actual.ses?.fromName,
        region: limpiar(input.ses?.region) || actual.ses?.region || region
      },
      sns: {
        enabled: typeof input.sns?.enabled === 'boolean' ? input.sns.enabled : Boolean(actual.sns?.enabled),
        senderId: limpiar(input.sns?.senderId) || actual.sns?.senderId,
        fromPhone: limpiar(input.sns?.fromPhone) || actual.sns?.fromPhone,
        region: limpiar(input.sns?.region) || actual.sns?.region || region
      },
      createdBy: actual.createdBy || actor || 'SYSTEM',
      createdByChannel: actual.createdByChannel || channel,
      createdAt: actual.createdAt || ahora,
      updatedBy: actor || 'SYSTEM',
      updatedByChannel: channel,
      updatedAt: ahora
    };

    await repo.saveConfig(config);

    const response = await Service.getConfig(tenant);
    return response;
  }

  static async validarDisponibilidad(tenant: string): Promise<any> {
    const secretos = new TercerosSecretsManager();
    const sm = await secretos.getSecretos(tenant);
    return ResponseFactory.success(
      {
        tenant,
        brevo: { configurado: Boolean(sm.brevo?.apiKey) },
        twilio: { configurado: Boolean(sm.twilio?.accountSid && sm.twilio?.authToken) },
        dub: { configurado: Boolean(sm.dub?.apiKey) },
        ses: { configurado: true },
        sns: { configurado: true }
      },
      MESSAGES_SUCCESS.PROCESS_SUCCESS
    );
  }

}
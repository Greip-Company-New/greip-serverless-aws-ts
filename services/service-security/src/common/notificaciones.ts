// Envio de correos transaccionales via service-third-party (Brevo por defecto).
import { LambdaService } from 'ly-nodejs-ts-common';

export interface CorreoTransaccional {
  to: string[];
  tenant?: string;
  subject?: string;
  template?: 'otp' | 'emailVerification' | 'passwordRecovery' | 'welcome';
  templateData?: Record<string, any>;
  from?: string;
  fromName?: string;
}

const nombreLambdaBrevo = () => process.env.LMB_BREVO || 'SRV-THYRD-LMB-BREVO';

/** Envia via Brevo (service-third-party) respetando la config del tenant. Fire-and-forget. */
export function enviarCorreoTerceros(tenant: string, to: string[], subject: string, html: string): void {
  const lambdaService = new LambdaService();
  lambdaService.invokeLambda({
    functionName: nombreLambdaBrevo(),
    payload: {
      origin: 'LAMBDA_EVENT',
      action: 'sendEmail',
      payload: { to, subject, html, tenantCode: tenant }
    }
  }).catch((err) => {
    console.error('[notificaciones] envio por Brevo fallo (no bloquea)', subject, err?.message || err);
  });
}
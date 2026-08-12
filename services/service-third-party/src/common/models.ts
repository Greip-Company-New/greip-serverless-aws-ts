// Modelos de datos de service-third-party (GREIP COMPANY).
import { Proveedor } from './config';

// ---- Configuracion de proveedores por tenant (DynamoDB TBL_GREIP_TERCEROS_CONFIG) ----

export interface ConfigProveedorDynamo {
  pk: string;                // TENANT#<tenant>
  sk: string;                // CONFIG
  tenant: string;            // codigo del tenant (ej. GREIP)
  emailProvider: Proveedor;  // proveedor active para enviar EMAIL
  smsProvider: Proveedor;    // proveedor activo para enviar SMS
  brevo: {
    enabled: boolean;
    fromEmail?: string;
    fromName?: string;
    smsSender?: string;
  };
  twilio: {
    enabled: boolean;
    fromPhone?: string;
    fromEmail?: string;
    fromName?: string;
  };
  ses: {
    enabled: boolean;
    fromEmail?: string;
    fromName?: string;
    region?: string;
  };
  sns: {
    enabled: boolean;
    senderId?: string;
    fromPhone?: string;
    region?: string;
  };
  createdBy: string;
  createdByChannel?: string;
  createdAt: string;
  updatedBy: string;
  updatedByChannel?: string;
  updatedAt: string;
}

// ---- Credenciales almacenadas en AWS Secrets Manager: Greip/ThirdParty/<tenant> ----

export interface BrevoSecrets {
  apiKey?: string;
}

export interface TwilioSecrets {
  accountSid?: string;
  authToken?: string;
  sendgridApiKey?: string;
}

export interface DubSecrets {
  apiKey?: string;
  workspaceId?: string;
  domain?: string;
}

export interface SecretoTerceros {
  brevo?: BrevoSecrets;
  twilio?: TwilioSecrets;
  dub?: DubSecrets;
}

export function configVacia(tenant: string): ConfigProveedorDynamo {
  const ahora = new Date().toISOString();
  return {
    pk: `TENANT#${tenant}`,
    sk: 'CONFIG',
    tenant,
    emailProvider: 'BREVO',
    smsProvider: 'BREVO',
    brevo: { enabled: false },
    twilio: { enabled: false },
    ses: { enabled: false },
    sns: { enabled: false },
    createdBy: 'SYSTEM',
    createdAt: ahora,
    updatedBy: 'SYSTEM',
    updatedAt: ahora
  };
}
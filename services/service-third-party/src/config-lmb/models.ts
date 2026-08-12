// Modelos de entrada/salida de CONFIG_LMB (management de proveedores de notificacion).
import { Proveedor } from '../common/config';

export interface ParametrosBrevo {
  enabled?: boolean;
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
  smsSender?: string;
}

export interface ParametrosTwilio {
  enabled?: boolean;
  accountSid?: string;
  authToken?: string;
  sendgridApiKey?: string;
  fromPhone?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface ParametrosSes {
  enabled?: boolean;
  fromEmail?: string;
  fromName?: string;
  region?: string;
}

export interface ParametrosSns {
  enabled?: boolean;
  senderId?: string;
  fromPhone?: string;
  region?: string;
}

export interface ParametrosDub {
  apiKey?: string;
  workspaceId?: string;
  domain?: string;
}

export interface ConfigTercerosInput {
  emailProvider?: Proveedor;
  smsProvider?: Proveedor;
  brevo?: ParametrosBrevo;
  twilio?: ParametrosTwilio;
  ses?: ParametrosSes;
  sns?: ParametrosSns;
  dub?: ParametrosDub;
}

export interface ConfigTercerosOutput {
  tenant: string;
  emailProvider: Proveedor;
  smsProvider: Proveedor;
  brevo: {
    enabled: boolean;
    apiKey: string;      // enmascarada
    fromEmail: string;
    fromName: string;
    smsSender: string;
  };
  twilio: {
    enabled: boolean;
    accountSid: string;  // enmascarado
    authToken: string;   // enmascarado
    sendgridApiKey: string; // enmascarado
    fromPhone: string;
    fromEmail: string;
    fromName: string;
  };
  ses: {
    enabled: boolean;
    fromEmail: string;
    fromName: string;
    region: string;
  };
  sns: {
    enabled: boolean;
    senderId: string;
    fromPhone: string;
    region: string;
  };
  dub: {
    apiKey: string;       // enmascarada
    workspaceId: string;  // enmascarado
    domain: string;
  };
  updatedAt: string;
}
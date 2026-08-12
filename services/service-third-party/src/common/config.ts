// Constantes globales de service-third-party (GREIP COMPANY).

export const PROVEEDOR_BREVO = 'BREVO';
export const PROVEEDOR_TWILIO = 'TWILIO';
export const PROVEEDOR_SES = 'SES';
export const PROVEEDOR_SNS = 'SNS';
export const PROVEEDORES = [
  PROVEEDOR_BREVO,
  PROVEEDOR_TWILIO,
  PROVEEDOR_SES,
  PROVEEDOR_SNS
] as const;

export type Proveedor = typeof PROVEEDORES[number];

export const CANAL_EMAIL = 'EMAIL';
export const CANAL_SMS = 'SMS';

// Proveedor por defecto cuando el tenant aun no configura sus preferencias.
export const PROVEEDOR_DEFECTO = PROVEEDOR_BREVO;

// Prefijo de los secretos en AWS Secrets Manager: Greip/ThirdParty/<tenant>
export function secretTercerosPrefijo(): string {
  return process.env.SM_THIRDPARTY_PREFIX || 'Greip/ThirdParty';
}

export function nombreSecreto(tenant: string): string {
  return `${secretTercerosPrefijo()}/${tenant}`;
}

export function tablaTercerosConfig(): string {
  return process.env.TABLA_TERCEROS_CONFIG || 'TBL_GREIP_TERCEROS_CONFIG_DEV';
}

export const STAGE_SEPARADOR = '#';

// MFA/Otp no aplican a este servicio; se mantienen aqui por compatibilidad.
export const STATUS_ACTIVE = 'A';
export const STATUS_INACTIVE = 'I';
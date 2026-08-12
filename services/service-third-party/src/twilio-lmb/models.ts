// Modelos de entrada/salida de TWILIO_LMB (envio de notificaciones por Twilio/SendGrid).
export interface TwilioEmailRequest {
  to: string[];
  subject?: string;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string[];
  /** Solo para llamadas internas (sin token). */
  tenantCode?: string;
  headers?: Record<string, any>;
  attachments?: Array<{ name: string; content: string; type?: string }>;
}

export interface TwilioSmsRequest {
  phoneNumber: string;
  message: string;
  mediaUrls?: string[];
  /** Solo para llamadas internas (sin token). */
  tenantCode?: string;
  headers?: Record<string, any>;
}
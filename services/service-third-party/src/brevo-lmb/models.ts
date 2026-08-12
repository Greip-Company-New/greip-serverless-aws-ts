// Modelos de entrada/salida de BREVO_LMB (envio de notificaciones por Brevo).
export interface BrevoEmailRequest {
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

export interface BrevoSmsRequest {
  phoneNumber: string;
  message: string;
  /** Solo para llamadas internas (sin token). */
  tenantCode?: string;
  headers?: Record<string, any>;
}
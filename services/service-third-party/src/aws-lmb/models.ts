// Modelos de entrada/salida de AWS_LMB (envio de notificaciones por AWS SES/SNS).
export interface AwsEmailRequest {
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

export interface AwsSmsRequest {
  phoneNumber: string;
  message: string;
  /** Solo para llamadas internas (sin token). */
  tenantCode?: string;
  headers?: Record<string, any>;
}
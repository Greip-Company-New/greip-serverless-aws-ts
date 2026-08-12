// Modelos de entrada/salida de SHORTLINK_LMB (acortamiento de URLs con Dub.co).
export interface ShortenUrlRequest {
  url: string;
  key?: string;
  domain?: string;
  /** Solo para llamadas internas (sin token). */
  tenantCode?: string;
  headers?: Record<string, any>;
}
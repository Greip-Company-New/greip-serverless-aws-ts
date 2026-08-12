// Utilidad de acortamiento de URLs con Dub.co para service-third-party.
// Crea un link corto apuntando a la URL original via la API publica de Dub:
//   POST https://api.dub.co/links   (Authorization: Bearer <apiKey>)
// La API key se lee del secreto AWS: Greip/ThirdParty/<tenant> -> { dub: { apiKey } }
import { HttpClient } from 'ly-nodejs-ts-common';
import { TercerosSecretsManager } from './terceros-secrets';
import { limpiar } from './helpers';

const DUB_BASE = process.env.DUB_BASE_URL || 'https://api.dub.co';

// Cliente HTTP reutilizado entre invocaciones de la misma Lambda (warm).
const http = new HttpClient({ baseHeaders: { 'Content-Type': 'application/json' } });

export interface ShortlinkResult {
  originalUrl: string;
  shortUrl: string;
  id?: string;
  domain?: string;
  key?: string;
}

export interface OpcionesAcortar {
  key?: string;
  domain?: string;
  workspaceId?: string;
}

/** Lee la configuracion de Dub.co (apiKey/workspaceId/domain) del secreto del tenant. */
export async function obtenerConfigDub(tenant: string): Promise<{ apiKey?: string; workspaceId?: string; domain?: string }> {
  const secretos = new TercerosSecretsManager();
  const sm = await secretos.getSecretos(tenant);
  return {
    apiKey: limpiar(sm.dub?.apiKey),
    workspaceId: limpiar(sm.dub?.workspaceId),
    domain: limpiar(sm.dub?.domain)
  };
}

/** Confirma que el tenant tiene una API key de Dub.co configurada. */
export async function dubConfigurado(tenant: string): Promise<boolean> {
  return Boolean((await obtenerConfigDub(tenant)).apiKey);
}

/**
 * Acorta una URL con Dub.co. Retorna el short link (campo `shortLink` de la
 * respuesta). Lanza los errores del proveedor para que el llamador decida.
 */
export async function acortarUrl(
  tenant: string,
  url: string,
  opciones: OpcionesAcortar = {}
): Promise<ShortlinkResult> {
  const config = await obtenerConfigDub(tenant);
  if (!config.apiKey) {
    throw new Error('No hay API key de Dub.co configurada para el tenant');
  }

  const body: any = { url };
  if (opciones.domain || config.domain) {
    body.domain = opciones.domain || config.domain;
  }
  if (opciones.key) {
    body.key = opciones.key;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    accept: 'application/json'
  };
  const workspaceId = opciones.workspaceId || config.workspaceId;
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';

  const response = await http.post<any>({
    url: `${DUB_BASE}/links${query}`,
    data: body,
    headers
  });

  const data = response?.data || {};
  const shortUrl = typeof data.shortLink === 'string' && data.shortLink.trim() ? data.shortLink.trim() : '';
  if (!shortUrl) {
    throw new Error('Dub.co no devolvio un short link (campo shortLink)');
  }

  return {
    originalUrl: url,
    shortUrl,
    id: data.id,
    domain: data.domain,
    key: data.key
  };
}
// Utilidades compartidas de service-third-party (GREIP COMPANY).

// Enmascara un secreto para devolverlo en respuestas de lectura,
// evitando exponer credenciales completas al frontend.
export function enmascarar(valor?: string): string {
  if (!valor) {
    return '';
  }
  if (valor.length <= 8) {
    return '••••••••';
  }
  const inicio = valor.slice(0, 4);
  const fin = valor.slice(-4);
  return `${inicio}••••••${fin}`;
}

// Un valor enmascarado se mantiene solo si el cliente lo reenvio tal cual
// (p.ej. al guardar la config completa sin reescribir la API key).
export function esValorEnmascarado(valor?: string): boolean {
  return !!valor && /[•*]{4,}/.test(valor);
}

export function limpiar(valor?: string): string | undefined {
  const v = (valor || '').trim();
  return v.length ? v : undefined;
}

// Extrae el mensaje de error real que devuelve el proveedor (Brevo/SendGrid/
// Twilio/AWS) en lugar de mostrar el generico "Request failed..." o el 500.
// HttpClient (ly-nodejs-ts-common) lanza el objeto AppException donde el error
// original de axios queda en .exception; los errores del SDK de AWS llegan como
// Error con .message y .name.
function mensajeDeData(data: any): string | undefined {
  if (typeof data === 'string') {
    return data.trim() ? data.trim() : undefined;
  }
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }
  if (Array.isArray(data.errors) && data.errors.length) {
    const e0 = data.errors[0] || {};
    const m = e0.message || e0.detail || e0.description || e0.error_description;
    if (typeof m === 'string' && m.trim()) {
      return m.trim();
    }
  }
  if (typeof data.error === 'string' && data.error.trim() && data.error.trim() !== 'error') {
    return data.error.trim();
  }
  if (data.error && typeof data.error === 'object' && typeof data.error.message === 'string' && data.error.message.trim()) {
    return data.error.message.trim();
  }
  if (typeof data.error_description === 'string' && data.error_description.trim()) {
    return data.error_description.trim();
  }
  if (typeof data.code === 'string' && typeof data.message === 'string' && data.message.trim()) {
    return `${data.code}: ${data.message.trim()}`;
  }
  return undefined;
}

export function extraerMensajeProveedor(err: any, fallback: string): string {
  try {
    const exception = err?.exception;
    const response = err?.response || exception?.response;
    const deData = mensajeDeData(response?.data);
    if (deData) {
      return deData;
    }
    const msg = err?.message || exception?.message;
    if (typeof msg === 'string' && msg.trim() && !msg.startsWith('{')) {
      if (!/^request failed with status code/i.test(msg)) {
        return msg.trim();
      }
    }
  } catch (e) {
    // se ignora y se usa el fallback
  }
  return fallback;
}
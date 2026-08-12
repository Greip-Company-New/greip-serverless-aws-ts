// Resolucion del tenant: si se recibe un tenantCode explicito (body/query) se usa
// (para que usuarios con permisos de gestion puedan operar la config de otra empresa);
// si no, se deriva de la identidad del JWT.
// El tenant define que configuracion de terceros se usa para cada empresa.

export function resolverTenant(payload: any): string {
  const porQuery = payload?.query?.tenantCode || payload?.query?.tenant;
  const porPayload = payload?.tenantCode || payload?.tenant || porQuery;
  if (porPayload) {
    return String(porPayload).toUpperCase();
  }

  const porIdentidad = payload?.identity?.tenant;
  if (porIdentidad) {
    return String(porIdentidad).toUpperCase();
  }

  throw new Error(JSON.stringify({
    success: false,
    statusCode: 400,
    message: 'No se pudo determinar el tenant: token o tenantCode requerido'
  }));
}

export function actorPayload(payload: any): string {
  const identity = payload?.identity;
  return identity?.sub || identity?.email || payload?.actor || 'SYSTEM';
}
// Middleware de autorizacion RBAC: valida permisos desde la identidad del JWT.
export interface RbacMiddlewareOptions {
  permissionsByAction: Record<string, string[]>;
}

export default function RbacMiddleware(options: RbacMiddlewareOptions) {
  return {
    before: async (handler: any) => {
      const { action, payload } = handler.event;
      const requeridos = options.permissionsByAction[action];
      if (!requeridos || requeridos.length === 0) {
        return;
      }

      const identity = payload?.identity;
      if (!identity) {
        const err = new Error(JSON.stringify({ success: false, statusCode: 401, message: 'No autenticado' }));
        (err as any).httpStatus = 401;
        throw err;
      }

      const permissions = identity.permissions || [];
      const permitido = requeridos.every((permiso) => permissions.includes(permiso));
      if (!permitido) {
        const err = new Error(JSON.stringify({ success: false, statusCode: 403, message: 'No tiene permisos para esta operacion' }));
        (err as any).httpStatus = 403;
        throw err;
      }
    }
  };
}

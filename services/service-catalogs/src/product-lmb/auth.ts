// Middleware de autenticacion: valida el Bearer token JWT y expone payload.identity.
import { verifyToken } from './token';

export default function AuthMiddleware(options: { exclude?: string[] } = {}) {
  const exclude = new Set(options.exclude || []);

  return {
    before: async (handler: any) => {
      const { action, payload } = handler.event;
      if (exclude.has(action)) {
        return;
      }

      const headers = payload?.headers || {};
      const authHeader = headers['Authorization'] || headers['authorization'] || '';
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const err = new Error(JSON.stringify({ success: false, statusCode: 401, message: 'Token de acceso es obligatorio' }));
        (err as any).httpStatus = 401;
        throw err;
      }

      const token = authHeader.replace('Bearer ', '');
      let identity: any;
      try {
        identity = await verifyToken(token);
      } catch (error) {
        const err = new Error(JSON.stringify({ success: false, statusCode: 401, message: 'Token invalido o expirado' }));
        (err as any).httpStatus = 401;
        throw err;
      }

      if (identity.type !== 'ACCESS') {
        const err = new Error(JSON.stringify({ success: false, statusCode: 401, message: 'Token no valido para esta operacion' }));
        (err as any).httpStatus = 401;
        throw err;
      }

      const requestChannel = headers['channel'] || headers['Channel'] || headers['Canal'] || headers['canal'] || '';
      if (!requestChannel) {
        const err = new Error(JSON.stringify({ success: false, statusCode: 400, message: 'Header channel es obligatorio' }));
        (err as any).httpStatus = 400;
        throw err;
      }
      if (identity.channel && identity.channel !== requestChannel) {
        const err = new Error(JSON.stringify({ success: false, statusCode: 401, message: `Token generado para el canal ${identity.channel}, no valido para ${requestChannel}` }));
        (err as any).httpStatus = 401;
        throw err;
      }

      handler.event.payload = { ...payload, identity };
    }
  };
}

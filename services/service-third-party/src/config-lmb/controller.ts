import Service from './service';
import Validate from './validate';
import { ResponseFactory, MESSAGES_ERROR } from 'ly-nodejs-ts-common';
import { resolverTenant, actorPayload } from '../common/tenant';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-CONFIG';

function channelHeader(payload: any): string {
  const headers = payload?.headers || {};
  return headers['channel'] || headers['Channel'] || headers['canal'] || headers['Canal'] || '';
}

export default {

  async getConfig(payload: any) {
    const methodName = 'getConfig';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.getConfig(payload);
    } catch (error: any) {
      const result = ResponseFactory.badRequest(MESSAGES_ERROR.BAD_REQUEST, error?.message || error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }

    try {
      const tenant = resolverTenant(payload);
      const result = ResponseFactory.success(await Service.getConfig(tenant), 'Configuracion de notificaciones');
      result.requestId = payload?.requestId;
      return result;
    } catch (error: any) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
      const result = ResponseFactory.fromError(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
  },

  async setConfig(payload: any) {
    const methodName = 'setConfig';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.setConfig(payload);
    } catch (error: any) {
      const details = Array.isArray(error) ? error : [error?.message || 'Error de validación'];
      const result = ResponseFactory.badRequest(`Error de validación: ${details.join('; ')}`, { errors: details });
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }

    try {
      const tenant = resolverTenant(payload);
      const actor = actorPayload(payload);
      const result = ResponseFactory.success(
        await Service.setConfig(tenant, payload, actor, channelHeader(payload)),
        'Configuracion de notificaciones guardada'
      );
      result.requestId = payload?.requestId;
      return result;
    } catch (error: any) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
      const result = ResponseFactory.fromError(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
  },

}
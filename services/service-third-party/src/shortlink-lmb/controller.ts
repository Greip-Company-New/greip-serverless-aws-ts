import Service from './service';
import Validate from './validate';
import { ResponseFactory } from 'ly-nodejs-ts-common';
import { resolverTenant } from '../common/tenant';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-SHORTLINK';

export default {

  async shortenUrl(payload: any) {
    const methodName = 'shortenUrl';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.shortenUrl(payload);
    } catch (error: any) {
      const details = Array.isArray(error) ? error : [error?.message || 'Error de validación'];
      const result = ResponseFactory.badRequest(`Error de validación: ${details.join('; ')}`, { errors: details });
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }

    try {
      const tenant = resolverTenant(payload);
      const result = await Service.shortenUrl(tenant, payload);
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
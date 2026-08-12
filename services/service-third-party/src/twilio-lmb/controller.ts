import Service from './service';
import Validate from './validate';
import { ResponseFactory } from 'ly-nodejs-ts-common';
import { resolverTenant } from '../common/tenant';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-TWILIO';

export default {

  async sendEmail(payload: any) {
    const methodName = 'sendEmail';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.sendEmail(payload);
    } catch (error: any) {
      const details = Array.isArray(error) ? error : [error?.message || 'Error de validación'];
      const result = ResponseFactory.badRequest(`Error de validación: ${details.join('; ')}`, { errors: details });
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }

    try {
      const tenant = resolverTenant(payload);
      const result = await Service.sendEmail(tenant, payload);
      result.requestId = payload?.requestId;
      return result;
    } catch (error: any) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
      const result = ResponseFactory.fromError(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
  },

  async sendSms(payload: any) {
    const methodName = 'sendSms';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.sendSms(payload);
    } catch (error: any) {
      const details = Array.isArray(error) ? error : [error?.message || 'Error de validación'];
      const result = ResponseFactory.badRequest(`Error de validación: ${details.join('; ')}`, { errors: details });
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }

    try {
      const tenant = resolverTenant(payload);
      const result = await Service.sendSms(tenant, payload);
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
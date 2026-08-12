import Service from './service';
import Validate from './validate';
import { ResponseFactory, MESSAGES_ERROR } from 'ly-nodejs-ts-common';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-TOKEN';

export default {

  async encryptTokenData(payload: any) {
    const methodName = 'encryptTokenData';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.encryptTokenData(payload);
    } catch (error: any) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Validation Error`, error);
      const result = ResponseFactory.badRequest(MESSAGES_ERROR.BAD_REQUEST);
      result.requestId = payload.requestId;
      throw new Error(JSON.stringify(result));
    }

    try {
      const result = await Service.encryptTokenData(payload);
      result.requestId = payload.requestId;
      return result;
    } catch (error: any) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
      const result = ResponseFactory.fromError(error);
      result.requestId = payload.requestId;
      throw new Error(JSON.stringify(result));
    }
  },

  async decryptTokenData(payload: any) {
    const methodName = 'decryptTokenData';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.decryptTokenData(payload);
    } catch (error: any) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Validation Error`, error);
      const result = ResponseFactory.badRequest(MESSAGES_ERROR.BAD_REQUEST);
      result.requestId = payload.requestId;
      throw new Error(JSON.stringify(result));
    }

    try {
      const result = await Service.decryptTokenData(payload);
      result.requestId = payload.requestId;
      return result;
    } catch (error: any) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
      const result = ResponseFactory.fromError(error);
      result.requestId = payload.requestId;
      throw new Error(JSON.stringify(result));
    }
  },

}

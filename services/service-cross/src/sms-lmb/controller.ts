import Service from './service';
import Validate from './validate';
import { ResponseFactory, MESSAGES_ERROR } from 'ly-nodejs-ts-common';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-SMS';

export default {

  async sendSms(payload: any) {
    const methodName = 'sendSms';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.sendSms(payload);
    } catch (error: any) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Validation Error`, error);
      const result = ResponseFactory.badRequest(MESSAGES_ERROR.BAD_REQUEST);
      result.requestId = payload.requestId;
      throw new Error(JSON.stringify(result));
    }

    try {
      const result = await Service.sendSms(payload);
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

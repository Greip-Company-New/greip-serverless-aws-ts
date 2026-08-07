import Service from './service';
import Validate from './validate';
import { ResponseFactory, MESSAGES_ERROR } from 'ly-nodejs-ts-common';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-EMAIL';

export default {

  async sendEmail(payload: any) {
    const methodName = 'sendEmail';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.sendEmail(payload);
    } catch (error: any) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Validation Error`, error);
      const result = ResponseFactory.badRequest(MESSAGES_ERROR.BAD_REQUEST);
      result.requestId = payload.requestId;
      throw new Error(JSON.stringify(result));
    }

    try {
      const result = await Service.sendEmail(payload);
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

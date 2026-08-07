import Service from './service';
import Validate from './validate';
import { ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-AUDIT';
const service = new Service();

function badRequest(methodName: string, payload: any, error: any): never {
  console.error(`[${LAMBDA_NAME}] ${methodName} | Validation Error`, error);
  const result = ResponseFactory.badRequest(error);
  result.requestId = payload?.requestId;
  throw new Error(JSON.stringify(result));
}

function errorResponse(methodName: string, payload: any, error: any): never {
  console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
  const result = ResponseFactory.fromError(error);
  result.requestId = payload?.requestId;
  throw new Error(JSON.stringify(result));
}

export default {
  async listAudit(payload: any) {
    const methodName = 'listAudit';
    try {
      await Validate.listAudit(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const data = await service.listAudit(payload);
      const result = ResponseFactory.paginated(data.data, data.total, Number(payload.page) || 1, Number(payload.pageSize) || 10);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async getAudit(payload: any) {
    const methodName = 'getAudit';
    try {
      await Validate.getAudit(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.getAudit(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  }
};

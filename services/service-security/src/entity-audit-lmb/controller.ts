import Service from './service';
import Validate from './validate';
import { ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-ENTITY-AUDIT';

export default {

  async listChanges(payload: any) {
    const methodName = 'listChanges';
    try {
      await Validate.listChanges(payload);
    } catch (error: any) {
      const result = ResponseFactory.badRequest(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
    try {
      const data = await Service.listChanges({
        entity: payload.entity,
        entityKey: String(payload.entityKey),
        tenantId: payload.tenantId,
        action: payload.action,
        sourceIp: payload.sourceIp,
        userAgent: payload.userAgent,
        page: payload.page,
        pageSize: payload.pageSize
      });
      const result = ResponseFactory.paginated(data.data, data.total, Number(payload.page) || 1, Number(payload.pageSize) || 10, MESSAGES_SUCCESS.READ_SUCCESS);
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

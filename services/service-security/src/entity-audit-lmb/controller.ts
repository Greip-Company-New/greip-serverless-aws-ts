import Service from './service';
import { ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-ENTITY-AUDIT';

export default {

  async registerChange(payload: any) {
    const methodName = 'registerChange';
    try {
      const row = await Service.registerChange({
        entity: payload.entity,
        entityKey: String(payload.entityKey),
        tenantId: payload.tenantId,
        changeType: payload.changeType,
        status: payload.status,
        userId: payload.userId,
        channel: payload.channel,
        changes: payload.changes
      });
      return ResponseFactory.success({ id: row.id }, MESSAGES_SUCCESS.PROCESS_SUCCESS);
    } catch (error: any) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
      const result = ResponseFactory.fromError(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
  },

}

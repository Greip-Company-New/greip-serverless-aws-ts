import Service from './service';
import Validate from './validate';
import { ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-AUTH';
const service = new Service();

function errorResponse(methodName: string, payload: any, error: any): never {
  console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
  const result = ResponseFactory.fromError(error);
  result.requestId = payload?.requestId;
  throw new Error(JSON.stringify(result));
}

export default {
  async login(payload: any) {
    const methodName = 'login';
    try {
      await Validate.login(payload);
    } catch (error: any) {
      const result = ResponseFactory.badRequest(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
    try {
      const result = ResponseFactory.success(await service.login(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async verifyMfa(payload: any) {
    const methodName = 'verifyMfa';
    try {
      await Validate.verifyMfa(payload);
    } catch (error: any) {
      const result = ResponseFactory.badRequest(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
    try {
      const result = ResponseFactory.success(await service.verifyMfa(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async refreshToken(payload: any) {
    const methodName = 'refreshToken';
    try {
      await Validate.refreshToken(payload);
    } catch (error: any) {
      const result = ResponseFactory.badRequest(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
    try {
      const result = ResponseFactory.success(await service.refreshToken(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async logout(payload: any) {
    const methodName = 'logout';
    try {
      await Validate.logout(payload);
    } catch (error: any) {
      const result = ResponseFactory.badRequest(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
    try {
      const result = ResponseFactory.success(await service.logout(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async changePassword(payload: any) {
    const methodName = 'changePassword';
    try {
      await Validate.changePassword(payload);
    } catch (error: any) {
      const result = ResponseFactory.badRequest(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
    try {
      const result = ResponseFactory.success(await service.changePassword(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async requestRecovery(payload: any) {
    const methodName = 'requestRecovery';
    try {
      await Validate.requestRecovery(payload);
    } catch (error: any) {
      const result = ResponseFactory.badRequest(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
    try {
      const result = ResponseFactory.success(await service.requestRecovery(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async resetPassword(payload: any) {
    const methodName = 'resetPassword';
    try {
      await Validate.resetPassword(payload);
    } catch (error: any) {
      const result = ResponseFactory.badRequest(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
    try {
      const result = ResponseFactory.success(await service.resetPassword(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  }
};

import Service from './service';
import Validate from './validate';
import { ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-AUTH';

function validationResponse(error: any) {
  if (error?.httpStatus) {
    return ResponseFactory.error(error.message, error.httpStatus, { errors: [error.message] });
  }
  return ResponseFactory.badRequest(error);
}


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
      const result = validationResponse(error);
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
      const result = validationResponse(error);
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
      const result = validationResponse(error);
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
      const result = validationResponse(error);
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
      const result = validationResponse(error);
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
      const result = validationResponse(error);
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
      const result = validationResponse(error);
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
  },

  async verifyEmail(payload: any) {
    const methodName = 'verifyEmail';
    // Endpoint invocado desde el enlace del correo (GET publico). Siempre responde
    // con el redirectUrl para que API Gateway haga un 302 hacia el login.
    const loginUrl = process.env.LOGIN_URL || `${process.env.FRONTEND_URL || 'https://app.greip.com.pe'}/login`;
    try {
      const result = ResponseFactory.success(await service.verifyEmail(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
      const result = ResponseFactory.success(
        { email: payload?.email || '', verified: false, redirectUrl: `${loginUrl}?emailVerified=failed` },
        MESSAGES_SUCCESS.PROCESS_SUCCESS
      );
      result.requestId = payload?.requestId;
      return result;
    }
  },

  async switchMfaChannel(payload: any) {
    const methodName = 'switchMfaChannel';
    try {
      await Validate.switchMfaChannel(payload);
    } catch (error: any) {
      const result = validationResponse(error);
      result.requestId = payload?.requestId;
      throw new Error(JSON.stringify(result));
    }
    try {
      const result = ResponseFactory.success(await service.switchMfaChannel(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  }
};

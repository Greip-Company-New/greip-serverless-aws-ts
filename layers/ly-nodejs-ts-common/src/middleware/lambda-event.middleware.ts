import BusinessException from '../base/business-exception.js';
import Logger from '../base/logger.js';
import ValidationException from '../base/validation-exception.js';
import { AWS_EVENTS, EXCEPTIONS, HTTP } from '../constants/ConstantCore.js';
import { AppExceptionParams } from '../models/base/app-exception.interface.js';
import { LambdaEvent } from '../models/middleware/api-gateway-event.middleware.interface.js';
import AWSXRay from 'aws-xray-sdk-core';
import { isEmpty } from '../validations/generics.js';
import { MiddlewareObj, Request } from '@middy/core';



function isOffline(event: LambdaEvent): boolean {
  return !!event.isOffline;
}

async function getPayload(event: any, isLambdaEvent: boolean): Promise<any> {
  if (isLambdaEvent) {
    const headers = {
      ...(event.headers || {}),
    };

    return {
      ...(event.payload || {}),
      headers,
    };
  }
}

function getAction(event: any): string | undefined {
  return event.action;
}

function _addXray() {
  if (process.env.IS_OFFLINE) {
    AWSXRay.setContextMissingStrategy('LOG_ERROR');
  }
  AWSXRay.captureHTTPsGlobal(require('http'));
  AWSXRay.captureHTTPsGlobal(require('https'));
}

export default function LambdaEventMiddleware(): MiddlewareObj<any, any> {
  return {
    before: async (request: Request<any, any>): Promise<void> => {
      const handlerEvent = request.event;

      const { origin } = handlerEvent;
      Logger.info(`Origin: ${origin}`);

      // Store state in request.internal to avoid global state
      request.internal = request.internal || {};
      request.internal.isLambdaEvent = origin === AWS_EVENTS.LAMBDA;

      if (request.internal.isLambdaEvent) {
        Logger.info('LambdaEvent - Request');
        Logger.info(request.event);
        Logger.info(request.context);

        process.env.IS_OFFLINE = isOffline(handlerEvent).toString();

        const action = getAction(handlerEvent);
        const payload = await getPayload(handlerEvent, request.internal.isLambdaEvent);

        request.event = { action, payload };

        Logger.info(request.event);

        _addXray();
      }
    },

    after: async (request: Request<any, any>): Promise<void> => {
      if (request.internal?.isLambdaEvent) {
        const { action, payload } = request.event;

        const exception = new ValidationException({
          code: EXCEPTIONS.REQUEST_HANDLER_EXCEPTION.code,
          messages: [EXCEPTIONS.REQUEST_HANDLER_EXCEPTION.message],
        } as AppExceptionParams);

        exception.throw(!action);

        const functionToExecute = request.response[action];
        exception.throw(!functionToExecute);

        const data = await functionToExecute(payload);
        request.response = JSON.stringify({ payload: data });

        Logger.info('LambdaEvent - Success Response');
        Logger.info(request.response);
      }
    },

    onError: async (request: Request<any, any>): Promise<void> => {
      if (request.internal?.isLambdaEvent) {
        Logger.error('LambdaEvent - Error Response');
        Logger.error(request.error);

        const error: Record<string, any> = { ...request.error };
        delete error.name;

        if (request.error instanceof BusinessException)
          error.httpStatus = HTTP.UNPROCESSABLE_ENTITY_STATUS.code;
        else if (request.error instanceof ValidationException)
          error.httpStatus = HTTP.BAD_REQUEST_STATUS.code;
        else if (isEmpty(error.httpStatus))
          error.httpStatus = HTTP.INTERNAL_SERVER_ERROR_STATUS.code;

        // Middy v4 requiere SETEAR response o lanzar excepción
        request.response = JSON.stringify({ error });

        // terminar pipeline
        return;
      }

      // si no es LambdaEvent, Middy seguirá el error normal
      throw request.error;
    },
  };
}

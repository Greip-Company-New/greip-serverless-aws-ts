import path from 'path';
import fs from 'fs/promises';
import { captureHTTPsGlobal, setContextMissingStrategy } from 'aws-xray-sdk';
import AuthorizationException from '../base/authorization-exception.js';
import { AppExceptionParams } from '../models/base/app-exception.interface.js';
import { AWS_EVENTS, EXCEPTIONS, HTTP } from '../constants/ConstantCore.js';
import { IamIdentity, LambdaEvent, Identity, Handler, HandlerEvent } from '../models/middleware/api-gateway-event.middleware.interface.js';
import { IAMClient, GetUserCommand } from '@aws-sdk/client-iam';
import { CognitoIdentityProviderClient, ListUsersCommand, ListUsersCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import Logger from '../base/logger.js';
import { isEmpty } from '../validations/generics.js';
import ValidationException from '../base/validation-exception.js';
import BusinessException from '../base/business-exception.js';

function isOffline(event: LambdaEvent): boolean {
  return !!event.isOffline;
}

async function readJsonfile(...segments: string[]): Promise<any> {
  const filePath = path.resolve(...segments);

  const file = await fs.readFile(filePath, 'utf8');

  return JSON.parse(file);
}

async function getPayload(event: LambdaEvent, isApiGatewayRestEvent: boolean): Promise<any> {
  if (isApiGatewayRestEvent) {
    const user = {};

    let body = event.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    // Comprehensive search for headers in various possible event structures
    const headers = {
      ...(event.headers || {}),
      ...(body?.headers || {}),
      ...(body?.requestHeaders || {}), // Added based on CloudWatch logs
      ...(body?.payload?.headers || {}),
      ...((event as any).params?.header || {}),
      ...((event as any).params?.headers || {}),
      ...((event as any).parameters?.header || {}),
      ...((event as any).multiValueHeaders || {})
    };

    const payload = {
      ...(body?.payload || {}),
      ...(body?.requestBody || {}),
      ...(event.query || {}),
      ...(event.path || {}),
      headers
    };

    delete payload.user;
    delete payload.proxy;

    return payload;
  }

  return {};
}

function getAction(event: LambdaEvent): string | undefined {
  return event.action;
}

function _addXray(): void {
  if (process.env.IS_OFFLINE) {
    setContextMissingStrategy('LOG_ERROR');
  }
  captureHTTPsGlobal(require('http'));
  captureHTTPsGlobal(require('https'));
}

async function getIdentity(event: LambdaEvent): Promise<any> {
  if (process.env.IS_OFFLINE && process.env.IS_AUTH_COGNITO) {
    return (await readJsonfile(process.cwd(), 'config', 'auth', 'identity-cognito.json')).identity;
  }

  if (process.env.IS_OFFLINE && process.env.IS_AUTH_IAM) {
    return (await readJsonfile(process.cwd(), 'config', 'auth', 'identity-iam.json')).identity;
  }

  if (process.env.IS_OFFLINE) {
    return (await readJsonfile(process.cwd(), 'config', 'auth', 'identity-offline.json')).identity;
  }

  return event.identity;
}

export async function getInfoUserCognito(identity: Identity): Promise<Record<string, string>> {
  const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-2' });

  const regex = /(?:.*)(?:\/.*\/)(.*)(?::CognitoSignIn:)(.*)/;
  const authProvider = identity.cognitoAuthenticationProvider;
  const match = authProvider.match(regex);

  if (!match) {
    throw new AuthorizationException({
      code: EXCEPTIONS.AUTHORIZATION_EXCEPTION.code,
      messages: [EXCEPTIONS.AUTHORIZATION_EXCEPTION.message]
    } as AppExceptionParams);
  }

  const [, userPoolId, userSub] = match;

  const params = {
    UserPoolId: userPoolId,
    Filter: `sub = "${userSub}"`,
    Limit: 1,
  };

  let data: ListUsersCommandOutput;
  try {
    const command = new ListUsersCommand(params);
    data = await cognitoClient.send(command);
  } catch (err) {
    Logger.error(err);
    throw new AuthorizationException({
      code: EXCEPTIONS.AUTHORIZATION_EXCEPTION.code,
      messages: [EXCEPTIONS.AUTHORIZATION_EXCEPTION.message]
    } as AppExceptionParams);
  }

  new AuthorizationException({
    code: EXCEPTIONS.AUTHORIZATION_EXCEPTION.code,
    messages: [EXCEPTIONS.AUTHORIZATION_EXCEPTION.message]
  } as AppExceptionParams).throw(isEmpty(data.Users) || (data.Users && data.Users.length > 1));

  let user = data.Users !== undefined ? data.Users[0] : null;

  const { Username, Attributes } = user!;

  const tags = (Attributes ?? []).reduce<Record<string, string | undefined>>((accumulator, currentValue) => {
    if (currentValue.Name !== 'email_verified' && currentValue.Name !== undefined) {
      accumulator[currentValue.Name] = currentValue.Value;
    }
    return accumulator;
  }, {});

  return {
    username: Username !== undefined ? Username : '',
    ...tags as Record<string, string>
  };
}

function extractUserNameFromArn(userArn: string): string | null {
  // Captura el último segmento después de la última barra
  const match = userArn.match(/.*\/([^/]+)$/);
  return match ? match[1] : null;
}

export async function getInfoUserIam(identity: IamIdentity): Promise<Record<string, string>> {
  if (!identity?.userArn) {
    throw new AuthorizationException({
      code: EXCEPTIONS.AUTHORIZATION_EXCEPTION.code,
      messages: [EXCEPTIONS.AUTHORIZATION_EXCEPTION.message]
    } as AppExceptionParams);
  }

  const userName = extractUserNameFromArn(identity.userArn);

  if (!userName) {
    Logger.error(`No se pudo extraer UserName del ARN: ${identity.userArn}`);

    throw new AuthorizationException({
      code: EXCEPTIONS.AUTHORIZATION_EXCEPTION.code,
      messages: [EXCEPTIONS.AUTHORIZATION_EXCEPTION.message]
    } as AppExceptionParams);
  }

  const iamClient = new IAMClient({ region: process.env.AWS_REGION });

  const cmd = new GetUserCommand({ UserName: userName });

  const data = await iamClient.send(cmd);

  new AuthorizationException({
    code: EXCEPTIONS.AUTHORIZATION_EXCEPTION.code,
    messages: [EXCEPTIONS.AUTHORIZATION_EXCEPTION.message]
  } as AppExceptionParams).throw(isEmpty(data.User));

  const { UserName, Tags } = data.User!;

  const tags = (Tags ?? []).reduce<Record<string, string>>((acc, t) => {
    if (t.Key && typeof t.Value === 'string') {
      acc[t.Key] = t.Value;
    }
    return acc;
  }, {});

  return {
    username: UserName!,
    ...tags
  };
}

export async function getInfoUser(event: LambdaEvent): Promise<Record<string, string>> {
  const identity = await getIdentity(event);

  if (isEmpty(identity.userArn) && isEmpty(identity.cognitoAuthenticationProvider))
    return identity;

  if ((identity as IamIdentity).userArn)
    return await getInfoUserIam(identity as IamIdentity);
  else
    return await getInfoUserCognito(identity as Identity);
}

export default () => {
  return {
    async before(handler: HandlerEvent): Promise<void> {
      const { origin } = handler.event;

      // Use handler.internal to store state
      handler.internal = handler.internal || {};
      handler.internal.isApiGatewayRestEvent = (origin === AWS_EVENTS.API_GATEWAY_REST);

      if (handler.internal.isApiGatewayRestEvent) {

        Logger.info('ApiGatewayEvent - Request');
        Logger.info(handler.event);
        Logger.info(handler.context);

        const { event } = handler;
        process.env.IS_OFFLINE = String(isOffline(event));

        const action = getAction(event);
        const payload = await getPayload(event, true);
        handler.event = { origin, action, payload };

        Logger.info(handler.event);
        _addXray();
      }
    },
    async after(handler: HandlerEvent): Promise<void> {
      if (handler.internal?.isApiGatewayRestEvent) {
        const { action, payload } = handler.event;

        if (!action) {
          const err = new Error('{"success":false,"statusCode":404,"message":"Recurso no encontrado"}');
          (err as any).httpStatus = 404;
          throw err;
        }

        const functionToExecute = handler.response[action];
        if (!functionToExecute) {
          const err = new Error('{"success":false,"statusCode":404,"message":"Recurso no encontrado"}');
          (err as any).httpStatus = 404;
          throw err;
        }

        const data = await functionToExecute(payload);

        // Check if the response contains an error status code (non-2xx)
        const responseCode = data?.code || data?.statusCode;
        if (data && typeof data === 'object' && responseCode) {
          if (responseCode < 200 || responseCode >= 300) {
            const err = new Error(JSON.stringify(data));
            (err as any).httpStatus = responseCode;
            throw err;
          }
        }

        handler.response = JSON.stringify({ payload: data });

        Logger.info('ApiGatewayEvent - Success Response');
        Logger.info(handler.response);
      }
    },
    async onError(handler: Handler): Promise<never | void> {
      // Check internal state safely
      const isApiGatewayRestEvent = (handler as any).internal?.isApiGatewayRestEvent;

      if (!isApiGatewayRestEvent) {
        throw handler.error;
      }

      Logger.error('ApiGatewayEvent - Error Response');
      Logger.error(handler.error);

      // Preserve the httpStatus if set by the thrower, otherwise default to 500
      if (!(handler.error as any).httpStatus) {
        if (handler.error instanceof BusinessException) {
          (handler.error as any).httpStatus = HTTP.UNPROCESSABLE_ENTITY_STATUS.code;
        } else if (handler.error instanceof ValidationException) {
          (handler.error as any).httpStatus = HTTP.BAD_REQUEST_STATUS.code;
        } else {
          (handler.error as any).httpStatus = HTTP.INTERNAL_SERVER_ERROR_STATUS.code;
        }
      }

      throw handler.error;
    },
  };
}
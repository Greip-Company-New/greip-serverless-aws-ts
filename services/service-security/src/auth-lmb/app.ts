import controller from './controller';
import { addMiddleware, bootstrap, ApiGatewayEvent } from 'ly-nodejs-ts-common';
import { AuthMiddleware } from 'ly-nodejs-ts-common';

const RequestIdMiddleware = () => ({
    before: (handler: any) => {
        if (handler.event && handler.event.payload) {
            handler.event.payload.requestId = handler.context.awsRequestId;
        }
    }
});

addMiddleware(ApiGatewayEvent());
addMiddleware(RequestIdMiddleware());
addMiddleware(AuthMiddleware({ exclude: ['login', 'verifyMfa', 'refreshToken', 'requestRecovery', 'resetPassword'] }));

export const handler = bootstrap(controller);

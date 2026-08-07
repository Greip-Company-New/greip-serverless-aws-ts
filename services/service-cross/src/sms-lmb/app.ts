import controller from './controller';
import { addMiddleware, bootstrap, ApiGatewayEvent } from 'ly-nodejs-ts-common';

const RequestIdMiddleware = () => ({
    before: (handler: any) => {
        if (handler.event && handler.event.payload) {
            handler.event.payload.requestId = handler.context.awsRequestId;
        }
    }
});

addMiddleware(ApiGatewayEvent());
addMiddleware(RequestIdMiddleware());

export const handler = bootstrap(controller);

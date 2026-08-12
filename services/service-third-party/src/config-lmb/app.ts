import controller from './controller';
import { addMiddleware, bootstrap, ApiGatewayEvent, AuthMiddleware } from 'ly-nodejs-ts-common';
import RbacMiddleware from '../common/middlewares/rbac';

const RequestIdMiddleware = () => ({
    before: (handler: any) => {
        if (handler.event && handler.event.payload) {
            handler.event.payload.requestId = handler.context.awsRequestId;
        }
    }
});

addMiddleware(ApiGatewayEvent());
addMiddleware(RequestIdMiddleware());
addMiddleware(AuthMiddleware());
addMiddleware(RbacMiddleware({
    permissionsByAction: {
        getConfig: ['notify.config.read'],
        setConfig: ['notify.config.manage']
    }
}));

export const handler = bootstrap(controller);
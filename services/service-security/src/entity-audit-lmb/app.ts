import controller from './controller';
import { addMiddleware, bootstrap, ApiGatewayEvent } from 'ly-nodejs-ts-common';
import AuthMiddleware from '../common/middlewares/auth';
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
addMiddleware(AuthMiddleware({ exclude: ['registerChange'] }));
addMiddleware(RbacMiddleware({
    permissionsByAction: {
        listChanges: ['audit.read']
    }
}));

export const handler = bootstrap(controller);

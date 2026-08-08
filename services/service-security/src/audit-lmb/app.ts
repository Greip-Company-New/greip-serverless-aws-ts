import controller from './controller';
import { addMiddleware, bootstrap, ApiGatewayEvent } from 'ly-nodejs-ts-common';
import { AuthMiddleware } from 'ly-nodejs-ts-common';
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
        listAudit: ['audit.read'],
        getAudit: ['audit.read']
    }
}));

export const handler = bootstrap(controller);

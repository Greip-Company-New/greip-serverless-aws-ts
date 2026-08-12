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
addMiddleware(AuthMiddleware({ exclude: [] }));
addMiddleware(RbacMiddleware({
    permissionsByAction: {
        listProducts: ['product.read'],
        getProduct: ['product.read'],
        createProduct: ['product.create'],
        updateProduct: ['product.update'],
        deleteProduct: ['product.delete']
    }
}));

export const handler = bootstrap(controller);

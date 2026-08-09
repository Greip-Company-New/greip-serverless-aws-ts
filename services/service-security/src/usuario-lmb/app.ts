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
        createUser: ['user.create'],
        updateUser: ['user.update'],
        deleteUser: ['user.delete'],
        listUsers: ['user.read'],
        getUser: ['user.read'],
        assignRoles: ['role.manage'],
        removeRole: ['role.manage'],
        getUserPermissions: ['permission.read'],
        createRole: ['role.manage'],
        listRoles: ['role.manage', 'user.read'],
        listPermissions: ['permission.read'],
        getRole: ['role.manage', 'permission.read'],
        updateRole: ['role.manage'],
        deleteRole: ['role.manage'],
        getRolePermissions: ['permission.read', 'role.manage'],
        assignRolePermissions: ['role.manage'],
        removeRolePermission: ['role.manage'],
        createPermission: ['permission.manage'],
        updatePermission: ['permission.manage'],
        deletePermission: ['permission.manage'],
        createTenant: ['tenant.manage'],
        dashboardSummary: ['dashboard.read']
    }
}));

export const handler = bootstrap(controller);

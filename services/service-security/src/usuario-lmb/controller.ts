import Service from './service';
import Validate from './validate';
import { ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-USUARIO';
const service = new Service();

function badRequest(methodName: string, payload: any, error: any): never {
  console.error(`[${LAMBDA_NAME}] ${methodName} | Validation Error`, error);
  const result = ResponseFactory.badRequest(error);
  result.requestId = payload?.requestId;
  throw new Error(JSON.stringify(result));
}

function errorResponse(methodName: string, payload: any, error: any): never {
  console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
  const result = ResponseFactory.fromError(error);
  result.requestId = payload?.requestId;
  throw new Error(JSON.stringify(result));
}

export default {
  async createUser(payload: any) {
    const methodName = 'createUser';
    try {
      await Validate.createUser(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.created(await service.createUser(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async updateUser(payload: any) {
    const methodName = 'updateUser';
    try {
      await Validate.updateUser(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.updated(await service.updateUser(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async listUsers(payload: any) {
    const methodName = 'listUsers';
    try {
      await Validate.listUsers(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const data = await service.listUsers(payload);
      const result = ResponseFactory.paginated(data.data, data.total, Number(payload.page) || 1, Number(payload.pageSize) || 10);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async getUser(payload: any) {
    const methodName = 'getUser';
    try {
      await Validate.getUser(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.getUser(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async deleteUser(payload: any) {
    const methodName = 'deleteUser';
    try {
      await Validate.deleteUser(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      await service.deleteUser(payload, payload.identity);
      const result = ResponseFactory.deleted(MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async deleteUserHard(payload: any) {
    const methodName = 'deleteUserHard';
    try {
      await Validate.deleteUserHard(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      await service.deleteUserHard(payload, payload.identity);
      const result = ResponseFactory.deleted(MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async assignRoles(payload: any) {
    const methodName = 'assignRoles';
    try {
      await Validate.assignRoles(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.assignRoles(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async removeRole(payload: any) {
    const methodName = 'removeRole';
    try {
      await Validate.removeRole(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.removeRole(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async getUserPermissions(payload: any) {
    const methodName = 'getUserPermissions';
    try {
      await Validate.getUserPermissions(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.getUserPermissions(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async createRole(payload: any) {
    const methodName = 'createRole';
    try {
      await Validate.createRole(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.created(await service.createRole(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async listRoles(payload: any) {
    const methodName = 'listRoles';
    try {
      await Validate.listRoles(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.listRoles(), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async listPermissions(payload: any) {
    const methodName = 'listPermissions';
    try {
      await Validate.listPermissions(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.listPermissions(), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async getRole(payload: any) {
    const methodName = 'getRole';
    try {
      await Validate.getRole(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.getRole(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async updateRole(payload: any) {
    const methodName = 'updateRole';
    try {
      await Validate.updateRole(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.updated(await service.updateRole(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async deleteRole(payload: any) {
    const methodName = 'deleteRole';
    try {
      await Validate.deleteRole(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      await service.deleteRole(payload, payload.identity);
      const result = ResponseFactory.deleted(MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async getRolePermissions(payload: any) {
    const methodName = 'getRolePermissions';
    try {
      await Validate.getRolePermissions(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.getRolePermissions(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async assignRolePermissions(payload: any) {
    const methodName = 'assignRolePermissions';
    try {
      await Validate.assignRolePermissions(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.assignRolePermissions(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async removeRolePermission(payload: any) {
    const methodName = 'removeRolePermission';
    try {
      await Validate.removeRolePermission(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.removeRolePermission(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async createPermission(payload: any) {
    const methodName = 'createPermission';
    try {
      await Validate.createPermission(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.created(await service.createPermission(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async updatePermission(payload: any) {
    const methodName = 'updatePermission';
    try {
      await Validate.updatePermission(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.updated(await service.updatePermission(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async deletePermission(payload: any) {
    const methodName = 'deletePermission';
    try {
      await Validate.deletePermission(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      await service.deletePermission(payload, payload.identity);
      const result = ResponseFactory.deleted(MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async createTenant(payload: any) {
    const methodName = 'createTenant';
    try {
      await Validate.createTenant(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.created(await service.createTenant(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async listTenants(payload: any) {
    const methodName = 'listTenants';
    try {
      await Validate.listTenants(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.listTenants(), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async updateTenant(payload: any) {
    const methodName = 'updateTenant';
    try {
      await Validate.updateTenant(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.updated(await service.updateTenant(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async deactivateTenant(payload: any) {
    const methodName = 'deactivateTenant';
    try {
      await Validate.deactivateTenant(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.updated(await service.deactivateTenant(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async dashboardSummary(payload: any) {
    const methodName = 'dashboardSummary';
    try {
      await Validate.dashboardSummary(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.dashboardSummary(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async resendVerificationEmail(payload: any) {
    const methodName = 'resendVerificationEmail';
    try {
      await Validate.resendVerificationEmail(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.resendVerificationEmail(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async registerTotp(payload: any) {
    const methodName = 'registerTotp';
    try { await Validate.registerTotp(payload); } catch (error: any) { return badRequest(methodName, payload, error); }
    try {
      const result = ResponseFactory.success(await service.registerTotp(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) { return errorResponse(methodName, payload, error); }
  },

  async verifyTotp(payload: any) {
    const methodName = 'verifyTotp';
    try { await Validate.verifyTotp(payload); } catch (error: any) { return badRequest(methodName, payload, error); }
    try {
      const result = ResponseFactory.success(await service.verifyTotp(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) { return errorResponse(methodName, payload, error); }
  },

  async enableEmailMfa(payload: any) {
    const methodName = 'enableEmailMfa';
    try { await Validate.enableEmailMfa(payload); } catch (error: any) { return badRequest(methodName, payload, error); }
    try {
      const result = ResponseFactory.success(await service.enableEmailMfa(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) { return errorResponse(methodName, payload, error); }
  },

  async verifyEmailMfa(payload: any) {
    const methodName = 'verifyEmailMfa';
    try { await Validate.verifyEmailMfa(payload); } catch (error: any) { return badRequest(methodName, payload, error); }
    try {
      const result = ResponseFactory.success(await service.verifyEmailMfa(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) { return errorResponse(methodName, payload, error); }
  },

  async disableMfa(payload: any) {
    const methodName = 'disableMfa';
    try { await Validate.disableMfa(payload); } catch (error: any) { return badRequest(methodName, payload, error); }
    try {
      const result = ResponseFactory.success(await service.disableMfa(payload), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) { return errorResponse(methodName, payload, error); }
  },

  async resetUserPassword(payload: any) {
    const methodName = 'resetUserPassword';
    try {
      await Validate.resetUserPassword(payload);
    } catch (error: any) {
      return badRequest(methodName, payload, error);
    }
    try {
      const result = ResponseFactory.success(await service.resetUserPassword(payload, payload.identity), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async listPaises(payload: any) {
    const methodName = 'listPaises';
    try { await Validate.listPaises(payload); } catch (error: any) { return badRequest(methodName, payload, error); }
    try {
      const result = ResponseFactory.success(await service.listPaises(), MESSAGES_SUCCESS.PROCESS_SUCCESS);
      result.requestId = payload?.requestId;
      return result;
    } catch (error) { return errorResponse(methodName, payload, error); }
  }
};

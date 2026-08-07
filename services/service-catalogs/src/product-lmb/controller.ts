import Service from './service';
import Validate from './validate';
import { ResponseFactory } from 'ly-nodejs-ts-common';

const LAMBDA_NAME = process.env.LAMBDA_PREFIX + '-PRODUCT';

function validationError(methodName: string, payload: any, error: any): never {
  const details = Array.isArray(error) ? error : [error?.message || 'Error de validación'];
  console.error(`[${LAMBDA_NAME}] ${methodName} | Validation Error`, error);
  const result = ResponseFactory.badRequest(`Error de validación: ${details.join('; ')}`, { errors: details });
  result.requestId = payload.requestId;
  throw new Error(JSON.stringify(result));
}

function errorResponse(methodName: string, payload: any, error: any): never {
  console.error(`[${LAMBDA_NAME}] ${methodName} | Error`, error);
  const result = ResponseFactory.fromError(error);
  result.requestId = payload.requestId;
  throw new Error(JSON.stringify(result));
}

export default {

  async listProducts(payload: any) {
    const methodName = 'listProducts';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.listProducts(payload);
    } catch (error: any) {
      return validationError(methodName, payload, error);
    }

    try {
      const result = await Service.listProducts(payload);
      result.requestId = payload.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async getProduct(payload: any) {
    const methodName = 'getProduct';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.getProduct(payload);
    } catch (error: any) {
      return validationError(methodName, payload, error);
    }

    try {
      const result = await Service.getProduct(payload);
      result.requestId = payload.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async createProduct(payload: any) {
    const methodName = 'createProduct';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.createProduct(payload);
    } catch (error: any) {
      return validationError(methodName, payload, error);
    }

    try {
      const result = await Service.createProduct(payload);
      result.requestId = payload.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async updateProduct(payload: any) {
    const methodName = 'updateProduct';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.updateProduct(payload);
    } catch (error: any) {
      return validationError(methodName, payload, error);
    }

    try {
      const result = await Service.updateProduct(payload);
      result.requestId = payload.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

  async deleteProduct(payload: any) {
    const methodName = 'deleteProduct';
    console.log(`--------- ${methodName} ---------`);
    console.log('payload >> ', payload);

    try {
      await Validate.deleteProduct(payload);
    } catch (error: any) {
      return validationError(methodName, payload, error);
    }

    try {
      const result = await Service.deleteProduct(payload);
      result.requestId = payload.requestId;
      return result;
    } catch (error) {
      return errorResponse(methodName, payload, error);
    }
  },

}

import Joi from 'joi';
import { PRODUCT_STATUS, CURRENCIES } from './constants';

export default class Validate {

  static async listProducts(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      page: Joi.number().integer().min(1).optional(),
      pageSize: Joi.number().integer().min(1).max(100).optional(),
      status: Joi.string().valid(...PRODUCT_STATUS).optional().empty(''),
      name: Joi.string().max(100).optional().empty(''),
      headers: Joi.object().optional().unknown(true),
    });

    try {
      await schema.validateAsync(payload, { abortEarly: false, allowUnknown: true });
    } catch (err: any) {
      if (err.isJoi) {
        throw err.details.map((d: any) => d.message.replace(/"/g, ''));
      }
      throw err;
    }
  }

  static async getProduct(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      productId: Joi.number().integer().min(1).required(),
      headers: Joi.object().optional().unknown(true),
    });

    try {
      await schema.validateAsync(payload, { abortEarly: false, allowUnknown: true });
    } catch (err: any) {
      if (err.isJoi) {
        throw err.details.map((d: any) => d.message.replace(/"/g, ''));
      }
      throw err;
    }
  }

  static async createProduct(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      createdBy: Joi.string().optional().empty(''),
      name: Joi.string().required(),
      description: Joi.string().max(500).allow(null).optional().empty(''),
      price: Joi.number().precision(2).min(0).required(),
      currency: Joi.string().valid(...CURRENCIES).optional(),
      status: Joi.string().valid(...PRODUCT_STATUS).optional(),
      headers: Joi.object().optional().unknown(true),
    });

    try {
      await schema.validateAsync(payload, { abortEarly: false, allowUnknown: true });
    } catch (err: any) {
      if (err.isJoi) {
        throw err.details.map((d: any) => d.message.replace(/"/g, ''));
      }
      throw err;
    }
  }

  static async updateProduct(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      productId: Joi.number().integer().min(1).required(),
      createdBy: Joi.string().optional().empty(''),
      name: Joi.string().required(),
      description: Joi.string().max(500).allow(null).optional().empty(''),
      price: Joi.number().precision(2).min(0).required(),
      currency: Joi.string().valid(...CURRENCIES).optional(),
      status: Joi.string().valid(...PRODUCT_STATUS).optional(),
      headers: Joi.object().optional().unknown(true),
    });

    try {
      await schema.validateAsync(payload, { abortEarly: false, allowUnknown: true });
    } catch (err: any) {
      if (err.isJoi) {
        throw err.details.map((d: any) => d.message.replace(/"/g, ''));
      }
      throw err;
    }
  }

  static async deleteProduct(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      productId: Joi.number().integer().min(1).required(),
      headers: Joi.object().optional().unknown(true),
    });

    try {
      await schema.validateAsync(payload, { abortEarly: false, allowUnknown: true });
    } catch (err: any) {
      if (err.isJoi) {
        throw err.details.map((d: any) => d.message.replace(/"/g, ''));
      }
      throw err;
    }
  }

}

import Joi from 'joi';
import { CANALES } from 'ly-nodejs-ts-common';

export default class Validate {
  static async login(payload: any): Promise<void> {
    const schema = Joi.object({
      email: Joi.string().email().optional(),
      documentType: Joi.string().valid('D', 'R', 'C').optional(),
      documentNumber: Joi.string().optional(),
      password: Joi.string().min(1).required(),
      channel: Joi.string().valid('TOTP', 'SMS', 'EMAIL').optional(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    }).xor('email', 'documentType');

    await this.validar(schema, payload);

    const headers = payload?.headers || {};
    const headerChannel = headers['channel'] || headers['Channel'] || headers['Canal'] || headers['canal'] || '';
    if (!headerChannel) {
      throw ['Header channel es obligatorio'];
    }
    if (!CANALES.includes(headerChannel)) {
      const err: any = new Error(`Token no autorizado para este canal ${headerChannel}`);
      err.httpStatus = 401;
      throw err;
    }
  }

  static async verifyMfa(payload: any): Promise<void> {
    const schema = Joi.object({
      mfaToken: Joi.string().required(),
      challengeId: Joi.string().required(),
      code: Joi.string().min(6).max(6).required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
    await this.validarChannel(payload);
  }

  static async refreshToken(payload: any): Promise<void> {
    const schema = Joi.object({
      refreshToken: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
    await this.validarChannel(payload);
  }

  static async logout(payload: any): Promise<void> {
    const schema = Joi.object({
      refreshToken: Joi.string().required(),
      logoutAll: Joi.boolean().optional(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
    await this.validarChannel(payload);
  }

  static async changePassword(payload: any): Promise<void> {
    const schema = Joi.object({
      currentPassword: Joi.string().min(1).required(),
      newPassword: Joi.string().min(8).required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
    await this.validarChannel(payload);
  }

  static async requestRecovery(payload: any): Promise<void> {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
    await this.validarChannel(payload);
  }

  static async resetPassword(payload: any): Promise<void> {
    const schema = Joi.object({
      resetToken: Joi.string().required(),
      newPassword: Joi.string().min(8).required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
    await this.validarChannel(payload);
  }

  private static async validarChannel(payload: any): Promise<void> {
    const headers = payload?.headers || {};
    const headerChannel = headers['channel'] || headers['Channel'] || headers['Canal'] || headers['canal'] || '';
    if (!headerChannel) {
      throw ['Header channel es obligatorio'];
    }
    if (!CANALES.includes(headerChannel)) {
      const err: any = new Error(`Token no autorizado para este canal ${headerChannel}`);
      err.httpStatus = 401;
      throw err;
    }
  }

  private static async validar(schema: Joi.ObjectSchema, payload: any): Promise<void> {
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

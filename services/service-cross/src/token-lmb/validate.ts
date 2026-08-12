import Joi from 'joi';

export default class Validate {

  static async encryptTokenData(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true),
      data: Joi.any().required().invalid(null),
    });

    try {
      await schema.validateAsync(payload, { abortEarly: false });
    } catch (err: any) {
      if (err.isJoi) {
        throw err.details.map((d: any) => d.message.replace(/"/g, ''));
      }
      throw err;
    }
  }

  static async decryptTokenData(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true),
      encrypted: Joi.string().min(1).required(),
    });

    try {
      await schema.validateAsync(payload, { abortEarly: false });
    } catch (err: any) {
      if (err.isJoi) {
        throw err.details.map((d: any) => d.message.replace(/"/g, ''));
      }
      throw err;
    }
  }

}

import Joi from 'joi';

export default class Validate {

  static async listChanges(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      entity: Joi.string().max(100).required(),
      entityKey: Joi.string().max(100).required(),
      tenantId: Joi.number().integer().min(1).required(),
      page: Joi.number().integer().min(1).optional(),
      pageSize: Joi.number().integer().min(1).max(100).optional(),
      headers: Joi.object().optional().unknown(true)
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

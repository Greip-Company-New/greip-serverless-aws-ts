import Joi from 'joi';

export default class Validate {
  static async listAudit(payload: any): Promise<void> {
    const schema = Joi.object({
      dateFrom: Joi.string().isoDate().optional().allow(''),
      dateTo: Joi.string().isoDate().optional().allow(''),
      action: Joi.string().optional().allow(''),
      entity: Joi.string().optional().allow(''),
      actor: Joi.string().optional().allow(''),
      page: Joi.number().integer().min(1).optional(),
      pageSize: Joi.number().integer().min(1).max(100).optional(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async getAudit(payload: any): Promise<void> {
    const schema = Joi.object({
      sk: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
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

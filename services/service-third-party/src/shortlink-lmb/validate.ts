import Joi from 'joi';

export default class Validate {

  static async shortenUrl(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      url: Joi.string().uri({ scheme: ['http', 'https'] }).max(32000).required(),
      key: Joi.string().max(190).optional().empty(''),
      domain: Joi.string().max(190).optional().empty(''),
      tenantCode: Joi.string().max(50).optional().empty(''),
      headers: Joi.object().optional().unknown(true)
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
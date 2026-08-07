import Joi from 'joi';

export default class Validate {

  static async sendEmail(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      canal: Joi.string().optional(),
      to: Joi.array().items(Joi.string().email()).min(1).required(),
      subject: Joi.string().max(200).optional().empty(''),
      html: Joi.string().optional().empty(''),
      text: Joi.string().optional().empty(''),
      from: Joi.string().email().optional().empty(''),
      replyTo: Joi.array().items(Joi.string().email()).optional(),
      headers: Joi.object().optional().unknown(true),
    }).or('html', 'text');

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

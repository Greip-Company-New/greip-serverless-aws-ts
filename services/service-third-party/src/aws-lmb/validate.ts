import Joi from 'joi';

export default class Validate {

  static async sendEmail(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      to: Joi.array().items(Joi.string().email()).min(1).required(),
      subject: Joi.string().max(200).optional().empty(''),
      html: Joi.string().optional().empty(''),
      text: Joi.string().optional().empty(''),
      from: Joi.string().email().optional().empty(''),
      fromName: Joi.string().max(200).optional().empty(''),
      replyTo: Joi.array().items(Joi.string().email()).optional(),
      tenantCode: Joi.string().max(50).optional().empty(''),
      headers: Joi.object().optional().unknown(true),
      attachments: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        content: Joi.string().required(),
        type: Joi.string().optional()
      })).optional()
    }).or('html', 'text', 'subject');

    try {
      await schema.validateAsync(payload, { abortEarly: false });
    } catch (err: any) {
      if (err.isJoi) {
        throw err.details.map((d: any) => d.message.replace(/"/g, ''));
      }
      throw err;
    }
  }

  static async sendSms(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      phoneNumber: Joi.string().pattern(/^\+?[0-9]{9,15}$/).required(),
      message: Joi.string().max(1600).required(),
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
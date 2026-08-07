import Joi from 'joi';

export default class Validate {

  static async sendSms(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      canal: Joi.string().optional(),
      phoneNumber: Joi.string().pattern(/^\+?[0-9]{9,15}$/).required(),
      message: Joi.string().max(1600).required(),
      headers: Joi.object().optional().unknown(true),
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

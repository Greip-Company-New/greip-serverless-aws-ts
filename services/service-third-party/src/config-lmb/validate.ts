import Joi from 'joi';
import { PROVEEDORES } from '../common/config';

export default class Validate {

  static async getConfig(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional()
    }).unknown(true);

    await schema.validateAsync(payload || {}, { abortEarly: false });
  }

  static async setConfig(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      emailProvider: Joi.string().valid(...PROVEEDORES).required(),
      smsProvider: Joi.string().valid(...PROVEEDORES).required(),
      brevo: Joi.object({
        enabled: Joi.boolean().optional(),
        apiKey: Joi.string().min(4).max(300).optional().empty(''),
        fromEmail: Joi.string().email().max(200).optional().empty(''),
        fromName: Joi.string().max(200).optional().empty(''),
        smsSender: Joi.string().max(12).optional().empty('')
      }).optional(),
      twilio: Joi.object({
        enabled: Joi.boolean().optional(),
        accountSid: Joi.string().min(4).max(100).optional().empty(''),
        authToken: Joi.string().min(4).max(100).optional().empty(''),
        sendgridApiKey: Joi.string().min(4).max(300).optional().empty(''),
        fromPhone: Joi.string().max(20).optional().empty(''),
        fromEmail: Joi.string().email().max(200).optional().empty(''),
        fromName: Joi.string().max(200).optional().empty('')
      }).optional(),
      ses: Joi.object({
        enabled: Joi.boolean().optional(),
        fromEmail: Joi.string().email().max(200).optional().empty(''),
        fromName: Joi.string().max(200).optional().empty(''),
        region: Joi.string().max(20).optional().empty('')
      }).optional(),
      sns: Joi.object({
        enabled: Joi.boolean().optional(),
        senderId: Joi.string().max(11).optional().empty(''),
        fromPhone: Joi.string().max(20).optional().empty(''),
        region: Joi.string().max(20).optional().empty('')
      }).optional(),
      dub: Joi.object({
        apiKey: Joi.string().min(4).max(300).optional().empty(''),
        workspaceId: Joi.string().max(100).optional().empty(''),
        domain: Joi.string().max(190).optional().empty('')
      }).optional(),
      headers: Joi.object().optional().unknown(true)
    }).unknown(true);

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
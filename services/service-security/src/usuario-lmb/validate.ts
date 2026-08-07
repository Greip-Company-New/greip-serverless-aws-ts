import Joi from 'joi';

export default class Validate {
  static async createUser(payload: any): Promise<void> {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      documentType: Joi.string().valid('D', 'R', 'C').required(),
      documentNumber: Joi.string().min(3).max(15).required(),
      firstName: Joi.string().min(2).required(),
      fatherLastName: Joi.string().min(2).required(),
      motherLastName: Joi.string().optional().allow(''),
      phone: Joi.string().optional().allow(''),
      password: Joi.string().min(8).optional(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async updateUser(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      email: Joi.string().email().optional(),
      documentType: Joi.string().valid('D', 'R', 'C').optional(),
      documentNumber: Joi.string().min(3).max(15).optional(),
      firstName: Joi.string().min(2).optional(),
      fatherLastName: Joi.string().min(2).optional(),
      motherLastName: Joi.string().optional().allow(''),
      phone: Joi.string().optional().allow(''),
      status: Joi.string().valid('A', 'I').optional(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    }).min(2);

    await this.validar(schema, payload);
  }

  static async listUsers(payload: any): Promise<void> {
    const schema = Joi.object({
      page: Joi.number().integer().min(1).optional(),
      pageSize: Joi.number().integer().min(1).max(100).optional(),
      status: Joi.string().valid('A', 'I').optional(),
      email: Joi.string().optional().allow(''),
      document: Joi.string().optional().allow(''),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async getUser(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async deleteUser(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async assignRoles(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      roles: Joi.array().items(Joi.string()).min(1).required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async removeRole(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      roleId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async getUserPermissions(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async createRole(payload: any): Promise<void> {
    const schema = Joi.object({
      code: Joi.string().min(2).max(50).required(),
      name: Joi.string().min(2).required(),
      description: Joi.string().optional().allow(''),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async listRoles(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async listPermissions(payload: any): Promise<void> {
    const schema = Joi.object({
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

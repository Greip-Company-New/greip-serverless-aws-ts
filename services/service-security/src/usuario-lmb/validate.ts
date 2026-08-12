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

  static async resetUserPassword(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      newPassword: Joi.string().min(8).required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });
    await this.validar(schema, payload);
  }

  static async deleteUserHard(payload: any): Promise<void> {
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

  static async getRole(payload: any): Promise<void> {
    const schema = Joi.object({
      roleId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async updateRole(payload: any): Promise<void> {
    const schema = Joi.object({
      roleId: Joi.string().required(),
      code: Joi.string().min(2).max(50).optional(),
      name: Joi.string().min(2).optional(),
      description: Joi.string().optional().allow(''),
      status: Joi.string().valid('A', 'I').optional(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    }).min(2);

    await this.validar(schema, payload);
  }

  static async deleteRole(payload: any): Promise<void> {
    const schema = Joi.object({
      roleId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async getRolePermissions(payload: any): Promise<void> {
    const schema = Joi.object({
      roleId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async assignRolePermissions(payload: any): Promise<void> {
    const schema = Joi.object({
      roleId: Joi.string().required(),
      permissions: Joi.array().items(Joi.string()).min(1).required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async removeRolePermission(payload: any): Promise<void> {
    const schema = Joi.object({
      roleId: Joi.string().required(),
      permissionId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async createPermission(payload: any): Promise<void> {
    const schema = Joi.object({
      code: Joi.string().min(2).max(100).required(),
      name: Joi.string().min(2).required(),
      description: Joi.string().optional().allow(''),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async updatePermission(payload: any): Promise<void> {
    const schema = Joi.object({
      permissionId: Joi.string().required(),
      code: Joi.string().min(2).max(100).optional(),
      name: Joi.string().min(2).optional(),
      description: Joi.string().optional().allow(''),
      status: Joi.string().valid('A', 'I').optional(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    }).min(2);

    await this.validar(schema, payload);
  }

  static async deletePermission(payload: any): Promise<void> {
    const schema = Joi.object({
      permissionId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async createTenant(payload: any): Promise<void> {
    const schema = Joi.object({
      code: Joi.string().min(2).max(50).required(),
      name: Joi.string().min(2).required(),
      ruc: Joi.string().regex(/^\d{11}$/).optional(),
      razon_social: Joi.string().max(300).optional().empty(''),
      pais_id: Joi.number().integer().positive().optional(),
      idioma: Joi.string().valid('es', 'en').optional(),
      moneda: Joi.string().valid('PEN', 'USD').optional(),
      formato_fecha: Joi.string().max(20).optional(),
      formato_fecha_hora: Joi.string().max(20).optional(),
      formato_decimales: Joi.string().max(10).optional(),
      admin_email: Joi.string().email().optional(),
      admin_password: Joi.string().min(8).optional(),
      admin_first_name: Joi.string().max(100).optional(),
      admin_father_last_name: Joi.string().max(100).optional(),
      status: Joi.string().valid('A', 'I').optional(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async listTenants(payload: any): Promise<void> {
    const schema = Joi.object({
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async updateTenant(payload: any): Promise<void> {
    const schema = Joi.object({
      tenantId: Joi.alternatives().try(Joi.number().integer().min(1), Joi.string().min(1)).required(),
      name: Joi.string().min(2).optional().empty(''),
      status: Joi.string().valid('A', 'I').optional(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async deactivateTenant(payload: any): Promise<void> {
    const schema = Joi.object({
      tenantId: Joi.alternatives().try(Joi.number().integer().min(1), Joi.string().min(1)).required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async dashboardSummary(payload: any): Promise<void> {
    const schema = Joi.object({
      tenantId: Joi.number().integer().min(1).optional(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async resendVerificationEmail(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });

    await this.validar(schema, payload);
  }

  static async registerTotp(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });
    await this.validar(schema, payload);
  }

  static async verifyTotp(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      code: Joi.string().length(6).required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });
    await this.validar(schema, payload);
  }

  static async enableEmailMfa(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });
    await this.validar(schema, payload);
  }

  static async verifyEmailMfa(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      challengeId: Joi.string().required(),
      code: Joi.string().length(6).required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });
    await this.validar(schema, payload);
  }

  static async disableMfa(payload: any): Promise<void> {
    const schema = Joi.object({
      userId: Joi.string().required(),
      channel: Joi.string().valid('totp', 'sms', 'email').required(),
      requestId: Joi.string().optional(),
      headers: Joi.object().optional().unknown(true)
    });
    await this.validar(schema, payload);
  }

  static async listPaises(payload: any): Promise<void> {
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

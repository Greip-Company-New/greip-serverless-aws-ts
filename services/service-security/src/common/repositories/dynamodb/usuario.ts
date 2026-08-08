// Acceso a la tabla de usuarios (DynamoDB TBL_GREIP_USUARIOS_<ENV>).
import { DynamoDBService } from 'ly-nodejs-ts-common';
import { scanAll } from './scan';
import { UsuarioDynamo } from '../../models';

export const SK_PROFILE = 'PROFILE';

function tablaUsuarios(): string {
  return process.env.TABLA_USUARIOS || 'TBL_GREIP_USUARIOS_DEV';
}

export class UsuarioRepository {
  private db: DynamoDBService;

  constructor() {
    this.db = new DynamoDBService();
  }

  userPk(userId: string): string {
    return `USER#${userId}`;
  }

  documentKey(type: string, number: string): string {
    return `${type}#${number}`;
  }

  async getById(userId: string): Promise<UsuarioDynamo | null> {
    const item = await this.db.getItem(tablaUsuarios(), { pk: this.userPk(userId), sk: SK_PROFILE });
    return item || null;
  }

  async getByEmail(email: string): Promise<UsuarioDynamo | null> {
    const items = await this.db.query({
      tableName: tablaUsuarios(),
      indexName: 'IdxUserEmail',
      keyConditionExpression: 'email = :email',
      expressionAttributeValues: { ':email': email.toLowerCase().trim() },
      limit: 1
    });
    return items.length > 0 ? (items[0] as UsuarioDynamo) : null;
  }

  async getByDocument(type: string, number: string): Promise<UsuarioDynamo | null> {
    const items = await this.db.query({
      tableName: tablaUsuarios(),
      indexName: 'IdxUserDocument',
      keyConditionExpression: 'documentKey = :documentKey',
      expressionAttributeValues: { ':documentKey': this.documentKey(type, number) },
      limit: 1
    });
    return items.length > 0 ? (items[0] as UsuarioDynamo) : null;
  }

  async emailExists(email: string): Promise<boolean> {
    return (await this.getByEmail(email)) !== null;
  }

  async documentExists(type: string, number: string): Promise<boolean> {
    return (await this.getByDocument(type, number)) !== null;
  }

  async create(usuario: UsuarioDynamo): Promise<void> {
    await this.db.putItem(tablaUsuarios(), usuario);
  }

  /**
   * Actualiza campos del perfil. Si cambian atributos de clave de GSI
   * (email / documentKey) la tabla no permite UpdateItem: se rehace el item.
   */
  async actualizar(userId: string, campos: Partial<UsuarioDynamo>): Promise<UsuarioDynamo | null> {
    const actual = await this.getById(userId);
    if (!actual) {
      return null;
    }

    const emailCambia = campos.email !== undefined && campos.email.toLowerCase().trim() !== actual.email;
    const documentoCambia =
      (campos.documentType !== undefined || campos.documentNumber !== undefined) &&
      this.documentKey(campos.documentType || actual.documentType, campos.documentNumber || actual.documentNumber) !== actual.documentKey;

    const actualizado: UsuarioDynamo = {
      ...actual,
      ...campos,
      email: campos.email !== undefined ? campos.email.toLowerCase().trim() : actual.email,
      documentKey:
        campos.documentType !== undefined || campos.documentNumber !== undefined
          ? this.documentKey(campos.documentType || actual.documentType, campos.documentNumber || actual.documentNumber)
          : actual.documentKey,
      updatedAt: new Date().toISOString()
    };

    if (emailCambia || documentoCambia) {
      // DynamoDB no permite cambiar claves de GSI con UpdateItem: delete + put.
      await this.db.deleteItem(tablaUsuarios(), { pk: this.userPk(userId), sk: SK_PROFILE });
      await this.db.putItem(tablaUsuarios(), actualizado);
      return actualizado;
    }

    await this.db.updateItem({
      tableName: tablaUsuarios(),
      key: { pk: this.userPk(userId), sk: SK_PROFILE },
      updateExpression:
        'SET ' +
        Object.keys(campos)
          .map((k) => `#${k} = :${k}`)
          .join(', ') +
        ', #updatedAt = :updatedAt',
      expressionAttributeNames: {
        ...Object.keys(campos).reduce((acc, k) => ({ ...acc, [`#${k}`]: k }), {}),
        '#updatedAt': 'updatedAt'
      },
      expressionAttributeValues: {
        ...Object.keys(campos).reduce((acc, k) => ({ ...acc, [`:${k}`]: (campos as any)[k] }), {}),
        ':updatedAt': new Date().toISOString()
      }
    });
    return (await this.getById(userId)) as UsuarioDynamo;
  }

  async deletePhysical(userId: string): Promise<void> {
    await this.db.deleteItem(tablaUsuarios(), { pk: this.userPk(userId), sk: SK_PROFILE });
  }

  async list(page: number, pageSize: number, filtros?: { status?: string; email?: string; document?: string }): Promise<{ data: UsuarioDynamo[]; total: number }> {
    const todos = (await scanAll({
      TableName: tablaUsuarios(),
      FilterExpression: 'sk = :sk',
      ExpressionAttributeValues: { ':sk': SK_PROFILE }
    })) as UsuarioDynamo[];
    let items = todos;
    if (filtros?.status) {
      items = items.filter((u) => u.status === filtros.status);
    }
    if (filtros?.email) {
      const q = filtros.email.toLowerCase().trim();
      items = items.filter((u) => u.email && u.email.includes(q));
    }
    if (filtros?.document) {
      items = items.filter((u) => (u.documentType + '#' + u.documentNumber).includes(filtros.document as string));
    }
    items.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    const total = items.length;
    const inicio = (page - 1) * pageSize;
    return { data: items.slice(inicio, inicio + pageSize), total };
  }
}

export function mapPublicUser(usuario: UsuarioDynamo): any {
  return {
    userId: usuario.userId,
    tenant: usuario.tenant,
    email: usuario.email,
    documentType: usuario.documentType,
    documentNumber: usuario.documentNumber,
    firstName: usuario.firstName,
    fatherLastName: usuario.fatherLastName,
    motherLastName: usuario.motherLastName,
    phone: usuario.phone,
    status: usuario.status,
    mfa: {
      totp: { active: usuario.mfa?.totp?.active || false, verified: usuario.mfa?.totp?.verified || false },
      sms: { active: usuario.mfa?.sms?.active || false, verified: usuario.mfa?.sms?.verified || false },
      email: { active: usuario.mfa?.email?.active || false, verified: usuario.mfa?.email?.verified || false }
    },
    createdBy: usuario.createdBy,
    createdByChannel: usuario.createdByChannel,
    createdAt: usuario.createdAt,
    updatedBy: usuario.updatedBy,
    updatedByChannel: usuario.updatedByChannel,
    updatedAt: usuario.updatedAt
  };
}

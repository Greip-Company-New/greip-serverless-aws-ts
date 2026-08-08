// Servicio de usuarios y RBAC.
import { UsuarioService } from '../common/usuario-service';
import { registerAudit } from '../common/audit';
import { Helpers, DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from 'ly-nodejs-ts-common';
import { AUDIT_EVENTS, USER_AUDIT_FIELDS } from '../common/constants';

export default class UsuarioLmbService {
  private usuarioService: UsuarioService;

  constructor() {
    this.usuarioService = new UsuarioService();
  }

  private ctx(payload: any) {
    const headers = payload?.headers || {};
    return {
      requestId: payload?.requestId,
      ip: headers['X-Forwarded-For'] || headers['x-forwarded-for'] || headers['Source-Ip'] || '',
      userAgent: headers['User-Agent'] || headers['user-agent'] || '',
      channel: headers['channel'] || headers['Channel'] || headers['Canal'] || headers['canal'] || ''
    };
  }

  async createUser(payload: any, identity: any): Promise<any> {
    const { ip, userAgent, channel } = this.ctx(payload);
    const resultado = await this.usuarioService.createUser({ ...payload, createdBy: identity?.sub || 'SYSTEM', channel });
    await registerAudit(
      {
        action: AUDIT_EVENTS.USER_CREATED,
        entity: 'USER',
        entityId: resultado.user.userId,
        actor: identity?.sub || resultado.user.email,
        sourceIp: ip,
        userAgent,
        detail: { email: resultado.user.email }
      },
      process.env.TENANT_DEFAULT || 'GREIP'
    );
    await Helpers.registerEntityChange({
      entity: 'user',
      entityKey: resultado.user.userId,
      tenantId: identity?.tenantId,
      changeType: 'CREATE',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      changes: Helpers.buildEntityChanges(null, resultado.user, USER_AUDIT_FIELDS)
    }).catch((err) => console.error('[entity-audit] createUser fallo', err));
    return resultado;
  }

  async updateUser(payload: any, identity: any): Promise<any> {
    const { userId, headers, requestId, ...campos } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!userId) {
      throw new Error('userId es obligatorio');
    }
    const antes = await this.usuarioService.getUser(userId);
    const usuario = await this.usuarioService.updateUser(userId, { ...campos, channel }, identity?.sub);
    await registerAudit(
      {
        action: AUDIT_EVENTS.USER_UPDATED,
        entity: 'USER',
        entityId: userId,
        actor: identity?.sub,
        sourceIp: ip,
        userAgent,
        detail: Object.keys(campos)
      },
      process.env.TENANT_DEFAULT || 'GREIP'
    );
    const mapeo = USER_AUDIT_FIELDS;
    const antesUser = antes?.user || null;
    const despuesUser = { ...antesUser, ...campos };
    const cambios = Helpers.buildEntityChanges(antesUser, despuesUser, mapeo);
    await Helpers.registerEntityChange({
      entity: 'user',
      entityKey: userId,
      tenantId: identity?.tenantId,
      changeType: 'UPDATE',
      status: usuario.status,
      userId: identity?.sub || 'SYSTEM',
      channel,
      changes: cambios
    }).catch((err) => console.error('[entity-audit] updateUser fallo', err));
    return usuario;
  }

  async deleteUser(payload: any, identity: any): Promise<any> {
    const { userId } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!userId) {
      throw new Error('userId es obligatorio');
    }
    const antes = await this.usuarioService.getUser(userId);
    await this.usuarioService.deleteUser(userId, identity?.sub, channel);
    await registerAudit(
      {
        action: AUDIT_EVENTS.USER_DELETED,
        entity: 'USER',
        entityId: userId,
        actor: identity?.sub,
        sourceIp: ip,
        userAgent,
        detail: { canal: channel }
      },
      process.env.TENANT_DEFAULT || 'GREIP'
    );
    const antesUser = antes?.user || null;
    await Helpers.registerEntityChange({
      entity: 'user',
      entityKey: userId,
      tenantId: identity?.tenantId,
      changeType: 'DELETE',
      status: 'I',
      userId: identity?.sub || 'SYSTEM',
      channel,
      changes: Helpers.buildEntityChanges(antesUser, null, USER_AUDIT_FIELDS)
    }).catch((err) => console.error('[entity-audit] deleteUser fallo', err));
    return { deleted: true };
  }

  async listUsers(payload: any): Promise<any> {
    const page = Number(payload.page) || DEFAULT_PAGE;
    const pageSize = Number(payload.pageSize) || DEFAULT_PAGE_SIZE;
    const filtros = { status: payload.status, email: payload.email, document: payload.document };
    return await this.usuarioService.listUsers(page, pageSize, filtros);
  }

  async getUser(payload: any): Promise<any> {
    const { userId } = payload;
    if (!userId) {
      throw new Error('userId es obligatorio');
    }
    return await this.usuarioService.getUser(userId);
  }

  async assignRoles(payload: any, identity: any): Promise<any> {
    const { userId, roles } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!userId || !Array.isArray(roles) || roles.length === 0) {
      throw new Error('userId y roles son obligatorios');
    }
    const asignados = [];
    for (const roleId of roles) {
      await this.usuarioService.assignRole(userId, roleId, identity?.sub, channel);
      asignados.push(roleId);
    }
    await registerAudit(
      {
        action: AUDIT_EVENTS.ROLE_ASSIGNED,
        entity: 'USER',
        entityId: userId,
        actor: identity?.sub,
        sourceIp: ip,
        userAgent,
        detail: { roles: asignados, canal: channel }
      },
      process.env.TENANT_DEFAULT || 'GREIP'
    );
    await Helpers.registerEntityChange({
      entity: 'user',
      entityKey: userId,
      tenantId: identity?.tenantId,
      changeType: 'ASSIGN',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      changes: { roles: { after: asignados } }
    }).catch((err) => console.error('[entity-audit] assignRoles fallo', err));
    return { assigned: asignados };
  }

  async removeRole(payload: any, identity: any): Promise<any> {
    const { userId, roleId } = payload;
    const { ip, userAgent, channel } = this.ctx(payload);
    if (!userId || !roleId) {
      throw new Error('userId y roleId son obligatorios');
    }
    await this.usuarioService.removeRole(userId, roleId);
    await registerAudit(
      {
        action: AUDIT_EVENTS.ROLE_REMOVED,
        entity: 'USER',
        entityId: userId,
        actor: identity?.sub,
        sourceIp: ip,
        userAgent,
        detail: { roleId }
      },
      process.env.TENANT_DEFAULT || 'GREIP'
    );
    await Helpers.registerEntityChange({
      entity: 'user',
      entityKey: userId,
      tenantId: identity?.tenantId,
      changeType: 'REMOVE',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      changes: { roles: { before: [roleId], after: [] } }
    }).catch((err) => console.error('[entity-audit] removeRole fallo', err));
    return { removed: true };
  }

  async getUserPermissions(payload: any): Promise<any> {
    const { userId } = payload;
    if (!userId) {
      throw new Error('userId es obligatorio');
    }
    const permissions = await this.usuarioService.getUserPermissions(userId);
    return { userId, permissions };
  }

  async createRole(payload: any, identity: any): Promise<any> {
    const { ip, userAgent, channel } = this.ctx(payload);
    const rol = await this.usuarioService.createRole(payload, identity?.sub, channel);
    await registerAudit(
      {
        action: AUDIT_EVENTS.ROLE_CREATED,
        entity: 'ROLE',
        entityId: String(rol.id),
        actor: identity?.sub,
        sourceIp: ip,
        userAgent,
        detail: { code: rol.code, canal: channel }
      },
      process.env.TENANT_DEFAULT || 'GREIP'
    );
    await Helpers.registerEntityChange({
      entity: 'role',
      entityKey: String(rol.id),
      tenantId: identity?.tenantId,
      changeType: 'CREATE',
      status: 'A',
      userId: identity?.sub || 'SYSTEM',
      channel,
      changes: {
        code: { before: null, after: rol.code },
        name: { before: null, after: rol.name },
        description: { before: null, after: rol.description || '' }
      }
    }).catch((err) => console.error('[entity-audit] createRole fallo', err));
    return rol;
  }

  async listRoles(): Promise<any[]> {
    return await this.usuarioService.listRoles();
  }

  async listPermissions(): Promise<any[]> {
    return await this.usuarioService.listPermissions();
  }
}

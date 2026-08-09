// Servicio de autenticacion: login, MFA, refresh, logout, recuperacion de contrasena.
import { LambdaService, Helpers, ResponseFactory } from 'ly-nodejs-ts-common';
import { UsuarioRepository } from '../common/repositories/dynamodb/usuario';
import { SesionService } from '../common/sesion-service';
import { MfaService } from '../common/mfa-service';
import { UsuarioService } from '../common/usuario-service';
import { verifyPassword } from '../common/password';
import { firmarToken, verificarToken } from '../common/token';
import { UsuarioDynamo } from '../common/models';
import {
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_MIN,
  TOKEN_TYPE_RESET,
  RESET_TOKEN_TTL_MIN,
  TOKEN_TYPE_MFA,
  MFA_TOKEN_TTL_MIN,
  STATUS_ACTIVE,
  AUDIT_EVENTS
} from '../common/constants';

function businessError(statusCode: number, message: string): never {
  throw ResponseFactory.error(message, statusCode);
}

export default class AuthService {
  private usuarioRepo: UsuarioRepository;
  private sesionService: SesionService;
  private mfaService: MfaService;
  private usuarioService: UsuarioService;
  private lambdaService: LambdaService;

  constructor() {
    this.usuarioRepo = new UsuarioRepository();
    this.sesionService = new SesionService();
    this.mfaService = new MfaService();
    this.usuarioService = new UsuarioService();
    this.lambdaService = new LambdaService();
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

  private registrarEvento(params: any, tenant: string, channel: string = ''): Promise<void> {
    return Helpers.registerEntityChange({
      entity: params.entity,
      entityKey: params.entityId || params.actor || 'SYSTEM',
      tenant,
      action: params.action,
      userId: params.actor,
      channel: channel || 'SYSTEM',
      sourceIp: params.sourceIp,
      userAgent: params.userAgent,
      changes: params.detail || {}
    }).catch((err) => console.error('[entity-audit] evento fallo', err));
  }

  private mfaActive(usuario: UsuarioDynamo): boolean {
    const mfa = usuario.mfa || {};
    return Boolean(mfa.totp?.active || mfa.sms?.active || mfa.email?.active);
  }

  async login(payload: any): Promise<any> {
    const { ip, userAgent, channel: channelHeader } = this.ctx(payload);
    const { email, documentType, documentNumber, password, channel } = payload;

    if (!channelHeader) {
      throw businessError(400, 'Header channel es obligatorio');
    }

    const usuario = email
      ? await this.usuarioRepo.getByEmail(email)
      : documentType && documentNumber
        ? await this.usuarioRepo.getByDocument(documentType, documentNumber)
        : null;

    if (!usuario) {
      await this.registrarEvento(
        { action: AUDIT_EVENTS.LOGIN_FAILED, entity: 'USER', entityId: email || `${documentType}#${documentNumber}`, actor: email, sourceIp: ip, userAgent, detail: { motivo: 'usuario no encontrado' } },
        process.env.TENANT_DEFAULT || 'GREIP', channelHeader
      );
      throw businessError(401, 'Credenciales invalidas');
    }

    if (usuario.lockedUntil && new Date(usuario.lockedUntil) > new Date()) {
      await this.registrarEvento(
        { action: AUDIT_EVENTS.LOGIN_FAILED, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { motivo: 'usuario bloqueado' } },
        usuario.tenant, channelHeader
      );
      throw businessError(423, `Usuario bloqueado temporalmente. Intentelo mas tarde`);
    }
    if (usuario.status !== STATUS_ACTIVE) {
      await this.registrarEvento(
        { action: AUDIT_EVENTS.LOGIN_FAILED, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { motivo: 'usuario inactivo' } },
        usuario.tenant, channelHeader
      );
      throw businessError(403, 'Usuario inactivo');
    }

    if (!verifyPassword(password, usuario.password)) {
      const intentos = (usuario.failedAttempts || 0) + 1;
      const campos: any = { failedAttempts: intentos };
      if (intentos >= MAX_LOGIN_ATTEMPTS) {
        campos.lockedUntil = new Date(Date.now() + LOCKOUT_MIN * 60 * 1000).toISOString();
        campos.failedAttempts = 0;
      }
      await this.usuarioRepo.actualizar(usuario.userId, campos);
      await this.registrarEvento(
        { action: AUDIT_EVENTS.LOGIN_FAILED, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { intento: intentos, email: usuario.email } },
        usuario.tenant, channelHeader
      );
      if (campos.lockedUntil) {
        await this.registrarEvento(
          { action: AUDIT_EVENTS.LOCKED, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent },
          usuario.tenant, channelHeader
        );
      }
      throw businessError(401, 'Credenciales invalidas');
    }

    if (usuario.failedAttempts > 0) {
      await this.usuarioRepo.actualizar(usuario.userId, { failedAttempts: 0, lockedUntil: null });
    }

    if (this.mfaActive(usuario)) {
      const canalElegido = (channel || 'TOTP').toUpperCase();
      const { challengeId, maskedDestination } = await this.mfaService.createChallenge(usuario, canalElegido);
      const mfaToken = await firmarToken(
        { sub: usuario.userId, tenant: usuario.tenant, type: TOKEN_TYPE_MFA },
        MFA_TOKEN_TTL_MIN
      );
      return {
        requiresMfa: true,
        channel: canalElegido,
        challengeId,
        maskedDestination,
        mfaToken,
        expiresAt: Date.now() + MFA_TOKEN_TTL_MIN * 60 * 1000
      };
    }

    const permissions = await this.usuarioService.getUserPermissions(usuario.userId);
    const roles = await this.usuarioService.getUserRoles(usuario.userId);
    const resultado = await this.sesionService.startSession(usuario, { permissions, roles, userAgent, ip, channel: channelHeader });
    await this.registrarEvento(
      { action: AUDIT_EVENTS.LOGIN_SUCCESS, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { canal: channelHeader, email: usuario.email } },
      usuario.tenant, channelHeader
    );
    return resultado;
  }

  async verifyMfa(payload: any): Promise<any> {
    const { mfaToken, challengeId, code } = payload;
    const { ip, userAgent, channel: channelHeader } = this.ctx(payload);

    let identidad: any;
    try {
      identidad = await verificarToken(mfaToken);
    } catch (error) {
      throw businessError(401, 'Token MFA invalido o expirado');
    }
    if (identidad.type !== TOKEN_TYPE_MFA) {
      throw businessError(401, 'Token MFA invalido');
    }

    const usuario = await this.usuarioRepo.getById(identidad.sub);
    if (!usuario) {
      throw businessError(404, 'Usuario no encontrado');
    }

    const valido = await this.mfaService.verifyCode(usuario.tenant, usuario.userId, challengeId, code);
    if (!valido) {
      await this.registrarEvento(
        { action: AUDIT_EVENTS.MFA_FAILED, entity: 'MFA', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent },
        usuario.tenant, channelHeader
      );
      throw businessError(400, 'Codigo de verificacion invalido');
    }

    const permissions = await this.usuarioService.getUserPermissions(usuario.userId);
    const roles = await this.usuarioService.getUserRoles(usuario.userId);
    const resultado = await this.sesionService.startSession(usuario, { permissions, roles, userAgent, ip, channel: channelHeader });
    await this.registrarEvento(
      { action: AUDIT_EVENTS.MFA_VERIFIED, entity: 'MFA', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { canal: channelHeader, email: usuario.email } },
      usuario.tenant, channelHeader
    );
    return resultado;
  }

  async refreshToken(payload: any): Promise<any> {
    const { refreshToken } = payload;
    const { ip, userAgent, channel: channelHeader } = this.ctx(payload);
    const resultado = await this.sesionService.refreshSession(refreshToken, userAgent, ip, channelHeader);
    try {
      const identidad = await verificarToken(refreshToken);
      if (identidad && identidad.sub && identidad.tenant) {
        await this.registrarEvento(
          { action: AUDIT_EVENTS.REFRESH, entity: 'SESSION', entityId: identidad.sub, actor: identidad.sub, sourceIp: ip, userAgent, detail: { canal: channelHeader } },
          identidad.tenant, channelHeader
        );
      }
    } catch (error) {
      console.error('[entity-audit] refresh event fallo', error);
    }
    return resultado;
  }

  async logout(payload: any, identity: any): Promise<any> {
    const { refreshToken, logoutAll } = payload;
    const { ip, userAgent, channel: channelHeader } = this.ctx(payload);
    if (!refreshToken) {
      throw businessError(400, 'refreshToken es obligatorio');
    }
    await this.sesionService.closeSession(refreshToken, Boolean(logoutAll));
    if (identity) {
      await this.registrarEvento(
        { action: AUDIT_EVENTS.LOGOUT, entity: 'SESSION', entityId: identity.sub, actor: identity.sub, sourceIp: ip, userAgent },
        identity.tenant, channelHeader
      );
    }
    return { logout: true };
  }

  async changePassword(payload: any, identity: any): Promise<any> {
    const { currentPassword, newPassword } = payload;
    const { ip, userAgent, channel: channelHeader } = this.ctx(payload);
    if (!identity) {
      throw businessError(401, 'No autenticado');
    }
    await this.usuarioService.changePassword(identity.sub, currentPassword, newPassword);
    await this.registrarEvento(
      { action: AUDIT_EVENTS.PASSWORD_CHANGED, entity: 'USER', entityId: identity.sub, actor: identity.sub, sourceIp: ip, userAgent },
      identity.tenant, channelHeader
    );
    return { passwordUpdated: true };
  }

async requestRecovery(payload: any): Promise<any> {
    const { email } = payload;
    const { requestId, ip, userAgent, channel: channelHeader } = this.ctx(payload);
    const usuario = email ? await this.usuarioRepo.getByEmail(email) : null;

    if (usuario && usuario.status === STATUS_ACTIVE) {
      const resetToken = await firmarToken(
        { sub: usuario.userId, tenant: usuario.tenant, type: TOKEN_TYPE_RESET },
        RESET_TOKEN_TTL_MIN
      );
      await this.sendRecoveryEmail(usuario, resetToken, requestId);
      await this.registrarEvento(
        { action: AUDIT_EVENTS.RECOVERY_REQUESTED, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { email: usuario.email } },
        usuario.tenant, channelHeader
      );
    }

    // Respuesta generica para no revelar si el email existe.
    return { sent: true };
  }

  private async sendRecoveryEmail(usuario: UsuarioDynamo, resetToken: string, requestId?: string): Promise<void> {
    const baseUrl = process.env.FRONTEND_URL || 'https://greip.com.pe';
    const link = `${baseUrl}/reestablecer-contrasena?token=${resetToken}`;
    const html = `<p>Hola ${usuario.firstName},</p><p>Recibimos una solicitud para reestablecer tu contrasena.</p><p>El enlace es valido por ${RESET_TOKEN_TTL_MIN} minutos:</p><p><a href="${link}">Reestablecer contrasena</a></p><p>Si no solicitaste este cambio, ignora este correo.</p>`;

    await this.lambdaService.invokeLambda({
      functionName: process.env.LMB_EMAIL || 'SRV-CROSS-LMB-EMAIL',
      payload: {
        origin: 'LAMBDA_EVENT',
        action: 'sendEmail',
        payload: {
          to: [usuario.email],
          subject: 'Reestablecimiento de contrasena - GREIP COMPANY',
          html,
          requestId
        }
      }
    });
  }

  async resetPassword(payload: any): Promise<any> {
    const { resetToken, newPassword } = payload;
    const { ip, userAgent, channel: channelHeader } = this.ctx(payload);

    let identidad: any;
    try {
      identidad = await verificarToken(resetToken);
    } catch (error) {
      throw businessError(401, 'Token de recuperacion invalido o expirado');
    }
    if (identidad.type !== TOKEN_TYPE_RESET) {
      throw businessError(401, 'Token de recuperacion invalido');
    }

    const usuario = await this.usuarioRepo.getById(identidad.sub);
    if (!usuario) {
      throw businessError(404, 'Usuario no encontrado');
    }

    await this.usuarioService.resetPassword(usuario.userId, newPassword);
    await this.registrarEvento(
      { action: AUDIT_EVENTS.PASSWORD_RESET, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { email: usuario.email } },
      usuario.tenant, channelHeader
    );
    return { passwordUpdated: true };
  }
}

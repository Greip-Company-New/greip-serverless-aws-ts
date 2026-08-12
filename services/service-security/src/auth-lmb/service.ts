// Servicio de autenticacion: login, MFA, refresh, logout, recuperacion de contrasena.
import crypto from 'crypto';
import { Helpers, ResponseFactory } from 'ly-nodejs-ts-common';
import { UsuarioRepository } from '../common/repositories/dynamodb/usuario';
import { SesionService } from '../common/sesion-service';
import { MfaService } from '../common/mfa-service';
import { UsuarioService } from '../common/usuario-service';
import { verifyPassword } from '../common/password';
import { firmarToken, verificarToken } from '../common/token';
import { UsuarioDynamo } from '../common/models';
import { RbacRepository } from '../common/repositories/postgres/rbac';
import { enviarCorreoTerceros } from '../common/notificaciones';
import {
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_MIN,
  TOKEN_TYPE_MFA,
  MFA_TOKEN_TTL_MIN,
  STATUS_ACTIVE,
  MFA_CHANNELS,
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
  private rbac: RbacRepository;

  constructor() {
    this.usuarioRepo = new UsuarioRepository();
    this.sesionService = new SesionService();
    this.mfaService = new MfaService();
    this.usuarioService = new UsuarioService();
    this.rbac = new RbacRepository();
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
    const tenant = await this.rbac.getTenant(usuario.tenant);
    if (!tenant || tenant.status !== 'A') {
      throw businessError(403, 'Su empresa no esta activa. Contacte al administrador.');
    }
    if (usuario.emailVerified !== true) {
      await this.registrarEvento(
        { action: AUDIT_EVENTS.LOGIN_FAILED, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { motivo: 'email no verificado' } },
        usuario.tenant, channelHeader
      );
      throw businessError(403, 'Email no verificado. Por favor confirma tu correo electronico para activar tu cuenta.');
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
      const mfa = usuario.mfa || {};
      const activeChannels: string[] = [];
      if (mfa.totp?.active) activeChannels.push('TOTP');
      if (mfa.sms?.active) activeChannels.push('SMS');
      if (mfa.email?.active) activeChannels.push('EMAIL');
      const canalElegido = (channel && activeChannels.includes(channel.toUpperCase()) ? channel : activeChannels[0]).toUpperCase();
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
        activeChannels,
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

  async switchMfaChannel(payload: any): Promise<any> {
    const { mfaToken, channel } = payload;
    if (!mfaToken || !channel) {
      throw businessError(400, 'mfaToken y channel son obligatorios');
    }
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
    const canal = channel.toUpperCase();
    if (!MFA_CHANNELS.includes(canal as any)) {
      throw businessError(400, 'Canal MFA no valido');
    }
    const { challengeId, maskedDestination } = await this.mfaService.createChallenge(usuario, canal);
    return { channel: canal, challengeId, maskedDestination };
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
    const usuario = await this.usuarioRepo.getById(identity.sub);
    await this.usuarioService.changePassword(identity.sub, currentPassword, newPassword);
    if (usuario?.email) {
      const nombre = `${usuario.firstName || ''} ${usuario.fatherLastName || ''}`.trim() || usuario.email;
      enviarCorreoTerceros(
        identity.tenant,
        [usuario.email],
        'Tu contrasena ha sido cambiada - GREIP COMPANY',
        `<p>Hola ${nombre},</p><p>Tu contrasena en GREIP COMPANY fue cambiada exitosamente.</p><p>Si no hiciste este cambio, contacta al administrador de inmediato.</p>`
      );
    }
    await this.registrarEvento(
      { action: AUDIT_EVENTS.PASSWORD_CHANGED, entity: 'USER', entityId: identity.sub, actor: identity.sub, sourceIp: ip, userAgent },
      identity.tenant, channelHeader
    );
    return { passwordUpdated: true };
  }

  async requestRecovery(payload: any): Promise<any> {
    const { email, channel } = payload;
    const { ip, userAgent, channel: channelHeader } = this.ctx(payload);
    const usuario = email ? await this.usuarioRepo.getByEmail(email) : null;

    if (usuario && usuario.status === STATUS_ACTIVE) {
      const tenantRecovery = await this.rbac.getTenant(usuario.tenant);
      if (!tenantRecovery || tenantRecovery.status !== 'A') {
        return { sent: true };
      }
      const canal = (channel || 'EMAIL').toUpperCase();
      try {
        await this.mfaService.createRecoveryChallenge(usuario, canal);
      } catch (error) {
        // El email existe y esta activo pero el envio fallo (p. ej. SES en sandbox
        // o identidad no verificada). Se propaga el error real para que el usuario
        // pueda diagnosticar, aunque revele que la cuenta existe.
        console.error('[recovery] envio de codigo OTP fallo', error);
        const mensaje = (error as any)?.message || 'No se pudo enviar el codigo de recuperacion';
        throw businessError(500, mensaje);
      }
      await this.registrarEvento(
        { action: AUDIT_EVENTS.RECOVERY_REQUESTED, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { email: usuario.email, canal } },
        usuario.tenant, channelHeader
      );
    }

    // Email no existe o inactivo: respuesta generica para no revelar la existencia.
    return { sent: true };
  }

  async resetPassword(payload: any): Promise<any> {
    const { email, code, newPassword } = payload;
    const { ip, userAgent, channel: channelHeader } = this.ctx(payload);

    const usuario = email ? await this.usuarioRepo.getByEmail(email) : null;
    if (!usuario) {
      throw businessError(401, 'Codigo de recuperacion invalido o expirado');
    }

    const valido = await this.mfaService.verifyRecoveryCode(usuario.tenant, usuario.userId, code);
    if (!valido) {
      await this.registrarEvento(
        { action: AUDIT_EVENTS.RECOVERY_FAILED, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { email: usuario.email } },
        usuario.tenant, channelHeader
      );
      throw businessError(401, 'Codigo de recuperacion invalido o expirado');
    }

    await this.usuarioService.resetPassword(usuario.userId, newPassword);
    await this.registrarEvento(
      { action: AUDIT_EVENTS.PASSWORD_RESET, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { email: usuario.email } },
      usuario.tenant, channelHeader
    );
    return { passwordUpdated: true };
  }

  async verifyEmail(payload: any): Promise<any> {
    const { token, email } = payload;
    const { ip, userAgent } = this.ctx(payload);
    // No se valida via FRONTEND_URL: el enlace invoca la API y luego redirige al login.
    const loginUrl = process.env.LOGIN_URL || `${process.env.FRONTEND_URL || 'https://app.greip.com.pe'}/login`;

    if (!token || !email) {
      return { email: email || '', verified: false, redirectUrl: `${loginUrl}?emailVerified=failed` };
    }
    const emailLimpio = email.toLowerCase().trim();
    const usuario = await this.usuarioRepo.getByEmail(emailLimpio);
    if (!usuario) {
      // No se revela si la cuenta existe.
      return { email: emailLimpio, verified: false, redirectUrl: `${loginUrl}?emailVerified=failed` };
    }
    if (usuario.emailVerified === true) {
      return { email: usuario.email, verified: true, alreadyVerified: true, redirectUrl: `${loginUrl}?emailVerified=1` };
    }
    if (!usuario.emailVerificationToken || !tokenTimingSafe(usuario.emailVerificationToken, token)) {
      return { email: usuario.email, verified: false, redirectUrl: `${loginUrl}?emailVerified=failed` };
    }
    if (usuario.emailVerificationExpiresAt && new Date(usuario.emailVerificationExpiresAt) < new Date()) {
      return { email: usuario.email, verified: false, redirectUrl: `${loginUrl}?emailVerified=expired` };
    }

    const mfa = usuario.mfa || {};
    await this.usuarioRepo.actualizar(usuario.userId, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      mfa: {
        ...mfa,
        email: { active: mfa.email?.active || false, verified: true }
      }
    });
    await this.registrarEvento(
      { action: AUDIT_EVENTS.EMAIL_VERIFIED, entity: 'USER', entityId: usuario.userId, actor: usuario.userId, sourceIp: ip, userAgent, detail: { email: usuario.email } },
      usuario.tenant, userAgent
    );
    return { email: usuario.email, verified: true, redirectUrl: `${loginUrl}?emailVerified=1` };
  }
}

/** Comparacion de tokens resistente a timing attacks. */
function tokenTimingSafe(stored: string, candidate: string): boolean {
  const a = crypto.createHash('sha256').update(stored).digest();
  const b = crypto.createHash('sha256').update(candidate).digest();
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Servicio de MFA: desafios OTP (SMS/EMAIL via service-third-party) y TOTP local.
import crypto from 'crypto';
import { LambdaService } from 'ly-nodejs-ts-common';
import { MfaRepository } from './repositories/dynamodb/mfa';
import { sha256Hex } from './password';
import { generateOtp, generateRecoveryOtp, generateTotpSecret, verifyTotp, maskDestination } from './totp';
import { MFA_CHANNELS, MAX_OTP_ATTEMPTS, RECOVERY_OTP_TTL_MIN } from './constants';
import { UsuarioDynamo } from './models';

interface ResultadoEnvio {
  maskedDestination?: string;
  sent: boolean;
}

const LAMBDA_BREVO = () => process.env.LMB_BREVO || 'SRV-THYRD-LMB-BREVO';

export class MfaService {
  private repo: MfaRepository;
  private lambdaService: LambdaService;

  constructor() {
    this.repo = new MfaRepository();
    this.lambdaService = new LambdaService();
  }

  private async invokeTerceros(action: string, payload: any, tenantCode: string): Promise<any> {
    const result = await this.lambdaService.invokeLambda({
      functionName: LAMBDA_BREVO(),
      payload: { origin: 'LAMBDA_EVENT', action, payload: { ...payload, tenantCode } }
    });
    const raw = typeof result.payload === 'string' ? JSON.parse(result.payload) : result.payload;
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const inner = data?.payload;
    if (!inner || inner.success === false) {
      throw new Error(`Error en servicio de envio (${action}): ${inner?.message || 'respuesta invalida'}`);
    }
    return inner;
  }

  private async sendSms(tenant: string, phone: string, message: string): Promise<ResultadoEnvio> {
    const result = await this.invokeTerceros('sendSms', { phoneNumber: phone, message }, tenant);
    return { sent: result.success === true };
  }

  private async factorSecret(tenant: string, userId: string): Promise<string | null> {
    const factor = await this.repo.getFactor(tenant, userId, 'TOTP');
    return factor?.secret || null;
  }

  /**
   * Crea un desafio MFA para el usuario y envia el codigo por el canal solicitado.
   */
  async createChallenge(usuario: UsuarioDynamo, channel: string): Promise<{ challengeId: string; maskedDestination?: string }> {
    if (!MFA_CHANNELS.includes(channel as any)) {
      throw new Error('Canal MFA no valido');
    }
    const canalUppercase = channel.toUpperCase();
    const challengeId = crypto.randomUUID();
    let maskedDestination: string | undefined;

    if (canalUppercase === 'SMS') {
      const phone = usuario.phone;
      if (!phone) {
        throw new Error('El usuario no tiene telefono registrado para MFA SMS');
      }
      const codigo = generateOtp();
      await this.repo.createChallenge(usuario.tenant, usuario.userId, challengeId, 'MFA', 'SMS', sha256Hex(codigo));
      await this.sendSms(usuario.tenant, phone, `GREIP: tu codigo de verificacion es ${codigo}. Valido por 5 minutos.`);
      maskedDestination = maskDestination('SMS', phone);
    } else if (canalUppercase === 'EMAIL') {
      const email = usuario.email;
      if (!email) {
        throw new Error('El usuario no tiene email registrado para MFA EMAIL');
      }
      const codigo = generateOtp();
      await this.repo.createChallenge(usuario.tenant, usuario.userId, challengeId, 'MFA', 'EMAIL', sha256Hex(codigo));
      const nombre = `${usuario.firstName || ''} ${usuario.fatherLastName || ''}`.trim() || usuario.email;
      await this.invokeTerceros('sendEmail', {
        to: [email],
        subject: 'Codigo de verificacion - GREIP COMPANY',
        html: `<p>Hola ${nombre},</p><p>Tu codigo de verificacion es: <strong>${codigo}</strong></p><p>Usa este codigo para verificar tu identidad. Valido por 5 minutos.</p>`,
      }, usuario.tenant);
      maskedDestination = maskDestination('EMAIL', email);
    } else if (canalUppercase === 'TOTP') {
      const secreto = await this.factorSecret(usuario.tenant, usuario.userId);
      if (!secreto) {
        throw new Error('El usuario no tiene un secreto TOTP registrado');
      }
      // TOTP no requiere envio ni almacenamiento de desafio con codigo: se valida en el instante.
      await this.repo.createChallenge(usuario.tenant, usuario.userId, challengeId, 'MFA', 'TOTP', '');
    } else {
      throw new Error('Canal MFA no soportado');
    }

    return { challengeId, maskedDestination };
  }

  /**
   * Valida el codigo del desafio. Para TOTP compara contra el secreto del factor.
   */
  async verifyCode(tenant: string, userId: string, challengeId: string, code: string): Promise<boolean> {
    const desafio = await this.repo.getChallenge(tenant, userId, challengeId);
    if (!desafio) {
      throw new Error('Desafio no encontrado o expirado');
    }
    if (new Date(desafio.expiresAt) < new Date()) {
      throw new Error('El codigo ha expirado');
    }
    if (desafio.attempts >= MAX_OTP_ATTEMPTS) {
      throw new Error('Se superaron los intentos permitidos para el codigo');
    }

    if (desafio.channel === 'TOTP') {
      const secreto = await this.factorSecret(tenant, userId);
      if (!secreto || !verifyTotp(secreto, code)) {
        await this.repo.incrementAttempts(desafio);
        return false;
      }
    } else {
      if (sha256Hex(code) !== desafio.codeHash) {
        await this.repo.incrementAttempts(desafio);
        return false;
      }
    }

    await this.repo.deleteChallenge(tenant, userId, challengeId);
    return true;
  }

  /**
   * Recuperacion de contrasena: genera un OTP de 8 digitos, lo almacena como
   * desafio RECOVERY y lo envia por email o SMS (via service-cross).
   */
  async createRecoveryChallenge(usuario: UsuarioDynamo, channel: string): Promise<{ channel: string; maskedDestination?: string }> {
    const canalUppercase = channel.toUpperCase();
    if (canalUppercase !== 'EMAIL' && canalUppercase !== 'SMS') {
      throw new Error('Canal de recuperacion no valido');
    }

    const activo = await this.repo.getActiveRecoveryChallenge(usuario.tenant, usuario.userId);
    if (activo) {
      await this.repo.deleteChallenge(usuario.tenant, usuario.userId, this.repo.challengeIdFromSk(activo.sk));
    }

    const codigo = generateRecoveryOtp();
    const challengeId = crypto.randomUUID();
    await this.repo.createChallenge(usuario.tenant, usuario.userId, challengeId, 'RECOVERY', canalUppercase, sha256Hex(codigo));

    const destino = canalUppercase === 'SMS' ? usuario.phone : usuario.email;
    if (!destino) {
      throw new Error('El usuario no tiene destino de contacto para la recuperacion');
    }

    const mensaje = canalUppercase === 'SMS'
      ? `GREIP: tu codigo de recuperacion es ${codigo}. Valido por ${RECOVERY_OTP_TTL_MIN} minutos.`
      : `Tu codigo de recuperacion de contrasena GREIP es ${codigo}. Valido por ${RECOVERY_OTP_TTL_MIN} minutos. Si no solicitaste este cambio, ignora este mensaje.`;

    if (canalUppercase === 'SMS') {
      await this.invokeTerceros('sendSms', { phoneNumber: destino, message: mensaje }, usuario.tenant);
    } else {
      const nombre = `${usuario.firstName || ''} ${usuario.fatherLastName || ''}`.trim() || usuario.email;
      await this.invokeTerceros('sendEmail', {
        to: [destino],
        subject: 'Codigo de recuperacion de contrasena - GREIP COMPANY',
        html: `<p>Hola ${nombre},</p><p>Tu codigo de recuperacion de contrasena es: <strong>${codigo}</strong></p><p>Valido por ${RECOVERY_OTP_TTL_MIN} minutos. Si no solicitaste este cambio, ignora este mensaje.</p>`,
      }, usuario.tenant);
    }

    return { channel: canalUppercase, maskedDestination: maskDestination(canalUppercase, destino) };
  }

  /**
   * Valida el OTP de recuperacion activo del usuario. Cuenta intentos y elimina
   * el desafio una vez validado.
   */
  async verifyRecoveryCode(tenant: string, userId: string, code: string): Promise<boolean> {
    const desafio = await this.repo.getActiveRecoveryChallenge(tenant, userId);
    if (!desafio) {
      return false;
    }
    if (desafio.attempts >= MAX_OTP_ATTEMPTS) {
      return false;
    }
    if (sha256Hex(code) !== desafio.codeHash) {
      await this.repo.incrementAttempts(desafio);
      return false;
    }
    await this.repo.deleteChallenge(tenant, userId, this.repo.challengeIdFromSk(desafio.sk));
    return true;
  }

  async registerTotpFactor(tenant: string, userId: string, createdBy?: string): Promise<{ secret: string; otpauthUrl: string }> {
    const secreto = generateTotpSecret();
    await this.repo.saveFactor({
      pk: this.repo.mfaPk(tenant, userId),
      sk: 'TOTP',
      tenant,
      userId,
      channel: 'TOTP',
      active: true,
      verified: false,
      secret: secreto,
      createdBy: createdBy || 'SYSTEM',
      createdAt: new Date().toISOString(),
      updatedBy: createdBy || 'SYSTEM',
      updatedAt: new Date().toISOString()
    });
    const otpauthUrl = `otpauth://totp/GREIP:${userId}?secret=${secreto}&issuer=GREIP&algorithm=SHA1&digits=6&period=30`;
    return { secret: secreto, otpauthUrl };
  }

  async verifyAndActivateFactor(tenant: string, userId: string, channel: string, code: string, actor?: string): Promise<boolean> {
    if (channel === 'TOTP') {
      const secreto = await this.factorSecret(tenant, userId);
      if (!secreto || !verifyTotp(secreto, code)) {
        return false;
      }
      await this.repo.saveFactor({
        pk: this.repo.mfaPk(tenant, userId),
        sk: 'TOTP',
        tenant,
        userId,
        channel: 'TOTP',
        active: true,
        verified: true,
        secret: secreto,
        createdBy: actor || 'SYSTEM',
        createdAt: new Date().toISOString(),
        updatedBy: actor || 'SYSTEM',
        updatedAt: new Date().toISOString()
      });
      return true;
    }
    throw new Error('Solo TOTP soporta registro directo');
  }
}

// Servicio de MFA: desafios OTP (SMS/EMAIL via service-cross) y TOTP local.
import crypto from 'crypto';
import { LambdaService } from 'ly-nodejs-ts-common';
import { MfaRepository } from './repositories/dynamodb/mfa';
import { sha256Hex } from './password';
import { generateOtp, generateTotpSecret, verifyTotp, maskDestination } from './totp';
import { MFA_CHANNELS, MAX_OTP_ATTEMPTS } from './constants';
import { UsuarioDynamo } from './models';

interface ResultadoEnvio {
  maskedDestination?: string;
  sent: boolean;
}

export class MfaService {
  private repo: MfaRepository;
  private lambdaService: LambdaService;

  constructor() {
    this.repo = new MfaRepository();
    this.lambdaService = new LambdaService();
  }

  private async invokeCross(action: string, payload: any): Promise<any> {
    const functionName = action === 'sendSms' ? process.env.LMB_SMS || 'SRV-CROSS-LMB-SMS' : process.env.LMB_EMAIL || 'SRV-CROSS-LMB-EMAIL';
    const result = await this.lambdaService.invokeLambda({
      functionName,
      payload: { origin: 'LAMBDA_EVENT', action, payload }
    });
    const raw = typeof result.payload === 'string' ? JSON.parse(result.payload) : result.payload;
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const inner = data?.payload;
    if (!inner || inner.success === false) {
      throw new Error(`Error en servicio de envio (${action}): ${inner?.message || 'respuesta invalida'}`);
    }
    return inner;
  }

  private async sendSms(phone: string, message: string): Promise<ResultadoEnvio> {
    const result = await this.invokeCross('sendSms', { phoneNumber: phone, message });
    return { sent: result.success === true };
  }

  private async sendEmail(destino: string, subject: string, text: string): Promise<ResultadoEnvio> {
    const result = await this.invokeCross('sendEmail', { to: [destino], subject, text });
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
      await this.sendSms(phone, `GREIP: tu codigo de verificacion es ${codigo}. Valido por 5 minutos.`);
      maskedDestination = maskDestination('SMS', phone);
    } else if (canalUppercase === 'EMAIL') {
      const email = usuario.email;
      if (!email) {
        throw new Error('El usuario no tiene email registrado para MFA EMAIL');
      }
      const codigo = generateOtp();
      await this.repo.createChallenge(usuario.tenant, usuario.userId, challengeId, 'MFA', 'EMAIL', sha256Hex(codigo));
      await this.sendEmail(email, 'Codigo de verificacion GREIP', `Tu codigo de verificacion es ${codigo}. Valido por 5 minutos.`);
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
      if (!secreto || !verifyTotp(code, secreto)) {
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

  async registerTotpFactor(tenant: string, userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const secreto = generateTotpSecret();
    const factor = {
      pk: this.repo.mfaPk(tenant, userId),
      sk: 'TOTP',
      channel: 'TOTP',
      active: true,
      verified: false,
      secret: secreto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.repo.saveFactor(factor);
    const otpauthUrl = `otpauth://totp/GREIP:${userId}?secret=${secreto}&issuer=GREIP&algorithm=SHA1&digits=6&period=30`;
    return { secret: secreto, otpauthUrl };
  }

  async verifyAndActivateFactor(tenant: string, userId: string, channel: string, code: string): Promise<boolean> {
    if (channel === 'TOTP') {
      const secreto = await this.factorSecret(tenant, userId);
      if (!secreto || !verifyTotp(code, secreto)) {
        return false;
      }
      await this.repo.saveFactor({
        pk: this.repo.mfaPk(tenant, userId),
        sk: 'TOTP',
        channel: 'TOTP',
        active: true,
        verified: true,
        secret: secreto,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return true;
    }
    throw new Error('Solo TOTP soporta registro directo');
  }
}

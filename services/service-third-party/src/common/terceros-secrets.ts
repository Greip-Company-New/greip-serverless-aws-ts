// Acceso a las credenciales de terceros en AWS Secrets Manager.
// Path del secreto: Greip/ThirdParty/<tenant>  (Json: { brevo: { apiKey }, twilio: {...} })
import { SecretsManagerService } from 'ly-nodejs-ts-common';
import { SecretoTerceros } from './models';
import { nombreSecreto } from './config';

export class TercerosSecretsManager {
  private sm: SecretsManagerService;

  constructor() {
    // Cache deshabilitado: las escrituras de config deben verse de inmediato
    // y los secretos se leen una sola vez por invocacion.
    this.sm = new SecretsManagerService({ enabled: false });
  }

  async getSecretos(tenant: string): Promise<SecretoTerceros> {
    try {
      const valor = await this.sm.getSecretValue(nombreSecreto(tenant));
      if (!valor) {
        return {};
      }
      if (typeof valor === 'string') {
        try {
          return JSON.parse(valor);
        } catch {
          return {};
        }
      }
      return valor as SecretoTerceros;
    } catch (error: any) {
      if (error?.message?.includes('Secret not found')) {
        return {};
      }
      throw error;
    }
  }

  async guardarSecretos(tenant: string, secretos: SecretoTerceros): Promise<void> {
    const nombre = nombreSecreto(tenant);
    try {
      // Intento de actualizacion; si el secreto no existe, cae en createSecret.
      await this.sm.updateSecret(nombre, secretos, `Credenciales de notificacion terceros del tenant ${tenant}`);
    } catch (error: any) {
      if (error?.name === 'ResourceNotFoundException') {
        await this.sm.createSecret(nombre, secretos, `Credenciales de notificacion terceros del tenant ${tenant}`);
        return;
      }
      throw error;
    }
  }
}
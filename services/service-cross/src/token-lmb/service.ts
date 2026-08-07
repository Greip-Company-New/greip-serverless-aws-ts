import { SecretsManagerService, encryptAes, decryptAes, ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';
import { EncryptTokenRequest, DecryptTokenRequest, TokenCryptoConfig, TokenCryptoResult } from './models';

const secretsManager = new SecretsManagerService();

async function getTokenCryptoConfig(): Promise<TokenCryptoConfig> {
  const config = await secretsManager.getSecretValue(process.env.SM_ENCRIPTACION_TOKEN || 'Greip/Encriptacion/Token');
  if (!config || !config.algorithm || !config.key || !config.iv) {
    throw new Error('Crypto config missing in secret (algorithm, key, iv required)');
  }
  return { algorithm: config.algorithm, key: config.key, iv: config.iv };
}

export default class Service {

  static async encryptTokenData(payload: EncryptTokenRequest): Promise<any> {
    try {
      const config = await getTokenCryptoConfig();
      const result = encryptAes(payload.data, config.algorithm, config.key, config.iv);
      if (result.code !== 200 || result.encrypted === undefined) {
        throw new Error(result.message || 'Encryption failed');
      }
      const data: TokenCryptoResult = {
        encrypted: result.encrypted,
        algorithm: config.algorithm,
      };
      return ResponseFactory.success(data, MESSAGES_SUCCESS.PROCESS_SUCCESS);
    } catch (err: any) {
      console.error('encryptTokenData >>> ', err);
      return ResponseFactory.fromError(err);
    }
  }

  static async decryptTokenData(payload: DecryptTokenRequest): Promise<any> {
    try {
      const config = await getTokenCryptoConfig();
      const result = decryptAes(payload.encrypted, config.algorithm, config.key, config.iv);
      if (result.code !== 200 || result.decrypted === undefined) {
        throw new Error(result.message || 'Decryption failed');
      }
      const data: TokenCryptoResult = {
        decrypted: result.decrypted,
        algorithm: config.algorithm,
      };
      return ResponseFactory.success(data, MESSAGES_SUCCESS.PROCESS_SUCCESS);
    } catch (err: any) {
      console.error('decryptTokenData >>> ', err);
      return ResponseFactory.fromError(err);
    }
  }

}

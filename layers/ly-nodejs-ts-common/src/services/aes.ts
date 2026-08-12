import crypto from 'crypto';
import { CryptoResponseBase } from '../models/aes.interfaces.js';

export interface EncryptResponse extends CryptoResponseBase {
  encrypted?: string;
}

export interface DecryptResponse extends CryptoResponseBase {
  decrypted?: string;
}

const validateParams = (
  text: any,
  algorithm: string,
  key: string | Buffer,
  iv: string | Buffer,
  operation: 'encriptar' | 'desencriptar'
): { isValid: boolean; response?: EncryptResponse | DecryptResponse } => {
  if (text === undefined || text === null || text === '') {
    return { isValid: false, response: { code: 500, message: `El texto a ${operation} no debe ser vacio`, algorithm, key, iv, text: String(text) } };
  }
  if (!algorithm) {
    return { isValid: false, response: { code: 500, message: 'El algorithm no debe ser vacio', algorithm, key, iv, text: String(text) } };
  }
  if (!key) {
    return { isValid: false, response: { code: 500, message: 'El key no debe ser vacio', algorithm, key, iv, text: String(text) } };
  }
  if (!iv) {
    return { isValid: false, response: { code: 500, message: 'El iv no debe ser vacio', algorithm, key, iv, text: String(text) } };
  }

  // Prevenir que se intente procesar "[object Object]" que suele ser un error de coerción previa
  if (typeof text === 'string' && text === '[object Object]') {
    return { isValid: false, response: { code: 500, message: `El texto a ${operation} es la cadena "[object Object]". Esto indica que el dato se convirtió a string incorrectamente antes de esta llamada.`, algorithm, key, iv, text } };
  }

  return { isValid: true };
};

export const encryptAes = (
  text: any,
  algorithm: string,
  key: string | Buffer,
  iv: string | Buffer
): EncryptResponse => {
  const validation = validateParams(text, algorithm, key, iv, 'encriptar');
  if (!validation.isValid) {
    return validation.response as EncryptResponse;
  }

  // Si es un objeto, lo convertimos a JSON string automáticamente
  const textToEncrypt = typeof text === 'object' && !(text instanceof Buffer)
    ? JSON.stringify(text)
    : String(text);

  const response: EncryptResponse = {
    code: 200,
    message: 'Encrypted successful',
    algorithm,
    key,
    iv,
    text: textToEncrypt,
  };

  try {
    const cipher = crypto.createCipheriv(algorithm, key as crypto.CipherKey, iv as crypto.BinaryLike);
    let encrypted = cipher.update(textToEncrypt, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    response.encrypted = encrypted;
    return response;
  } catch (error: any) {
    return { ...response, code: 500, message: `Error en encryptAes: ${error.message}` };
  }
};

export const decryptAes = (
  text: string,
  algorithm: string,
  key: string | Buffer,
  iv: string | Buffer
): DecryptResponse => {
  const validation = validateParams(text, algorithm, key, iv, 'desencriptar');
  if (!validation.isValid) {
    return validation.response as DecryptResponse;
  }

  const response: DecryptResponse = {
    code: 200,
    message: 'Decrypted successful',
    algorithm,
    key,
    iv,
    text,
  };

  try {
    const decipher = crypto.createDecipheriv(algorithm, key as crypto.CipherKey, iv as crypto.BinaryLike);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    response.decrypted = decrypted;
    return response;
  } catch (error: any) {
    return { ...response, code: 500, message: `Error en decryptAes: ${error.message}. Asegúrese de que el texto, la llave y el IV sean correctos.` };
  }
};

/**
 * Generates a random AES key.
 * @param bytes Number of bytes for the key.
 */
export const generateRandomKeyAes = (bytes: number): Buffer => {
  return crypto.randomBytes(bytes);
};

/**
 * @deprecated Use generateRandomKeyAes instead.
 */
export const generateRandoKeyAes = (bytes: number): Buffer => {
  return generateRandomKeyAes(bytes);
};

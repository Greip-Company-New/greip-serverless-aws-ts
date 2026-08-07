// Emision y verificacion de tokens JWT RS256 (access y mfa) cifrando el payload con AES.
import jwt from 'jsonwebtoken';
import { SecretsManagerService, encryptAes, decryptAes } from 'ly-nodejs-ts-common';
import { JWT_ALGORITHM, JWT_ISSUER } from './constants';
import { Identidad } from './models';

const secretsManager = new SecretsManagerService();

async function obtenerPrivateKey(): Promise<string> {
  const secret = await secretsManager.getSecretValue(process.env.SM_JWT_PRIVATE_KEY || 'Greip/JWT-Private');
  if (typeof secret === 'string') {
    return secret;
  }
  return secret.privateKey;
}

async function obtenerPublicKey(): Promise<string> {
  const secret = await secretsManager.getSecretValue(process.env.SM_JWT_PUBLIC_KEY || 'Greip/JWT-Public');
  if (typeof secret === 'string') {
    return secret;
  }
  return secret.publicKey;
}

async function encryptData(data: any): Promise<string> {
  const config = await secretsManager.getSecretValue(process.env.SM_ENCRIPTACION_TOKEN || 'Greip/Encriptacion/Token');
  const resultado = encryptAes(JSON.stringify(data), config.algorithm, config.key, config.iv);
  if (!resultado.encrypted) {
    throw new Error('No se pudo cifrar el payload del token');
  }
  return resultado.encrypted;
}

async function decryptData(data: string): Promise<any> {
  const config = await secretsManager.getSecretValue(process.env.SM_ENCRIPTACION_TOKEN || 'Greip/Encriptacion/Token');
  const resultado = decryptAes(data, config.algorithm, config.key, config.iv);
  if (resultado.code !== 200 || resultado.decrypted === undefined) {
    throw new Error(`Error descifrando el token: ${resultado.message || 'Resultado vacio'}`);
  }
  return JSON.parse(resultado.decrypted);
}

/**
 * Firma un JWT RS256 cuyo payload es la representacion cifrada de `data`.
 */
export async function firmarToken(data: Identidad, expiresInMin: number): Promise<string> {
  const privateKey = await obtenerPrivateKey();
  const dataCifrado = await encryptData(data);
  return jwt.sign({ data: dataCifrado }, privateKey, {
    algorithm: JWT_ALGORITHM as jwt.Algorithm,
    issuer: JWT_ISSUER,
    expiresIn: `${expiresInMin}m`
  });
}

/**
 * Verifica un JWT RS256 y devuelve la identidad descifrada.
 */
export async function verificarToken(token: string): Promise<Identidad> {
  const publicKey = await obtenerPublicKey();
  const decoded: any = jwt.verify(token, publicKey, {
    algorithms: [JWT_ALGORITHM as jwt.Algorithm],
    issuer: JWT_ISSUER
  });
  const identidad = await decryptData(decoded.data);
  identidad.exp = decoded.exp;
  return identidad;
}

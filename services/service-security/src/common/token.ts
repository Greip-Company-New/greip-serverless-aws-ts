// Emision y verificacion de tokens JWT RS256 (access y mfa) cifrando el payload con AES.
// La verificacion usa el validador generico de la capa ly-nodejs-ts-common.
import jwt from 'jsonwebtoken';
import { SecretsManagerService, encryptAes, verifyToken as verifyTokenGeneric } from 'ly-nodejs-ts-common';
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

async function encryptData(data: any): Promise<string> {
  const config = await secretsManager.getSecretValue(process.env.SM_ENCRIPTACION_TOKEN || 'Greip/Encriptacion/Token');
  const resultado = encryptAes(JSON.stringify(data), config.algorithm, config.key, config.iv);
  if (!resultado.encrypted) {
    throw new Error('No se pudo cifrar el payload del token');
  }
  return resultado.encrypted;
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
 * Delega en el validador generico de la capa ly-nodejs-ts-common.
 */
export async function verificarToken(token: string): Promise<Identidad> {
  return await verifyTokenGeneric(token) as Identidad;
}

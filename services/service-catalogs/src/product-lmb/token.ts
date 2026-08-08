// Verificacion de tokens JWT RS256 emitidos por service-security (payload cifrado con AES).
import jwt from 'jsonwebtoken';
import { SecretsManagerService, decryptAes } from 'ly-nodejs-ts-common';

const JWT_ALGORITHM = 'RS256';
const JWT_ISSUER = 'Greip';

const secretsManager = new SecretsManagerService();

async function getPublicKey(): Promise<string> {
  const secret = await secretsManager.getSecretValue(process.env.SM_JWT_PUBLIC_KEY || 'Greip/JWT-Public');
  if (typeof secret === 'string') {
    return secret;
  }
  return secret.publicKey;
}

async function decryptData(data: string): Promise<any> {
  const config = await secretsManager.getSecretValue(process.env.SM_ENCRIPTACION_TOKEN || 'Greip/Encriptacion/Token');
  const resultado = decryptAes(data, config.algorithm, config.key, config.iv);
  if (resultado.code !== 200 || resultado.decrypted === undefined) {
    throw new Error(`Error descifrando el token: ${resultado.message || 'Resultado vacio'}`);
  }
  return JSON.parse(resultado.decrypted);
}

export interface TokenIdentity {
  sub: string;
  tenant: string;
  tenantId?: number;
  type: string;
  exp?: number;
  permissions?: string[];
  roles?: string[];
  [key: string]: any;
}

export async function verifyToken(token: string): Promise<TokenIdentity> {
  const publicKey = await getPublicKey();
  const decoded: any = jwt.verify(token, publicKey, {
    algorithms: [JWT_ALGORITHM as jwt.Algorithm],
    issuer: JWT_ISSUER
  });
  const identity = await decryptData(decoded.data);
  identity.exp = decoded.exp;
  return identity;
}

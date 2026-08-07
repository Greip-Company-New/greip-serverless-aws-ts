// Utilidades de contrasenas: hashing scrypt y validacion contra password_policy.
import crypto from 'crypto';
import { PoliticaContrasena } from './models';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const PREFIX = 'scrypt';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('hex');
  return `${PREFIX}$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.startsWith(`${PREFIX}$`)) {
    return false;
  }
  try {
    const [, n, r, p, salt, hash] = stored.split('$');
    const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
      N: Number(n),
      r: Number(r),
      p: Number(p)
    }).toString('hex');
    const a = Buffer.from(candidate, 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Valida una contrasena contra la politica del tenant.
 * Retorna la lista de errores (vacia si cumple la politica).
 */
export function validatePasswordPolicy(password: string, politica: PoliticaContrasena): string[] {
  const errores: string[] = [];
  const min = politica?.min_length ?? 8;
  const max = politica?.max_length ?? 64;
  const reqUpper = politica?.require_uppercase ?? true;
  const reqLower = politica?.require_lowercase ?? true;
  const reqNumber = politica?.require_number ?? true;
  const reqSpecial = politica?.require_special ?? true;

  if (password.length < min) {
    errores.push(`La contrasena debe tener al menos ${min} caracteres`);
  }
  if (password.length > max) {
    errores.push(`La contrasena no debe exceder los ${max} caracteres`);
  }
  if (reqUpper && !/[A-Z]/.test(password)) {
    errores.push('La contrasena debe incluir al menos una letra mayuscula');
  }
  if (reqLower && !/[a-z]/.test(password)) {
    errores.push('La contrasena debe incluir al menos una letra minuscula');
  }
  if (reqNumber && !/\d/.test(password)) {
    errores.push('La contrasena debe incluir al menos un numero');
  }
  if (reqSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errores.push('La contrasena debe incluir al menos un caracter especial');
  }
  return errores;
}

/**
 * Verifica que la contrasena no este dentro del historico reciente (max_reuse).
 */
export function passwordInHistory(password: string, history: string[] | undefined, maxReuse: number): boolean {
  const limite = Math.max(maxReuse, 0);
  const historial = (history || []).slice(0, limite);
  return historial.some((h) => verifyPassword(password, h));
}

// TOTP (RFC 6238) y OTP numericos para MFA. Sin dependencias externas.
import crypto from 'crypto';
import { TOTP_DIGITS, TOTP_STEP_SEG, TOTP_WINDOW } from './constants';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const limpio = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of limpio) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      continue;
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  const buffer = crypto.randomBytes(20); // 160 bits
  return base32Encode(buffer);
}

export function computeTotp(secret: string, timestampMs: number = Date.now(), step: number = TOTP_STEP_SEG): string {
  const counter = Math.floor(timestampMs / 1000 / step);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

export function verifyTotp(secret: string, code: string, window: number = TOTP_WINDOW): boolean {
  if (!secret || !code || !/^\d{6}$/.test(code)) {
    return false;
  }
  const ahora = Date.now();
  for (let w = -window; w <= window; w++) {
    if (computeTotp(secret, ahora + w * TOTP_STEP_SEG * 1000) === code) {
      return true;
    }
  }
  return false;
}

export function generateOtp(): string {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

export function maskDestination(channel: string, destination: string): string {
  if (!destination) {
    return '';
  }
  if (channel === 'EMAIL') {
    const [usuario, dominio] = destination.split('@');
    const visibles = usuario.length > 2 ? usuario.slice(0, 2) : usuario.slice(0, 1);
    return `${visibles}***@${dominio || '...'}`;
  }
  // telefono
  if (destination.length <= 4) {
    return destination;
  }
  const sufijo = destination.slice(-4);
  const prefijo = destination.length > 8 ? destination.slice(0, 3) : '';
  return `${prefijo}****${sufijo}`;
}

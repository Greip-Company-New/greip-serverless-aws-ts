import { generateTotpSecret, computeTotp, verifyTotp, generateOtp, generateRecoveryOtp, maskDestination } from './totp';

describe('totp', () => {
  it('genera un secreto base32 de 32 caracteres', () => {
    const secreto = generateTotpSecret();
    expect(secreto).toHaveLength(32);
    expect(secreto).toMatch(/^[A-Z2-7]+$/);
  });

  it('calcula y verifica un codigo TOTP dentro de la ventana', () => {
    const secreto = 'JBSWY3DPEHPK3PXP';
    const codigo = computeTotp(secreto);
    expect(codigo).toMatch(/^\d{6}$/);
    expect(verifyTotp(secreto, codigo)).toBe(true);
  });

  it('rechaza codigos incorrectos o con formato invalido', () => {
    const secreto = 'JBSWY3DPEHPK3PXP';
    expect(verifyTotp(secreto, '000000')).toBe(false);
    expect(verifyTotp(secreto, '12345')).toBe(false);
    expect(verifyTotp('', '123456')).toBe(false);
  });

  it('acepta codigos del paso anterior (ventana +/-1)', () => {
    const secreto = 'JBSWY3DPEHPK3PXP';
    const codigoAnterior = computeTotp(secreto, Date.now() - 30 * 1000);
    expect(verifyTotp(secreto, codigoAnterior)).toBe(true);
  });

  it('genera OTP numerico de 6 digitos', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('genera OTP numerico de 6 digitos para recuperacion de contrasena', () => {
    const otp = generateRecoveryOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('enmascara telefonos y emails', () => {
    expect(maskDestination('SMS', '51999888777')).toMatch(/^\d{3}\*{4}\d{4}$/);
    expect(maskDestination('EMAIL', 'juan.perez@greip.com.pe')).toContain('***@');
    expect(maskDestination('EMAIL', 'juan.perez@greip.com.pe')).not.toContain('juan.perez');
  });
});

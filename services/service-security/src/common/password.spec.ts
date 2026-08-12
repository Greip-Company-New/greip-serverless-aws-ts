import {
  hashPassword,
  verifyPassword,
  sha256Hex,
  validatePasswordPolicy,
  passwordInHistory
} from './password';

const politica = {
  min_length: 8,
  max_length: 64,
  require_uppercase: true,
  require_lowercase: true,
  require_number: true,
  require_special: true,
  max_age_days: 90,
  max_reuse: 5
};

describe('password', () => {
  it('hashea y verifica una contrasena correcta', () => {
    const hash = hashPassword('Greip#2026');
    expect(hash).toMatch(/^scrypt\$/);
    expect(verifyPassword('Greip#2026', hash)).toBe(true);
    expect(verifyPassword('Otra#Pass1', hash)).toBe(false);
  });

  it('genera hashes unicos con salt aleatorio', () => {
    const a = hashPassword('Greip#2026');
    const b = hashPassword('Greip#2026');
    expect(a).not.toBe(b);
  });

  it('sha256Hex produce 64 caracteres hex', () => {
    const digest = sha256Hex('codigo-123456');
    expect(digest).toHaveLength(64);
    expect(sha256Hex('codigo-123456')).toBe(sha256Hex('codigo-123456'));
    expect(sha256Hex('codigo-123456')).not.toBe(sha256Hex('codigo-654321'));
  });

  it('valida la politica de contrasenas', () => {
    expect(validatePasswordPolicy('Greip#2026', politica)).toEqual([]);
    expect(validatePasswordPolicy('greip#2026', politica)).toEqual(expect.arrayContaining([expect.stringContaining('mayuscula')]));
    expect(validatePasswordPolicy('SHORT1#', politica)).toEqual(expect.arrayContaining([expect.stringContaining('al menos 8')]));
    expect(validatePasswordPolicy('greip', politica)).toEqual(expect.arrayContaining([expect.stringContaining('numero'), expect.stringContaining('mayuscula')]));
  });

  it('detecta contrasenas en el historico', () => {
    const vieja = hashPassword('Historic#1');
    const historico = [hashPassword('Otra#1'), vieja];
    expect(passwordInHistory('Historic#1', historico, 5)).toBe(true);
    expect(passwordInHistory('Nueva#2026', historico, 5)).toBe(false);
  });
});

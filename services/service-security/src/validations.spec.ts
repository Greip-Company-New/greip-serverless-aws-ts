import AuthValidate from './auth-lmb/validate';
import UsuarioValidate from './usuario-lmb/validate';
import AuditValidate from './audit-lmb/validate';

describe('auth-lmb/validate', () => {
  it('acepta login por email', async () => {
    await expect(AuthValidate.login({ email: 'a@greip.com.pe', password: 'x' })).resolves.toBeUndefined();
  });

  it('acepta login por documento (sin email)', async () => {
    await expect(AuthValidate.login({ documentType: 'D', documentNumber: '12345678', password: 'x' })).resolves.toBeUndefined();
  });

  it('rechaza login con email y documento a la vez', async () => {
    await expect(AuthValidate.login({ email: 'a@greip.com.pe', documentType: 'D', documentNumber: '123', password: 'x' })).rejects.toBeTruthy();
  });

  it('rechaza login sin password', async () => {
    await expect(AuthValidate.login({ email: 'a@greip.com.pe' })).rejects.toBeTruthy();
  });

  it('valida verifyMfa con code de 6 digitos', async () => {
    await expect(AuthValidate.verifyMfa({ mfaToken: 't', challengeId: 'd', code: '123456' })).resolves.toBeUndefined();
    await expect(AuthValidate.verifyMfa({ mfaToken: 't', challengeId: 'd', code: '123' })).rejects.toBeTruthy();
  });
});

describe('usuario-lmb/validate', () => {
  it('acepta createUser valido', async () => {
    await expect(
      UsuarioValidate.createUser({
        email: 'nuevo@greip.com.pe',
        documentType: 'D',
        documentNumber: '12345678',
        firstName: 'Juan',
        fatherLastName: 'Perez'
      })
    ).resolves.toBeUndefined();
  });

  it('rechaza createUser con documento invalido', async () => {
    await expect(
      UsuarioValidate.createUser({
        email: 'nuevo@greip.com.pe',
        documentType: 'X',
        documentNumber: '12345678',
        firstName: 'Juan',
        fatherLastName: 'Perez'
      })
    ).rejects.toBeTruthy();
  });
});

describe('audit-lmb/validate', () => {
  it('acepta listAudit con filtros', async () => {
    await expect(AuditValidate.listAudit({ dateFrom: '2026-01-01T00:00:00.000Z' })).resolves.toBeUndefined();
    await expect(AuditValidate.listAudit({ dateFrom: 'no-es-fecha' })).rejects.toBeTruthy();
  });

  it('valida getAudit con sk', async () => {
    await expect(AuditValidate.getAudit({ sk: 'EVENT#2026-01-01T00:00:00.000Z#abc' })).resolves.toBeUndefined();
    await expect(AuditValidate.getAudit({})).rejects.toBeTruthy();
  });
});

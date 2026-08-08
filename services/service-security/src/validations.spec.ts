import AuthValidate from './auth-lmb/validate';
import UsuarioValidate from './usuario-lmb/validate';

describe('auth-lmb/validate', () => {
  const headers = { channel: 'AppWeb' };

  it('acepta login por email', async () => {
    await expect(AuthValidate.login({ email: 'a@greip.com.pe', password: 'x', headers })).resolves.toBeUndefined();
  });

  it('acepta login por documento (sin email)', async () => {
    await expect(AuthValidate.login({ documentType: 'D', documentNumber: '12345678', password: 'x', headers })).resolves.toBeUndefined();
  });

  it('rechaza login con email y documento a la vez', async () => {
    await expect(AuthValidate.login({ email: 'a@greip.com.pe', documentType: 'D', documentNumber: '123', password: 'x', headers })).rejects.toBeTruthy();
  });

  it('rechaza login sin password', async () => {
    await expect(AuthValidate.login({ email: 'a@greip.com.pe', headers })).rejects.toBeTruthy();
  });

  it('rechaza login sin header channel', async () => {
    await expect(AuthValidate.login({ email: 'a@greip.com.pe', password: 'x' })).rejects.toBeTruthy();
  });

  it('valida verifyMfa con code de 6 digitos', async () => {
    const headers = { channel: 'AppWeb' };
    await expect(AuthValidate.verifyMfa({ mfaToken: 't', challengeId: 'd', code: '123456', headers })).resolves.toBeUndefined();
    await expect(AuthValidate.verifyMfa({ mfaToken: 't', challengeId: 'd', code: '123', headers })).rejects.toBeTruthy();
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

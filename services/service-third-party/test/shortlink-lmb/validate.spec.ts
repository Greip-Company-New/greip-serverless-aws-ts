import Validate from '../../src/shortlink-lmb/validate';

describe('Validate.shortenUrl (Dub)', () => {
  test('acepta url valida', async () => {
    await expect(Validate.shortenUrl({
      url: 'https://apidev.greip.com.pe/srv-security/auth/email/verify?token=abc&email=a@greip.com.pe'
    })).resolves.toBeUndefined();
  });

  test('acepta requestId y tenantCode', async () => {
    await expect(Validate.shortenUrl({
      requestId: 'req-123',
      url: 'https://greip.com.pe/login',
      tenantCode: 'GREIP'
    })).resolves.toBeUndefined();
  });

  test('rechaza url obligatoria', async () => {
    await expect(Validate.shortenUrl({})).rejects.toBeDefined();
  });

  test('rechaza url invalida', async () => {
    await expect(Validate.shortenUrl({ url: 'no-es-una-url' })).rejects.toBeDefined();
  });

  test('rechaza esquema no http/https', async () => {
    await expect(Validate.shortenUrl({ url: 'ftp://x.com/' })).rejects.toBeDefined();
  });
});
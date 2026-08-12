import Validate from '../../src/token-lmb/validate';

describe('Validate.encryptTokenData', () => {
  test('accepts valid payload with object data', async () => {
    await expect(Validate.encryptTokenData({ data: { sub: '123', tenant: 'GREIP' } })).resolves.toBeUndefined();
  });

  test('accepts valid payload with string data', async () => {
    await expect(Validate.encryptTokenData({ data: 'plain text' })).resolves.toBeUndefined();
  });

  test('rejects payload without data', async () => {
    await expect(Validate.encryptTokenData({})).rejects.toBeDefined();
  });

  test('rejects payload with null data', async () => {
    await expect(Validate.encryptTokenData({ data: null })).rejects.toBeDefined();
  });
});

describe('Validate.decryptTokenData', () => {
  test('accepts valid payload', async () => {
    await expect(Validate.decryptTokenData({ encrypted: 'a3f2c9' })).resolves.toBeUndefined();
  });

  test('rejects payload without encrypted', async () => {
    await expect(Validate.decryptTokenData({})).rejects.toBeDefined();
  });

  test('rejects empty encrypted string', async () => {
    await expect(Validate.decryptTokenData({ encrypted: '' })).rejects.toBeDefined();
  });
});

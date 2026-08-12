import { encryptAes, decryptAes } from 'ly-nodejs-ts-common';

const ALGORITHM = 'aes-256-cbc';
const KEY = '0123456789abcdef0123456789abcdef';
const IV = '0123456789abcdef';

describe('Service.encryptTokenData / decryptTokenData', () => {
  test('round-trip returns the original data', () => {
    const original = { sub: '550e8400-e29b-41d4-a716-446655440000', tenant: 'GREIP', roles: ['ADMIN'] };

    const encrypted = encryptAes(original, ALGORITHM, KEY, IV);
    expect(encrypted.code).toBe(200);
    expect(encrypted.encrypted).toBeDefined();

    const decrypted = decryptAes(encrypted.encrypted!, ALGORITHM, KEY, IV);
    expect(decrypted.code).toBe(200);
    expect(JSON.parse(decrypted.decrypted!)).toEqual(original);
  });

  test('encrypts objects as JSON and decrypts to the same JSON', () => {
    const encrypted = encryptAes({ name: 'greip' }, ALGORITHM, KEY, IV);
    const decrypted = decryptAes(encrypted.encrypted!, ALGORITHM, KEY, IV);
    expect(decrypted.decrypted).toBe('{"name":"greip"}');
  });

  test('fails to decrypt with wrong key', () => {
    const encrypted = encryptAes('secret', ALGORITHM, KEY, IV);
    const wrongKey = decryptAes(encrypted.encrypted!, ALGORITHM, 'ffffffffffffffffffffffffffffffff', IV);
    expect(wrongKey.code).not.toBe(200);
  });

  test('rejects empty text', () => {
    const encrypted = encryptAes('', ALGORITHM, KEY, IV);
    expect(encrypted.code).not.toBe(200);
  });
});

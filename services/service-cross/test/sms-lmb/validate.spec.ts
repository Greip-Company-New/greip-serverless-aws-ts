import Validate from '../../src/sms-lmb/validate';

describe('Validate.sendSms', () => {
  test('acepta telefono con codigo de pais', async () => {
    await expect(Validate.sendSms({
      phoneNumber: '+51999999999',
      message: 'Tu codigo es 123456'
    })).resolves.toBeUndefined();
  });

  test('rechaza telefono corto', async () => {
    await expect(Validate.sendSms({
      phoneNumber: '+5199',
      message: 'x'
    })).rejects.toBeDefined();
  });

  test('rechaza sin mensaje', async () => {
    await expect(Validate.sendSms({ phoneNumber: '+51999999999' })).rejects.toBeDefined();
  });
});

import Validate from '../../src/config-lmb/validate';

describe('Validate.getConfig', () => {
  test('acepta payload vacio', async () => {
    await expect(Validate.getConfig({})).resolves.toBeUndefined();
  });

  test('acepta solo requestId', async () => {
    await expect(Validate.getConfig({ requestId: 'abc' })).resolves.toBeUndefined();
  });
});

describe('Validate.setConfig', () => {
  test('acepta configuracion de Brevo con apiKey', async () => {
    await expect(Validate.setConfig({
      emailProvider: 'BREVO',
      smsProvider: 'BREVO',
      brevo: { enabled: true, apiKey: 'xkeysib-123', fromEmail: 'no-reply@greip.com.pe' }
    })).resolves.toBeUndefined();
  });

  test('acepta configuracion de Twilio', async () => {
    await expect(Validate.setConfig({
      emailProvider: 'TWILIO',
      smsProvider: 'BREVO',
      twilio: { enabled: true, accountSid: 'AC123', authToken: 'tok123', fromPhone: '+51999000111' }
    })).resolves.toBeUndefined();
  });

  test('acepta configuracion de AWS SES y SNS', async () => {
    await expect(Validate.setConfig({
      emailProvider: 'SES',
      smsProvider: 'SNS',
      ses: { enabled: true, fromEmail: 'no-reply@greip.com.pe', fromName: 'GREIP' },
      sns: { enabled: true, senderId: 'GREIP' }
    })).resolves.toBeUndefined();
  });

  test('rechaza senderId de SNS mayor a 11 caracteres', async () => {
    await expect(Validate.setConfig({
      emailProvider: 'BREVO',
      smsProvider: 'SNS',
      sns: { senderId: '1234567890123' }
    })).rejects.toBeDefined();
  });

  test('acepta actualizacion solo de seleccion de proveedores (sin bloques)', async () => {
    await expect(Validate.setConfig({
      emailProvider: 'TWILIO',
      smsProvider: 'BREVO'
    })).resolves.toBeUndefined();
  });

  test('rechaza proveedor invalido', async () => {
    await expect(Validate.setConfig({
      emailProvider: 'AWS',
      smsProvider: 'BREVO',
      brevo: { apiKey: 'x1234' }
    })).rejects.toBeDefined();
  });

  test('rechaza apiKey muy corta', async () => {
    await expect(Validate.setConfig({
      emailProvider: 'BREVO',
      smsProvider: 'BREVO',
      brevo: { apiKey: 'ab' }
    })).rejects.toBeDefined();
  });

  test('rechaza fromEmail invalido', async () => {
    await expect(Validate.setConfig({
      emailProvider: 'BREVO',
      smsProvider: 'BREVO',
      brevo: { apiKey: 'xkeysib-123', fromEmail: 'invalido' }
    })).rejects.toBeDefined();
  });
});
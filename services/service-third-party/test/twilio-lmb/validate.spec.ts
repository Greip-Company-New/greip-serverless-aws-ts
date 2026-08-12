import Validate from '../../src/twilio-lmb/validate';

describe('Validate.sendEmail (Twilio/SendGrid)', () => {
  test('acepta payload valido con html', async () => {
    await expect(Validate.sendEmail({
      to: ['a@greip.com.pe'],
      subject: 'Prueba',
      html: '<h1>Hola</h1>'
    })).resolves.toBeUndefined();
  });

  test('acepta payload valido con texto', async () => {
    await expect(Validate.sendEmail({
      to: ['a@greip.com.pe'],
      text: 'Mensaje de prueba'
    })).resolves.toBeUndefined();
  });

  test('rechaza sin destinatarios', async () => {
    await expect(Validate.sendEmail({ subject: 'x', text: 'x' })).rejects.toBeDefined();
  });

  test('rechaza destinatario con email invalido', async () => {
    await expect(Validate.sendEmail({ to: ['correo-invalido'], text: 'x' })).rejects.toBeDefined();
  });

  test('rechaza sin contenido (html/text/subject)', async () => {
    await expect(Validate.sendEmail({ to: ['a@greip.com.pe'] })).rejects.toBeDefined();
  });
});

describe('Validate.sendSms (Twilio)', () => {
  test('acepta payload valido', async () => {
    await expect(Validate.sendSms({
      phoneNumber: '+51999000111',
      message: 'Hola'
    })).resolves.toBeUndefined();
  });

  test('rechaza numero invalido', async () => {
    await expect(Validate.sendSms({ phoneNumber: 'abc', message: 'Hola' })).rejects.toBeDefined();
  });

  test('rechaza sin mensaje', async () => {
    await expect(Validate.sendSms({ phoneNumber: '+51999000111' })).rejects.toBeDefined();
  });
});
import Validate from '../../src/email-lmb/validate';

describe('Validate.sendEmail', () => {
  test('acepta payload valido', async () => {
    await expect(Validate.sendEmail({
      to: ['a@greip.com.pe'],
      subject: 'Prueba',
      html: '<h1>Hola</h1>'
    })).resolves.toBeUndefined();
  });

  test('rechaza sin destinatarios', async () => {
    await expect(Validate.sendEmail({ html: 'x' })).rejects.toBeDefined();
  });

  test('rechaza email invalido', async () => {
    await expect(Validate.sendEmail({ to: ['correo-invalido'], html: 'x' })).rejects.toBeDefined();
  });

  test('rechaza sin html ni text', async () => {
    await expect(Validate.sendEmail({ to: ['a@greip.com.pe'] })).rejects.toBeDefined();
  });
});

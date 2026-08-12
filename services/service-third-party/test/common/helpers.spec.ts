import { enmascarar, esValorEnmascarado, limpiar, extraerMensajeProveedor } from '../../src/common/helpers';

describe('enmascarar', () => {
  test('devuelve vacio cuando no hay valor', () => {
    expect(enmascarar(undefined)).toBe('');
    expect(enmascarar('')).toBe('');
  });

  test('enmascara valores cortos', () => {
    expect(enmascarar('abc123')).toBe('••••••••');
  });

  test('enmascara valores largos conservando extremos', () => {
    const valor = enmascarar('xkeysib-1234567890abcdef');
    expect(valor).toContain('xkey');
    expect(valor).toContain('cdef');
    expect(valor).not.toContain('123456');
  });
});

describe('esValorEnmascarado', () => {
  test('detecta valor enmascarado', () => {
    expect(esValorEnmascarado('xkey••••••cdef')).toBe(true);
  });

  test('devuelve false para valores planos', () => {
    expect(esValorEnmascarado('xkeysib-123')).toBe(false);
    expect(esValorEnmascarado(undefined)).toBe(false);
  });
});

describe('limpiar', () => {
  test('quita espacios y devuelve undefined si vacio', () => {
    expect(limpiar('  abc  ')).toBe('abc');
    expect(limpiar('   ')).toBeUndefined();
    expect(limpiar(undefined)).toBeUndefined();
  });
});

describe('extraerMensajeProveedor', () => {
  test('extrae el mensaje del body de la respuesta del proveedor', () => {
    const err = { exception: { response: { data: { message: 'No sms related addons are found for the given organization' } } } };
    expect(extraerMensajeProveedor(err, 'Error al enviar el SMS por Brevo')).toBe(
      'No sms related addons are found for the given organization'
    );
  });

  test('extrae del primer error de SendGrid (errors[])', () => {
    const err = { exception: { response: { data: { errors: [{ message: 'Unverified sender' }] } } } };
    expect(extraerMensajeProveedor(err, 'fallback')).toBe('Unverified sender');
  });

  test('usa el mensaje de un error del SDK de AWS', () => {
    const err = new Error('Message rejected: address no-reply@greip.com.pe is not verified');
    expect(extraerMensajeProveedor(err, 'fallback')).toContain('not verified');
  });

  test('ignora el mensaje generico de axios y usa el fallback', () => {
    const err = { exception: new Error('Request failed with status code 400') };
    expect(extraerMensajeProveedor(err, 'Error generico')).toBe('Error generico');
  });
});
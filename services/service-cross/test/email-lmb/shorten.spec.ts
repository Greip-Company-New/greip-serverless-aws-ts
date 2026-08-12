import { extraerUrls, esUrlAcortable, acortarEnlacesContenido } from '../../src/email-lmb/shorten';

const mockInvokeLambda = jest.fn();
jest.mock('ly-nodejs-ts-common', () => ({
  LambdaService: jest.fn(() => ({ invokeLambda: mockInvokeLambda }))
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('esUrlAcortable', () => {
  test('acorta URLs externas', () => {
    expect(esUrlAcortable('https://otro.com/xy')).toBe(true);
    expect(esUrlAcortable('https://apidev.greip.com.pe/srv-security/x')).toBe(true);
  });

  test('no acorta dominios propios ni de Dub', () => {
    expect(esUrlAcortable('https://greip.com.pe/login')).toBe(false);
    expect(esUrlAcortable('https://www.greip.com.pe')).toBe(false);
    expect(esUrlAcortable('https://app.greip.com.pe/login')).toBe(false);
    expect(esUrlAcortable('https://appdev.greip.com.pe')).toBe(false);
    expect(esUrlAcortable('https://appqa.greip.com.pe')).toBe(false);
    expect(esUrlAcortable('https://dub.sh/abc')).toBe(false);
    expect(esUrlAcortable('https://d.to/abc')).toBe(false);
  });

  test('url invalida no es acortable', () => {
    expect(esUrlAcortable('no-es-url')).toBe(false);
  });
});

describe('extraerUrls', () => {
  test('extrae URLs unicas y acortables ignorando las excluidas', () => {
    const html = [
      '<a href="https://apidev.greip.com.pe/verify?token=abc&email=a%40x.pe">verificar</a>',
      '<a href="https://greip.com.pe/login">login</a>',
      '<a href="https://dub.sh/abc">dub</a>',
      'https://otro.com/xy y https://otro.com/xy otra vez'
    ].join(' ');

    const urls = extraerUrls(html);

    expect(urls).toEqual([
      'https://apidev.greip.com.pe/verify?token=abc&email=a%40x.pe',
      'https://otro.com/xy'
    ]);
  });
});

describe('acortarEnlacesContenido', () => {
  test('reemplaza las URLs acortables por su short link de Dub.co', async () => {
    mockInvokeLambda.mockResolvedValue({
      payload: JSON.stringify({ payload: { success: true, data: { shortUrl: 'https://dub.sh/AAA111' } } })
    });

    const html = '<a href="https://apidev.greip.com.pe/verify?token=abc">verificar</a>';
    const resultado = await acortarEnlacesContenido('GREIP', html);

    expect(mockInvokeLambda).toHaveBeenCalledTimes(1);
    expect(resultado).toContain('https://dub.sh/AAA111');
    expect(resultado).not.toContain('apidev.greip.com.pe');
  });

  test('mantiene el contenido original si la invocacion falla (fail-open)', async () => {
    mockInvokeLambda.mockRejectedValue(new Error('lambda timeout'));

    const html = '<a href="https://otro.com/xy">link</a>';
    const resultado = await acortarEnlacesContenido('GREIP', html);

    expect(resultado).toBe(html);
  });

  test('no reemplaza cuando el short link llega vacio', async () => {
    mockInvokeLambda.mockResolvedValue({
      payload: JSON.stringify({ payload: { success: true, data: { shortUrl: '' } } })
    });

    const html = '<a href="https://otro.com/xy">link</a>';
    const resultado = await acortarEnlacesContenido('GREIP', html);

    expect(resultado).toBe(html);
  });

  test('sin URLs devuelve el contenido sin invocar', async () => {
    const html = '<p>Hola, sin enlaces.</p>';
    const resultado = await acortarEnlacesContenido('GREIP', html);

    expect(resultado).toBe(html);
    expect(mockInvokeLambda).not.toHaveBeenCalled();
  });

  test('contenido vacio devuelve undefined', async () => {
    await expect(acortarEnlacesContenido('GREIP', undefined)).resolves.toBeUndefined();
    expect(mockInvokeLambda).not.toHaveBeenCalled();
  });
});
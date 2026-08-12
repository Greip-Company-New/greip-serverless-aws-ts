import Service from '../../src/shortlink-lmb/service';
import { acortarUrl } from '../../src/common/dub';

jest.mock('../../src/common/dub', () => ({
  acortarUrl: jest.fn(),
  obtenerConfigDub: jest.fn(),
  dubConfigurado: jest.fn()
}));

// Service crea internamente su instancia de la utilidad; el mock responde por módulo.
const mockAcortar = acortarUrl as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Service.shortenUrl (Dub)', () => {
  test('devuelve el short link de Dub.co en el payload de exito', async () => {
    mockAcortar.mockResolvedValue({
      originalUrl: 'https://greip.com.pe/x',
      shortUrl: 'https://dub.sh/abc1234',
      id: 'link_1',
      domain: 'dub.sh',
      key: 'abc1234'
    });

    const result = await Service.shortenUrl('GREIP', { url: 'https://greip.com.pe/x' });

    expect(result.success).toBe(true);
    expect(result.data.shortUrl).toBe('https://dub.sh/abc1234');
    expect(result.data.originalUrl).toBe('https://greip.com.pe/x');
    expect(acortarUrl).toHaveBeenCalledWith('GREIP', 'https://greip.com.pe/x', { key: undefined, domain: undefined });
  });

  test('propaga key/domain a la utilidad', async () => {
    mockAcortar.mockResolvedValue({ originalUrl: 'https://a.com/b', shortUrl: 'https://dub.sh/k' });

    await Service.shortenUrl('GREIP', { url: 'https://a.com/b', key: 'mi-key', domain: 'greip.co' });

    expect(acortarUrl).toHaveBeenCalledWith('GREIP', 'https://a.com/b', { key: 'mi-key', domain: 'greip.co' });
  });

  test('no lanza cuando Dub.co falla; responde desde ResponseFactory', async () => {
    mockAcortar.mockRejectedValue(new Error('unauthorized'));

    const result = await Service.shortenUrl('GREIP', { url: 'https://a.com/b' });

    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });
});
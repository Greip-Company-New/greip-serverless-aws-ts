import { PRODUCT_STATUS, CURRENCIES, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../src/product-lmb/constants';

describe('constants product-lmb', () => {
  it('PRODUCT_STATUS contiene los estados validos', () => {
    expect(PRODUCT_STATUS).toEqual(['A', 'I']);
  });

  it('CURRENCIES contiene las monedas soportadas', () => {
    expect(CURRENCIES).toContain('PEN');
    expect(CURRENCIES).toContain('USD');
  });

  it('define valores por defecto de paginacion', () => {
    expect(DEFAULT_PAGE).toBe(1);
    expect(DEFAULT_PAGE_SIZE).toBe(10);
    expect(MAX_PAGE_SIZE).toBe(100);
  });
});

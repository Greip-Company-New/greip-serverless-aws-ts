import Validate from '../../src/product-lmb/validate';

describe('Validate product-lmb', () => {
  const basePayload = { requestId: 'req-1', canal: 'Web', headers: {} };

  describe('listProducts', () => {
    it('acepta un payload valido', async () => {
      await expect(
        Validate.listProducts({ ...basePayload, page: 2, pageSize: 20, status: 'A', name: 'Consultoria' })
      ).resolves.toBeUndefined();
    });

    it('rechaza un status invalido', async () => {
      await expect(Validate.listProducts({ ...basePayload, status: 'X' })).rejects.toMatchObject([
        expect.stringContaining('status'),
      ]);
    });

    it('rechaza pageSize mayor al maximo', async () => {
      await expect(Validate.listProducts({ ...basePayload, pageSize: 500 })).rejects.toMatchObject([
        expect.stringContaining('pageSize'),
      ]);
    });
  });

  describe('getProduct', () => {
    it('acepta un productId valido', async () => {
      await expect(Validate.getProduct({ ...basePayload, productId: 5 })).resolves.toBeUndefined();
    });

    it('rechaza la ausencia de productId', async () => {
      await expect(Validate.getProduct(basePayload)).rejects.toMatchObject([
        expect.stringContaining('productId'),
      ]);
    });
  });

  describe('createProduct', () => {
    it('acepta un payload valido', async () => {
      await expect(
        Validate.createProduct({ ...basePayload, name: 'Consultoria TI', price: 1500.5, currency: 'PEN' })
      ).resolves.toBeUndefined();
    });

    it('rechaza la ausencia de name', async () => {
      await expect(Validate.createProduct({ ...basePayload, price: 10 })).rejects.toMatchObject([
        expect.stringContaining('name'),
      ]);
    });

    it('rechaza un price negativo', async () => {
      await expect(Validate.createProduct({ ...basePayload, name: 'X', price: -5 })).rejects.toMatchObject([
        expect.stringContaining('price'),
      ]);
    });

    it('rechaza una currency no soportada', async () => {
      await expect(
        Validate.createProduct({ ...basePayload, name: 'X', price: 10, currency: 'EUR' })
      ).rejects.toMatchObject([expect.stringContaining('currency')]);
    });
  });

  describe('updateProduct', () => {
    it('acepta un payload valido con productId', async () => {
      await expect(
        Validate.updateProduct({ ...basePayload, productId: 1, name: 'Actualizado', price: 99.9 })
      ).resolves.toBeUndefined();
    });

    it('rechaza la ausencia de productId', async () => {
      await expect(
        Validate.updateProduct({ ...basePayload, name: 'Actualizado', price: 99.9 })
      ).rejects.toMatchObject([expect.stringContaining('productId')]);
    });
  });

  describe('deleteProduct', () => {
    it('acepta un productId valido', async () => {
      await expect(Validate.deleteProduct({ ...basePayload, productId: 3 })).resolves.toBeUndefined();
    });

    it('rechaza la ausencia de productId', async () => {
      await expect(Validate.deleteProduct(basePayload)).rejects.toMatchObject([
        expect.stringContaining('productId'),
      ]);
    });
  });
});

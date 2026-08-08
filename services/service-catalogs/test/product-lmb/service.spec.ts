import Service from '../../src/product-lmb/service';
import { Repository } from '../../src/product-lmb/repository';

describe('Service product-lmb', () => {
  const producto = {
    productId: 1,
    tenantId: 1,
    name: 'Consultoria TI',
    description: null,
    price: 1500.5,
    currency: 'PEN',
    status: 'A',
    createdBy: 'SYSTEM',
    createdAt: '2026-08-07T12:00:00.000Z',
    updatedBy: 'SYSTEM',
    updatedAt: '2026-08-07T12:00:00.000Z'
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listProducts', () => {
    it('retorna una respuesta paginada', async () => {
      jest.spyOn(Repository.prototype, 'listProducts').mockResolvedValue({ data: [producto], total: 1 });

      const result = await Service.listProducts({ page: 1, pageSize: 10 });

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.metadata.pagination).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it('retorna lista vacia cuando no hay productos', async () => {
      jest.spyOn(Repository.prototype, 'listProducts').mockResolvedValue({ data: [], total: 0 });

      const result = await Service.listProducts({});

      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual([]);
    });

    it('aplica el limite maximo de pageSize', async () => {
      const spy = jest.spyOn(Repository.prototype, 'listProducts').mockResolvedValue({ data: [], total: 0 });

      await Service.listProducts({ page: 1, pageSize: 500 });

      expect(spy).toHaveBeenCalledWith(1, 100, undefined, undefined, undefined);
    });
  });

  describe('getProduct', () => {
    it('retorna el producto encontrado', async () => {
      jest.spyOn(Repository.prototype, 'getProduct').mockResolvedValue(producto);

      const result = await Service.getProduct({ productId: '1' });

      expect(result.statusCode).toBe(200);
      expect(result.data.productId).toBe(1);
      expect(result.message).toContain('Producto obtenido exitosamente');
      expect(result.message).toContain('id=1');
    });

    it('retorna 404 cuando el producto no existe', async () => {
      jest.spyOn(Repository.prototype, 'getProduct').mockResolvedValue(null);

      const result = await Service.getProduct({ productId: '999' });

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Producto no encontrado');
      expect(result.message).toContain('id=999');
    });
  });

  describe('createProduct', () => {
    it('retorna 201 al crear el producto', async () => {
      jest.spyOn(Repository.prototype, 'createProduct').mockResolvedValue(producto);

      const result = await Service.createProduct({ name: 'Consultoria TI', price: 1500.5 });

      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Producto creado exitosamente');
    });
  });

  describe('updateProduct', () => {
    it('retorna 200 al actualizar el producto', async () => {
      jest.spyOn(Repository.prototype, 'updateProduct').mockResolvedValue(producto);

      const result = await Service.updateProduct({ productId: '1', name: 'Actualizado', price: 1600 });

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Producto actualizado exitosamente');
    });

    it('retorna 404 cuando el producto no existe', async () => {
      jest.spyOn(Repository.prototype, 'updateProduct').mockResolvedValue(null);

      const result = await Service.updateProduct({ productId: '999', name: 'X', price: 10 });

      expect(result.statusCode).toBe(404);
      expect(result.message).toContain('Producto no encontrado');
    });
  });

  describe('deleteProduct', () => {
    it('retorna 200 al eliminar el producto', async () => {
      jest.spyOn(Repository.prototype, 'deleteProduct').mockResolvedValue(true);

      const result = await Service.deleteProduct({ productId: '1' });

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Producto eliminado exitosamente');
    });

    it('retorna 404 cuando el producto no existe', async () => {
      jest.spyOn(Repository.prototype, 'deleteProduct').mockResolvedValue(false);

      const result = await Service.deleteProduct({ productId: '999' });

      expect(result.statusCode).toBe(404);
      expect(result.message).toContain('Producto no encontrado');
    });
  });

  it('convierte errores del repositorio en respuesta de error con detalle', async () => {
    jest.spyOn(Repository.prototype, 'listProducts').mockRejectedValue(new Error('connection refused'));

    const result = await Service.listProducts({});

    expect(result.statusCode).toBe(500);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error al obtener el listado de productos');
    expect(result.message).toContain('connection refused');
  });
});

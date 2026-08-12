import controller from '../../src/product-lmb/controller';
import Service from '../../src/product-lmb/service';
import Validate from '../../src/product-lmb/validate';
import { ResponseFactory } from 'ly-nodejs-ts-common';

describe('Controller product-lmb', () => {
  const basePayload = { requestId: 'req-1', canal: 'Web', headers: {} };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listProducts', () => {
    it('retorna el resultado del servicio con requestId', async () => {
      jest.spyOn(Validate, 'listProducts').mockResolvedValue(undefined);
      const response = ResponseFactory.success([], 'OK');
      jest.spyOn(Service, 'listProducts').mockResolvedValue(response);

      const result = await controller.listProducts({ ...basePayload });

      expect(result).toBe(response);
      expect(result.requestId).toBe('req-1');
    });

    it('lanza un error 400 cuando falla la validacion', async () => {
      jest.spyOn(Validate, 'listProducts').mockRejectedValue(['status no permitido']);

      await expect(controller.listProducts({ ...basePayload })).rejects.toThrow();
    });

    it('el error de validacion incluye el detalle explicito del campo', async () => {
      jest.spyOn(Validate, 'listProducts').mockRejectedValue(['name is not allowed to be empty']);

      const error = await controller.listProducts({ ...basePayload }).catch((e: any) => e);
      const result = JSON.parse(error.message);

      expect(result.statusCode).toBe(400);
      expect(result.message).toContain('Error de validación');
      expect(result.message).toContain('name is not allowed to be empty');
      expect(result.error.errors).toContain('name is not allowed to be empty');
    });

    it('lanza un error cuando el servicio falla', async () => {
      jest.spyOn(Validate, 'listProducts').mockResolvedValue(undefined);
      jest.spyOn(Service, 'listProducts').mockRejectedValue(new Error('db down'));

      await expect(controller.listProducts({ ...basePayload })).rejects.toThrow();
    });
  });

  describe('getProduct', () => {
    it('retorna el producto con requestId', async () => {
      jest.spyOn(Validate, 'getProduct').mockResolvedValue(undefined);
      const response = ResponseFactory.success({ productId: 1 }, 'OK');
      jest.spyOn(Service, 'getProduct').mockResolvedValue(response);

      const result = await controller.getProduct({ ...basePayload, productId: 1 });

      expect(result).toBe(response);
      expect(result.requestId).toBe('req-1');
    });
  });

  describe('createProduct', () => {
    it('retorna la creacion con requestId', async () => {
      jest.spyOn(Validate, 'createProduct').mockResolvedValue(undefined);
      const response = ResponseFactory.created({ productId: 2 }, 'Creado');
      jest.spyOn(Service, 'createProduct').mockResolvedValue(response);

      const result = await controller.createProduct({ ...basePayload, name: 'A', price: 10 });

      expect(result).toBe(response);
      expect(result.requestId).toBe('req-1');
    });
  });

  describe('updateProduct', () => {
    it('retorna la actualizacion con requestId', async () => {
      jest.spyOn(Validate, 'updateProduct').mockResolvedValue(undefined);
      const response = ResponseFactory.updated({ productId: 1 }, 'Actualizado');
      jest.spyOn(Service, 'updateProduct').mockResolvedValue(response);

      const result = await controller.updateProduct({ ...basePayload, productId: 1 });

      expect(result).toBe(response);
      expect(result.requestId).toBe('req-1');
    });
  });

  describe('deleteProduct', () => {
    it('retorna la eliminacion con requestId', async () => {
      jest.spyOn(Validate, 'deleteProduct').mockResolvedValue(undefined);
      const response = ResponseFactory.deleted('Eliminado');
      jest.spyOn(Service, 'deleteProduct').mockResolvedValue(response);

      const result = await controller.deleteProduct({ ...basePayload, productId: 1 });

      expect(result).toBe(response);
      expect(result.requestId).toBe('req-1');
    });
  });
});

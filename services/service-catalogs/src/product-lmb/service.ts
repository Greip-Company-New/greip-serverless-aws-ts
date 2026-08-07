import { ResponseFactory } from 'ly-nodejs-ts-common';
import { Repository } from './repository';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants';

export default class Service {

    static async listProducts(payload: any): Promise<any> {
        try {
            const repository = new Repository();
            const page = Number(payload.page) || DEFAULT_PAGE;
            const pageSize = Math.min(Number(payload.pageSize) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

            const { data, total } = await repository.listProducts(page, pageSize, payload.status, payload.name);
            return ResponseFactory.paginated(data, total, page, pageSize, 'Listado de productos obtenido exitosamente');
        } catch (err: any) {
            console.error('listProducts >>> ', err);
            return ResponseFactory.error(`Error al obtener el listado de productos: ${err.message}`, 500, err);
        }
    }

    static async getProduct(payload: any): Promise<any> {
        const productId = Number(payload.productId);
        try {
            const repository = new Repository();
            const product = await repository.getProduct(productId);
            if (!product) {
                return ResponseFactory.notFound(`Producto no encontrado (id=${productId})`, { productId });
            }
            return ResponseFactory.success(product, `Producto obtenido exitosamente (id=${productId})`);
        } catch (err: any) {
            console.error('getProduct >>> ', err);
            return ResponseFactory.error(`Error al obtener el producto (id=${productId}): ${err.message}`, 500, err);
        }
    }

    static async createProduct(payload: any): Promise<any> {
        try {
            const repository = new Repository();
            const product = await repository.createProduct(payload);
            return ResponseFactory.created(product, `Producto creado exitosamente (id=${product.productId})`);
        } catch (err: any) {
            console.error('createProduct >>> ', err);
            return ResponseFactory.error(`Error al crear el producto: ${err.message}`, 500, err);
        }
    }

    static async updateProduct(payload: any): Promise<any> {
        const productId = Number(payload.productId);
        try {
            const repository = new Repository();
            const product = await repository.updateProduct(productId, payload);
            if (!product) {
                return ResponseFactory.notFound(`Producto no encontrado (id=${productId})`, { productId });
            }
            return ResponseFactory.updated(product, `Producto actualizado exitosamente (id=${productId})`);
        } catch (err: any) {
            console.error('updateProduct >>> ', err);
            return ResponseFactory.error(`Error al actualizar el producto (id=${productId}): ${err.message}`, 500, err);
        }
    }

    static async deleteProduct(payload: any): Promise<any> {
        const productId = Number(payload.productId);
        try {
            const repository = new Repository();
            const eliminado = await repository.deleteProduct(productId);
            if (!eliminado) {
                return ResponseFactory.notFound(`Producto no encontrado (id=${productId})`, { productId });
            }
            return ResponseFactory.deleted(`Producto eliminado exitosamente (id=${productId})`);
        } catch (err: any) {
            console.error('deleteProduct >>> ', err);
            return ResponseFactory.error(`Error al eliminar el producto (id=${productId}): ${err.message}`, 500, err);
        }
    }
}

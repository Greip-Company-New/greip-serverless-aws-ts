import { ResponseFactory, Helpers, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from 'ly-nodejs-ts-common';
import { Repository } from './repository';

function tenantIdFromIdentity(payload: any): number {
  const tenantId = payload.identity?.tenantId;
  if (!tenantId) {
    throw new Error('Tenant no identificado en el token');
  }
  return Number(tenantId);
}

export default class Service {

    static async listProducts(payload: any): Promise<any> {
        try {
            const repository = new Repository();
            const page = Number(payload.page) || DEFAULT_PAGE;
            const pageSize = Math.min(Number(payload.pageSize) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
            const tenantId = tenantIdFromIdentity(payload);

            const { data, total } = await repository.listProducts(page, pageSize, payload.status, payload.name, tenantId);
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
            const tenantId = tenantIdFromIdentity(payload);
            const product = await repository.getProduct(productId, tenantId);
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
            const tenantId = tenantIdFromIdentity(payload);
            const channel = payload.identity?.channel || 'SYSTEM';
            const product = await repository.createProduct({
                ...payload,
                tenantId,
                createdBy: payload.identity?.sub || payload.createdBy || 'SYSTEM',
                createdByChannel: channel
            });
            Helpers.registerEntityChange({
                entity: 'product',
                entityKey: product.productId,
                tenantId,
                changeType: 'CREATE',
                status: product.status,
                userId: payload.identity?.sub || 'SYSTEM',
                channel,
                changes: {
                    name: { before: null, after: product.name },
                    description: { before: null, after: product.description || '' },
                    price: { before: null, after: product.price },
                    currency: { before: null, after: product.currency }
                }
            }).catch((err) => console.error('[entity-audit] createProduct fallo', err));
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
            const tenantId = tenantIdFromIdentity(payload);
            const channel = payload.identity?.channel || 'SYSTEM';
            const antes = await repository.getProduct(productId, tenantId);
            const product = await repository.updateProduct(productId, {
                ...payload,
                tenantId,
                createdBy: payload.identity?.sub || payload.createdBy || 'SYSTEM',
                createdByChannel: channel
            }, tenantId);
            if (!product) {
                return ResponseFactory.notFound(`Producto no encontrado (id=${productId})`, { productId });
            }
            if (antes) {
                const cambios: Record<string, any> = {};
                for (const campo of ['name', 'description', 'price', 'currency', 'status']) {
                    const vAntes = (antes as any)[campo];
                    const vDespues = (product as any)[campo];
                    if (String(vAntes ?? '') !== String(vDespues ?? '')) {
                        cambios[campo] = { before: vAntes, after: vDespues };
                    }
                }
                if (Object.keys(cambios).length > 0) {
                    Helpers.registerEntityChange({
                        entity: 'product',
                        entityKey: productId,
                        tenantId,
                        changeType: 'UPDATE',
                        status: product.status,
                        userId: payload.identity?.sub || 'SYSTEM',
                        channel,
                        changes: cambios
                    }).catch((err) => console.error('[entity-audit] updateProduct fallo', err));
                }
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
            const tenantId = tenantIdFromIdentity(payload);
            const channel = payload.identity?.channel || 'SYSTEM';
            const antes = await repository.getProduct(productId, tenantId);
            const eliminado = await repository.deleteProduct(productId, tenantId);
            if (!eliminado) {
                return ResponseFactory.notFound(`Producto no encontrado (id=${productId})`, { productId });
            }
            Helpers.registerEntityChange({
                entity: 'product',
                entityKey: productId,
                tenantId,
                changeType: 'DELETE',
                status: 'I',
                userId: payload.identity?.sub || 'SYSTEM',
                channel,
                changes: antes ? {
                    name: { before: antes.name, after: null },
                    description: { before: antes.description || '', after: null },
                    price: { before: antes.price, after: null },
                    currency: { before: antes.currency, after: null },
                    status: { before: antes.status, after: 'I' }
                } : { status: { before: 'A', after: 'I' } }
            }).catch((err) => console.error('[entity-audit] deleteProduct fallo', err));
            return ResponseFactory.deleted(`Producto eliminado exitosamente (id=${productId})`);
        } catch (err: any) {
            console.error('deleteProduct >>> ', err);
            return ResponseFactory.error(`Error al eliminar el producto (id=${productId}): ${err.message}`, 500, err);
        }
    }
}

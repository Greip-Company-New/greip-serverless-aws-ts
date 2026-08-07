import { PostgresDatabaseService } from 'ly-nodejs-ts-postgresdb';
import { Product, ProductRequest } from './models';
import {
  DELETE_PRODUCT_QUERY,
  INSERT_PRODUCT_QUERY,
  LIST_PRODUCTS_COUNT_QUERY,
  LIST_PRODUCTS_QUERY,
  GET_PRODUCT_QUERY,
  UPDATE_PRODUCT_QUERY
} from './query';

// Pool compartido entre invocaciones de la misma Lambda (conexiones warm).
const db = new PostgresDatabaseService(process.env.PG_SECRET_DB || 'Greip/postgres/dev');

function mapProduct(row: any): Product {
  return {
    productId: Number(row.id),
    name: row.name,
    description: row.description,
    price: Number(row.price),
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class Repository {
  async listProducts(page: number, pageSize: number, status?: string, name?: string): Promise<{ data: Product[]; total: number }> {
    const params: any[] = [status || null, name || null];
    const result = await db.paginate<Product>(
      LIST_PRODUCTS_QUERY,
      LIST_PRODUCTS_COUNT_QUERY,
      params,
      { page, pageSize }
    );
    return { data: result.data.map(mapProduct), total: result.total };
  }

  async getProduct(productId: number): Promise<Product | null> {
    const row = await db.executeOne(GET_PRODUCT_QUERY, [productId]);
    return row ? mapProduct(row) : null;
  }

  async createProduct(product: ProductRequest): Promise<Product> {
    const row = await db.executeOne(
      INSERT_PRODUCT_QUERY,
      [product.name, product.description ?? null, product.price, product.currency ?? 'PEN', product.status ?? 'A']
    );
    return mapProduct(row);
  }

  async updateProduct(productId: number, product: ProductRequest): Promise<Product | null> {
    const row = await db.executeOne(
      UPDATE_PRODUCT_QUERY,
      [productId, product.name, product.description ?? null, product.price, product.currency ?? 'PEN', product.status ?? 'A']
    );
    return row ? mapProduct(row) : null;
  }

  async deleteProduct(productId: number): Promise<boolean> {
    const row = await db.executeOne(DELETE_PRODUCT_QUERY, [productId]);
    return !!row;
  }
}

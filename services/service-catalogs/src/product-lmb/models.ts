export interface Product {
  productId: number;
  tenantId: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  status: string;
  createdBy: string;
  createdAt?: string;
  updatedBy: string;
  updatedAt?: string;
}

export interface ProductRequest {
  tenantId?: number;
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  status?: string;
  createdBy?: string;
}

export interface ListProductsRequest {
  page?: number;
  pageSize?: number;
  status?: string;
  name?: string;
  tenantId?: number;
}

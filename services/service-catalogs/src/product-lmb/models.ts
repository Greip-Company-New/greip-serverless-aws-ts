export interface Product {
  productId: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRequest {
  name: string;
  description?: string | null;
  price: number;
  currency?: string;
  status?: string;
}

export interface ListProductsRequest {
  page?: number;
  pageSize?: number;
  status?: string;
  name?: string;
}

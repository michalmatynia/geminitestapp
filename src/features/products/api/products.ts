import {
  type ProductWithImages,
  type ProductsPagedResult,
  type ProductFilterDto,
} from '@/shared/contracts/products';
import { api, type ApiClientOptions } from '@/shared/lib/api-client';

const PRODUCT_READ_TIMEOUT_MS = 60_000;
const PRODUCT_WRITE_TIMEOUT_MS = 60_000;

// This function fetches a list of products from the API.
export async function getProducts(
  filters: ProductFilterDto,
  signal?: AbortSignal
): Promise<ProductWithImages[]> {
  const options: ApiClientOptions = {
    params: {
      fresh: 1,
      ...filters,
    },
    cache: 'no-store',
  };
  if (signal) options.signal = signal;
  options.timeout = PRODUCT_READ_TIMEOUT_MS;
  return api.get<ProductWithImages[]>('/api/products', options);
}

export async function countProducts(
  filters: ProductFilterDto,
  signal?: AbortSignal
): Promise<number> {
  try {
    const options: ApiClientOptions = {
      params: {
        ...filters,
      },
      cache: 'no-store',
    };
    if (signal) options.signal = signal;
    options.timeout = PRODUCT_READ_TIMEOUT_MS;
    const data = await api.get<{ count: number }>('/api/products/count', options);
    return data.count ?? 0;
  } catch (_error) {
    return 0;
  }
}

/**
 * Fetches products + total count in a single request via GET /api/products/paged.
 * Prefer this over calling getProducts() and countProducts() separately.
 */
export async function getProductsWithCount(
  filters: ProductFilterDto,
  signal?: AbortSignal
): Promise<ProductsPagedResult> {
  const options: ApiClientOptions = {
    params: {
      fresh: 1,
      ...filters,
    },
    cache: 'no-store',
  };
  if (signal) options.signal = signal;
  options.timeout = PRODUCT_READ_TIMEOUT_MS;
  return api.get<ProductsPagedResult>('/api/products/paged', options);
}

export async function createProduct(formData: FormData): Promise<ProductWithImages> {
  return api.post<ProductWithImages>('/api/products', formData, {
    headers: {}, // Let browser set multipart/form-data with boundary
    timeout: PRODUCT_WRITE_TIMEOUT_MS, // Product creation involves many DB ops + image uploads
  });
}

export async function updateProduct(
  id: string,
  data: Partial<ProductWithImages> | FormData
): Promise<ProductWithImages> {
  return api.put<ProductWithImages>(`/api/products/${id}`, data, {
    timeout: PRODUCT_WRITE_TIMEOUT_MS,
  });
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  try {
    await api.delete(`/api/products/${id}`);
    return { success: true };
  } catch (_error) {
    return { success: false };
  }
}

export async function getProductById(id: string): Promise<ProductWithImages> {
  return api.get<ProductWithImages>(`/api/products/${id}`, {
    timeout: PRODUCT_READ_TIMEOUT_MS,
  });
}

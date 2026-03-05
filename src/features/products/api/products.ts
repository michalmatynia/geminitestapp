import {
  type ProductWithImages,
  type ProductsPagedResult,
} from '@/shared/contracts/products/product';
import { type ProductFilter } from '@/shared/contracts/products/filters';
import { api, type ApiClientOptions } from '@/shared/lib/api-client';

const PRODUCT_READ_TIMEOUT_MS = 60_000;
const PRODUCT_WRITE_TIMEOUT_MS = 60_000;

// This function fetches a list of products from the API.
export async function getProducts(
  filters: ProductFilter,
  signal?: AbortSignal,
  requestOptions?: { fresh?: boolean }
): Promise<ProductWithImages[]> {
  const apiOptions: ApiClientOptions = {
    params: {
      ...(requestOptions?.fresh ? { fresh: 1 } : {}),
      ...filters,
    },
    cache: 'no-store',
  };
  if (signal) apiOptions.signal = signal;
  apiOptions.timeout = PRODUCT_READ_TIMEOUT_MS;
  return api.get<ProductWithImages[]>('/api/v2/products', apiOptions);
}

export async function countProducts(filters: ProductFilter, signal?: AbortSignal): Promise<number> {
  try {
    const options: ApiClientOptions = {
      params: {
        ...filters,
      },
      cache: 'no-store',
    };
    if (signal) options.signal = signal;
    options.timeout = PRODUCT_READ_TIMEOUT_MS;
    const data = await api.get<{ count: number }>('/api/v2/products/count', options);
    return data.count ?? 0;
  } catch (_error) {
    return 0;
  }
}

/**
 * Fetches products + total count in a single request via GET /api/v2/products/paged.
 * Prefer this over calling getProducts() and countProducts() separately.
 */
export async function getProductsWithCount(
  filters: ProductFilter,
  signal?: AbortSignal,
  requestOptions?: { fresh?: boolean }
): Promise<ProductsPagedResult> {
  const apiOptions: ApiClientOptions = {
    params: {
      ...(requestOptions?.fresh ? { fresh: 1 } : {}),
      ...filters,
    },
    cache: 'no-store',
  };
  if (signal) apiOptions.signal = signal;
  apiOptions.timeout = PRODUCT_READ_TIMEOUT_MS;
  return api.get<ProductsPagedResult>('/api/v2/products/paged', apiOptions);
}

export async function createProduct(formData: FormData): Promise<ProductWithImages> {
  return api.post<ProductWithImages>('/api/v2/products', formData, {
    headers: {}, // Let browser set multipart/form-data with boundary
    timeout: PRODUCT_WRITE_TIMEOUT_MS, // Product creation involves many DB ops + image uploads
  });
}

export async function updateProduct(
  id: string,
  data: Partial<ProductWithImages> | FormData
): Promise<ProductWithImages> {
  return api.put<ProductWithImages>(`/api/v2/products/${id}`, data, {
    timeout: PRODUCT_WRITE_TIMEOUT_MS,
  });
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  try {
    await api.delete(`/api/v2/products/${id}`);
    return { success: true };
  } catch (_error) {
    return { success: false };
  }
}

export async function getProductById(id: string): Promise<ProductWithImages> {
  return api.get<ProductWithImages>(`/api/v2/products/${id}`, {
    timeout: PRODUCT_READ_TIMEOUT_MS,
  });
}

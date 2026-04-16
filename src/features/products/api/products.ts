// Client product API helpers: wrapper around api client with sensible timeouts
// and no-store caching to avoid stale client-side caches. Prefer
// getProductsWithCount() for paged requests when possible.
import { type ProductFilter } from '@/shared/contracts/products/filters';
import {
  type ProductBulkArchiveResponse,
  type ProductWithImages,
  type ProductsPagedResult,
} from '@/shared/contracts/products/product';
import { api, type ApiClientOptions } from '@/shared/lib/api-client';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const PRODUCT_READ_TIMEOUT_MS = 60_000;
const PRODUCT_WRITE_TIMEOUT_MS = 60_000;

function buildGetOptions(filters: ProductFilter, signal?: AbortSignal, fresh?: boolean): ApiClientOptions {
  const options: ApiClientOptions = {
    params: {
      ...(fresh === true ? { fresh: 1 } : {}),
      ...filters,
    },
    cache: 'no-store',
    timeout: PRODUCT_READ_TIMEOUT_MS,
  };
  if (signal !== undefined) options.signal = signal;
  return options;
}

// This function fetches a list of products from the API.
export async function getProducts(
  filters: ProductFilter,
  signal?: AbortSignal,
  requestOptions?: { fresh?: boolean }
): Promise<ProductWithImages[]> {
  const options = buildGetOptions(filters, signal, requestOptions?.fresh);
  return api.get<ProductWithImages[]>('/api/v2/products', options);
}

export async function countProducts(filters: ProductFilter, signal?: AbortSignal): Promise<number> {
  try {
    const options = buildGetOptions(filters, signal);
    const data = await api.get<{ count: number }>('/api/v2/products/count', options);
    return data.count;
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'products.api',
      action: 'countProducts',
      filters,
      level: 'warn',
    });
    return 0;
  }
}

export async function getProductIds(
  filters: ProductFilter,
  signal?: AbortSignal
): Promise<string[]> {
  const options = buildGetOptions(filters, signal);
  const data = await api.get<{ ids?: string[] }>('/api/v2/products/ids', options);
  return Array.isArray(data.ids) ? data.ids : [];
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
  const options = buildGetOptions(filters, signal, requestOptions?.fresh);
  return api.get<ProductsPagedResult>('/api/v2/products/paged', options);
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
  } catch (error: unknown) {
    logClientCatch(error, {
      source: 'products.api',
      action: 'deleteProduct',
      id,
      level: 'warn',
    });
    return { success: false };
  }
}

export async function bulkSetProductsArchivedState(
  productIds: string[],
  archived: boolean
): Promise<ProductBulkArchiveResponse> {
  return api.post<ProductBulkArchiveResponse>('/api/v2/products/archive/batch', {
    productIds,
    archived,
  }, {
    timeout: PRODUCT_WRITE_TIMEOUT_MS,
  });
}

export async function getProductById(id: string): Promise<ProductWithImages> {
  return api.get<ProductWithImages>(`/api/v2/products/${id}`, {
    timeout: PRODUCT_READ_TIMEOUT_MS,
  });
}

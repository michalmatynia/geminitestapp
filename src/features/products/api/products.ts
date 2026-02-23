import { ProductWithImages } from '@/shared/contracts/products';
import { api, type ApiClientOptions } from '@/shared/lib/api-client';

const PRODUCT_READ_TIMEOUT_MS = 60_000;
const PRODUCT_WRITE_TIMEOUT_MS = 60_000;

// This function fetches a list of products from the API.
export async function getProducts(filters: {
  search?: string | undefined;
  id?: string | undefined;
  idMatchMode?: 'exact' | 'partial' | undefined;
  sku?: string | undefined;
  description?: string | undefined;
  categoryId?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  catalogId?: string | undefined;
  searchLanguage?: string | undefined;
  baseExported?: boolean | undefined;
}, signal?: AbortSignal): Promise<ProductWithImages[]> {
  const options: ApiClientOptions = {
    params: {
      search: filters.search,
      id: filters.id,
      idMatchMode: filters.idMatchMode,
      sku: filters.sku,
      description: filters.description,
      categoryId: filters.categoryId,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: filters.page,
      pageSize: filters.pageSize,
      catalogId: filters.catalogId,
      searchLanguage: filters.searchLanguage,
      baseExported: filters.baseExported,
    },
    cache: 'no-store',
  };
  if (signal) options.signal = signal;
  options.timeout = PRODUCT_READ_TIMEOUT_MS;
  return api.get<ProductWithImages[]>('/api/products', options);
}

export async function countProducts(filters: {
  search?: string | undefined;
  id?: string | undefined;
  idMatchMode?: 'exact' | 'partial' | undefined;
  sku?: string | undefined;
  description?: string | undefined;
  categoryId?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  catalogId?: string | undefined;
  searchLanguage?: string | undefined;
  baseExported?: boolean | undefined;
}, signal?: AbortSignal): Promise<number> {
  try {
    const options: ApiClientOptions = {
      params: {
        search: filters.search,
        id: filters.id,
        idMatchMode: filters.idMatchMode,
        sku: filters.sku,
        description: filters.description,
        categoryId: filters.categoryId,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        startDate: filters.startDate,
        endDate: filters.endDate,
        catalogId: filters.catalogId,
        searchLanguage: filters.searchLanguage,
        baseExported: filters.baseExported,
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

export type ProductsPagedResult = {
  products: ProductWithImages[];
  total: number;
};

type ProductListFilters = {
  search?: string | undefined;
  id?: string | undefined;
  idMatchMode?: 'exact' | 'partial' | undefined;
  sku?: string | undefined;
  description?: string | undefined;
  categoryId?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  catalogId?: string | undefined;
  searchLanguage?: string | undefined;
  baseExported?: boolean | undefined;
};

/**
 * Fetches products + total count in a single request via GET /api/products/paged.
 * Prefer this over calling getProducts() and countProducts() separately.
 */
export async function getProductsWithCount(
  filters: ProductListFilters,
  signal?: AbortSignal
): Promise<ProductsPagedResult> {
  const options: ApiClientOptions = {
    params: {
      search: filters.search,
      id: filters.id,
      idMatchMode: filters.idMatchMode,
      sku: filters.sku,
      description: filters.description,
      categoryId: filters.categoryId,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: filters.page,
      pageSize: filters.pageSize,
      catalogId: filters.catalogId,
      searchLanguage: filters.searchLanguage,
      baseExported: filters.baseExported,
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
  data: Partial<ProductWithImages> | FormData,
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

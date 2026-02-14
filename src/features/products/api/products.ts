import { ProductWithImages } from '@/features/products/types';
import { api } from '@/shared/lib/api-client';

// This function fetches a list of products from the API.
export async function getProducts(filters: {
  search?: string | undefined;
  sku?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  catalogId?: string | undefined;
  searchLanguage?: string | undefined;
}, signal?: AbortSignal): Promise<ProductWithImages[]> {
  return api.get<ProductWithImages[]>('/api/products', {
    params: {
      search: filters.search,
      sku: filters.sku,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: filters.page,
      pageSize: filters.pageSize,
      catalogId: filters.catalogId,
      searchLanguage: filters.searchLanguage,
    },
    cache: 'no-store',
    signal,
  });
}

export async function countProducts(filters: {
  search?: string | undefined;
  sku?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  catalogId?: string | undefined;
  searchLanguage?: string | undefined;
}, signal?: AbortSignal): Promise<number> {
  try {
    const data = await api.get<{ count: number }>('/api/products/count', {
      params: {
        search: filters.search,
        sku: filters.sku,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        startDate: filters.startDate,
        endDate: filters.endDate,
        catalogId: filters.catalogId,
        searchLanguage: filters.searchLanguage,
      },
      cache: 'no-store',
      signal,
    });
    return data.count ?? 0;
  } catch (_error) {
    return 0;
  }
}

export async function createProduct(formData: FormData): Promise<ProductWithImages> {
  return api.post<ProductWithImages>('/api/products', formData, {
    headers: {}, // Let browser set multipart/form-data with boundary
    timeout: 60000, // Product creation involves many DB ops + image uploads
  });
}

export async function updateProduct(id: string, data: Partial<ProductWithImages>): Promise<ProductWithImages> {
  return api.put<ProductWithImages>(`/api/products/${id}`, data);
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
  return api.get<ProductWithImages>(`/api/products/${id}`);
}

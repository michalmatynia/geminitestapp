import { logClientError } from '@/features/observability';
import { ProductWithImages } from '@/features/products/types';

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
}): Promise<ProductWithImages[]> {
  const query = new URLSearchParams();
  if (filters.search) query.append('search', filters.search);
  if (filters.sku) query.append('sku', filters.sku);
  if (filters.minPrice !== undefined) query.append('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) query.append('maxPrice', String(filters.maxPrice));
  if (filters.startDate) query.append('startDate', filters.startDate);
  if (filters.endDate) query.append('endDate', filters.endDate);
  if (filters.page) query.append('page', String(filters.page));
  if (filters.pageSize) query.append('pageSize', String(filters.pageSize));
  if (filters.catalogId) query.append('catalogId', filters.catalogId);
  if (filters.searchLanguage) query.append('searchLanguage', filters.searchLanguage);

  try {
    const res = await fetch(`/api/products?${query.toString()}`);
    if (!res.ok) {
      let payload: { error?: string; errorId?: string } | null = null;
      try {
        payload = (await res.json()) as { error?: string; errorId?: string };
      } catch {
        payload = null;
      }
      const message = payload?.error || 'Failed to fetch products';
      const errorId = payload?.errorId;
      const error = new Error(
        errorId ? `${message} (Error ID: ${errorId})` : message
      );
      (error as { errorId?: string | undefined }).errorId = errorId;
      logClientError(error, { context: { status: res.status, filters } });
      throw error;
    }
    return res.json() as Promise<ProductWithImages[]>;
  } catch (error) {
    if (!(error instanceof Error) || !(error as Error & { errorId?: string }).errorId) {
      logClientError(error, { context: { source: 'getProducts', filters } });
    }
    throw error;
  }
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
}): Promise<number> {
  const query = new URLSearchParams();
  if (filters.search) query.append('search', filters.search);
  if (filters.sku) query.append('sku', filters.sku);
  if (filters.minPrice !== undefined) query.append('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) query.append('maxPrice', String(filters.maxPrice));
  if (filters.startDate) query.append('startDate', filters.startDate);
  if (filters.endDate) query.append('endDate', filters.endDate);
  if (filters.catalogId) query.append('catalogId', filters.catalogId);
  if (filters.searchLanguage) query.append('searchLanguage', filters.searchLanguage);

  try {
    const res = await fetch(`/api/products/count?${query.toString()}`);
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      logClientError(new Error('Failed to fetch product count'), {
        context: { status: res.status, error: payload?.error, filters }
      });
      return 0;
    }
    const data = (await res.json()) as { count: number };
    return data.count ?? 0;
  } catch (error) {
    logClientError(error, { context: { source: 'countProducts', filters } });
    return 0;
  }
}

export async function createProduct(formData: FormData): Promise<ProductWithImages> {
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as { error?: string };
      const error = new Error(errorData.error || 'Failed to create product');
      logClientError(error, { context: { status: res.status } });
      throw error;
    }
    return res.json() as Promise<ProductWithImages>;
  } catch (error) {
    logClientError(error, { context: { source: 'createProduct' } });
    throw error;
  }
}

export async function updateProduct(id: string, data: Partial<ProductWithImages>): Promise<ProductWithImages> {
  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as { error?: string };
      const error = new Error(errorData.error || 'Failed to update product');
      logClientError(error, { context: { status: res.status, id } });
      throw error;
    }
    return res.json() as Promise<ProductWithImages>;
  } catch (error) {
    logClientError(error, { context: { source: 'updateProduct', id } });
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({}))) as { error?: string };
      const error = new Error(errorData.error || 'Failed to delete product');
      logClientError(error, { context: { status: res.status, id } });
      throw error;
    }
    if (res.status === 204) {
      return { success: true };
    }
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
    if (!data) return { success: true };
    return { success: data.success !== false };
  } catch (error) {
    logClientError(error, { context: { source: 'deleteProduct', id } });
    throw error;
  }
}

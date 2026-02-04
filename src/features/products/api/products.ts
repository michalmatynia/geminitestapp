import { ProductWithImages } from "@/features/products/types";

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
  if (filters.search) query.append("search", filters.search);
  if (filters.sku) query.append("sku", filters.sku);
  if (filters.minPrice !== undefined) query.append("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) query.append("maxPrice", String(filters.maxPrice));
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);
  if (filters.page) query.append("page", String(filters.page));
  if (filters.pageSize) query.append("pageSize", String(filters.pageSize));
  if (filters.catalogId) query.append("catalogId", filters.catalogId);
  if (filters.searchLanguage) query.append("searchLanguage", filters.searchLanguage);

  const res = await fetch(`/api/products?${query.toString()}`);
  if (!res.ok) {
    let payload: { error?: string; errorId?: string } | null = null;
    try {
      payload = (await res.json()) as { error?: string; errorId?: string };
    } catch {
      payload = null;
    }
    const message = payload?.error || "Failed to fetch products";
    const errorId = payload?.errorId;
    const error = new Error(
      errorId ? `${message} (Error ID: ${errorId})` : message
    );
    (error as { errorId?: string | undefined }).errorId = errorId;
    throw error;
  }
  return res.json() as Promise<ProductWithImages[]>;
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
  if (filters.search) query.append("search", filters.search);
  if (filters.sku) query.append("sku", filters.sku);
  if (filters.minPrice !== undefined) query.append("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) query.append("maxPrice", String(filters.maxPrice));
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);
  if (filters.catalogId) query.append("catalogId", filters.catalogId);
  if (filters.searchLanguage) query.append("searchLanguage", filters.searchLanguage);

  const res = await fetch(`/api/products/count?${query.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch product count");
  }
  const data = (await res.json()) as { count: number };
  return data.count;
}

export async function createProduct(formData: FormData): Promise<ProductWithImages> {
  const res = await fetch("/api/products", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || "Failed to create product");
  }
  return res.json() as Promise<ProductWithImages>;
}

export async function updateProduct(id: string, data: Partial<ProductWithImages>): Promise<ProductWithImages> {
  const res = await fetch(`/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || "Failed to update product");
  }
  return res.json() as Promise<ProductWithImages>;
}

export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/products/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || "Failed to delete product");
  }
  if (res.status === 204) {
    return { success: true };
  }
  const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
  if (!data) return { success: true };
  return { success: data.success !== false };
}

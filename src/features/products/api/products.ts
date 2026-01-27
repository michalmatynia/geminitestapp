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

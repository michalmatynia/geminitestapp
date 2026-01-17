import { ProductWithImages } from "@/types";

// This function fetches a list of products from the API.
export async function getProducts(filters: {
  search?: string;
  sku?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<ProductWithImages[]> {
  const query = new URLSearchParams();
  if (filters.search) query.append("search", filters.search);
  if (filters.sku) query.append("sku", filters.sku);
  if (filters.minPrice) query.append("minPrice", String(filters.minPrice));
  if (filters.maxPrice) query.append("maxPrice", String(filters.maxPrice));
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);
  if (filters.page) query.append("page", String(filters.page));
  if (filters.pageSize) query.append("pageSize", String(filters.pageSize));

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
    (error as { errorId?: string }).errorId = errorId;
    throw error;
  }
  return res.json() as Promise<ProductWithImages[]>;
}

export async function countProducts(filters: {
  search?: string;
  sku?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
}): Promise<number> {
  const query = new URLSearchParams();
  if (filters.search) query.append("search", filters.search);
  if (filters.sku) query.append("sku", filters.sku);
  if (filters.minPrice) query.append("minPrice", String(filters.minPrice));
  if (filters.maxPrice) query.append("maxPrice", String(filters.maxPrice));
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);

  const res = await fetch(`/api/products/count?${query.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch product count");
  }
  const data = (await res.json()) as { count: number };
  return data.count;
}


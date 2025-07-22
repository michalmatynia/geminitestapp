import { ProductWithImages, ConnectionLogType } from "./types";

// This function fetches a list of products from the API.
export async function getProducts(filters: {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
}): Promise<ProductWithImages[]> {
  const query = new URLSearchParams();
  if (filters.search) query.append("search", filters.search);
  if (filters.minPrice) query.append("minPrice", String(filters.minPrice));
  if (filters.maxPrice) query.append("maxPrice", String(filters.maxPrice));
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);

  const res = await fetch(`/api/products?${query.toString()}`);
  return res.json() as Promise<ProductWithImages[]>;
}

// This function fetches the connection logs from the API.
export async function getConnectionLogs(): Promise<ConnectionLogType[]> {
  const res = await fetch("/api/connections");
  return res.json() as Promise<ConnectionLogType[]>;
}
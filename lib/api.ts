import { Product } from "@/components/columns";

export async function getProducts(filters: { search?: string; minPrice?: number; maxPrice?: number; startDate?: string; endDate?: string }): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
  if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const res = await fetch(`/api/products?${params.toString()}`)
  if (!res.ok) {
    throw new Error("Failed to fetch data")
  }
  return res.json()
}

import { PriceGroup, Catalog, ProductCategoryWithChildren, ProductTag, PriceGroupType } from "@/features/products/types";

interface ApiPriceGroup extends Omit<PriceGroup, "currencyCode" | "groupType"> {
  currency: { code: string };
  type: PriceGroupType;
}

interface ApiCatalog extends Omit<Catalog, "description" | "priceGroupIds" | "defaultPriceGroupId"> {
  description: string | null;
  priceGroupIds: string[] | null;
  defaultPriceGroupId: string | null;
}

export async function getPriceGroups(): Promise<PriceGroup[]> {
  const res = await fetch("/api/price-groups");
  if (!res.ok) throw new Error("Failed to fetch price groups.");
  const data = (await res.json()) as ApiPriceGroup[];
  return data.map((group) => ({
    ...group,
    currencyCode: group.currency.code,
    groupType: group.type,
  }));
}

export async function getCatalogs(): Promise<Catalog[]> {
  const res = await fetch("/api/catalogs");
  if (!res.ok) throw new Error("Failed to fetch catalogs.");
  const data = (await res.json()) as ApiCatalog[];
  return data.map((catalog) => ({
    ...catalog,
    description: catalog.description ?? "",
    priceGroupIds: catalog.priceGroupIds ?? [],
    defaultPriceGroupId: catalog.defaultPriceGroupId ?? null,
  }));
}

export async function getCategories(catalogId: string | null): Promise<ProductCategoryWithChildren[]> {
  if (!catalogId) return [];
  const res = await fetch(`/api/products/categories/tree?catalogId=${catalogId}`);
  if (!res.ok) throw new Error("Failed to fetch product categories.");
  return (await res.json()) as ProductCategoryWithChildren[];
}

export async function getTags(catalogId: string | null): Promise<ProductTag[]> {
  if (!catalogId) return [];
  const res = await fetch(`/api/products/tags?catalogId=${catalogId}`);
  if (!res.ok) throw new Error("Failed to fetch product tags.");
  return (await res.json()) as ProductTag[];
}

export async function updatePriceGroup(group: PriceGroup): Promise<void> {
  const res = await fetch(`/api/price-groups/${group.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...group, type: group.groupType }),
  });
  if (!res.ok) throw new Error("Failed to update price group.");
}

export async function deletePriceGroup(id: string): Promise<void> {
  const res = await fetch(`/api/price-groups/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete price group.");
}

export async function deleteCatalog(id: string): Promise<void> {
  const res = await fetch(`/api/catalogs/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete catalog.");
}

export async function createCatalog(data: Partial<Catalog>): Promise<Catalog> {
  const res = await fetch("/api/catalogs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create catalog.");
  }
  return res.json();
}

export async function updateCatalog(id: string, data: Partial<Catalog>): Promise<Catalog> {
  const res = await fetch(`/api/catalogs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update catalog.");
  }
  return res.json();
}

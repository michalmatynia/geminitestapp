import { 
  Catalog, 
  CatalogRecord,
  PriceGroup, 
  ProductCategory, 
  ProductCategoryWithChildren,
  ProductTag, 
  ProductParameter 
} from "../types";

export async function getPriceGroups(): Promise<PriceGroup[]> {
  try {
    const res = await fetch("/api/price-groups");
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      console.warn("[price-groups] Failed to load price groups", payload?.error ?? res.status);
      return [];
    }
    return (await res.json()) as PriceGroup[];
  } catch (error) {
    console.warn("[price-groups] Failed to load price groups", error);
    return [];
  }
}

export async function updatePriceGroup(group: PriceGroup): Promise<PriceGroup> {
  const res = await fetch(`/api/price-groups/${group.groupId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(group),
  });
  if (!res.ok) throw new Error("Failed to update price group");
  return (await res.json()) as PriceGroup;
}

export async function deletePriceGroup(id: string): Promise<void> {
  const res = await fetch(`/api/price-groups/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete price group");
}

export async function savePriceGroup(id: string | undefined, data: Partial<PriceGroup>): Promise<PriceGroup> {
  const url = id ? `/api/price-groups/${id}` : "/api/price-groups";
  const method = id ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save price group");
  return (await res.json()) as PriceGroup;
}

export async function getCatalogs(): Promise<CatalogRecord[]> {
  const res = await fetch("/api/catalogs");
  if (!res.ok) throw new Error("Failed to load catalogs");
  return (await res.json()) as CatalogRecord[];
}

export async function deleteCatalog(id: string): Promise<void> {
  const res = await fetch(`/api/catalogs/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete catalog");
}

export async function createCatalog(data: Partial<Catalog>): Promise<Catalog> {
  const res = await fetch("/api/catalogs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create catalog");
  return (await res.json()) as Catalog;
}

export async function updateCatalog(id: string, data: Partial<Catalog>): Promise<Catalog> {
  const res = await fetch(`/api/catalogs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update catalog");
  return (await res.json()) as Catalog;
}

export async function getCategories(catalogId: string | null): Promise<ProductCategoryWithChildren[]> {
  try {
    const url = catalogId ? `/api/products/categories/tree?catalogId=${catalogId}` : "/api/products/categories/tree";
    const res = await fetch(url);
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      console.warn("[categories] Failed to load categories", payload?.error ?? res.status);
      return [];
    }
    return (await res.json()) as ProductCategoryWithChildren[];
  } catch (error) {
    console.warn("[categories] Failed to load categories", error);
    return [];
  }
}

export async function createCategory(data: Partial<ProductCategory>): Promise<ProductCategory> {
  const res = await fetch("/api/products/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return (await res.json()) as ProductCategory;
}

export async function updateCategory(id: string, data: Partial<ProductCategory>): Promise<ProductCategory> {
  const res = await fetch(`/api/products/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update category");
  return (await res.json()) as ProductCategory;
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/products/categories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete category");
}

export async function getTags(catalogId: string | null): Promise<ProductTag[]> {
  const url = catalogId ? `/api/products/tags?catalogId=${catalogId}` : "/api/products/tags";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load tags");
  return (await res.json()) as ProductTag[];
}

export async function createTag(data: Partial<ProductTag>): Promise<ProductTag> {
  const res = await fetch("/api/products/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create tag");
  return (await res.json()) as ProductTag;
}

export async function updateTag(id: string, data: Partial<ProductTag>): Promise<ProductTag> {
  const res = await fetch(`/api/products/tags/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update tag");
  return (await res.json()) as ProductTag;
}

export async function deleteTag(id: string): Promise<void> {
  const res = await fetch(`/api/products/tags/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete tag");
}

export async function getParameters(catalogId: string | null): Promise<ProductParameter[]> {
  const url = catalogId ? `/api/products/parameters?catalogId=${catalogId}` : "/api/products/parameters";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load parameters");
  return (await res.json()) as ProductParameter[];
}

export async function createParameter(data: Partial<ProductParameter>): Promise<ProductParameter> {
  const res = await fetch("/api/products/parameters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create parameter");
  return (await res.json()) as ProductParameter;
}

export async function updateParameter(id: string, data: Partial<ProductParameter>): Promise<ProductParameter> {
  const res = await fetch(`/api/products/parameters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update parameter");
  return (await res.json()) as ProductParameter;
}

export async function deleteParameter(id: string): Promise<void> {
  const res = await fetch(`/api/products/parameters/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete parameter");
}

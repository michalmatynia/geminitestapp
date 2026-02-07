import { api } from '@/shared/lib/api-client';

import { 
  Catalog, 
  CatalogRecord,
  PriceGroup, 
  ProductCategory, 
  ProductCategoryWithChildren,
  ProductTag, 
  ProductParameter 
} from '../types';


export async function getPriceGroups(): Promise<PriceGroup[]> {
  try {
    return await api.get<PriceGroup[]>('/api/price-groups');
  } catch (error) {
    console.warn('[price-groups] Failed to load price groups', error);
    return [];
  }
}

export async function updatePriceGroup(group: PriceGroup): Promise<PriceGroup> {
  return api.put<PriceGroup>(`/api/price-groups/${group.groupId}`, group);
}

export async function deletePriceGroup(id: string): Promise<void> {
  return api.delete(`/api/price-groups/${id}`);
}

export async function savePriceGroup(id: string | undefined, data: Partial<PriceGroup>): Promise<PriceGroup> {
  if (id) {
    return api.put<PriceGroup>(`/api/price-groups/${id}`, data);
  }
  return api.post<PriceGroup>('/api/price-groups', data);
}

export async function getCatalogs(): Promise<CatalogRecord[]> {
  return api.get<CatalogRecord[]>('/api/catalogs');
}

export async function deleteCatalog(id: string): Promise<void> {
  return api.delete(`/api/catalogs/${id}`);
}

export async function createCatalog(data: Partial<Catalog>): Promise<Catalog> {
  return api.post<Catalog>('/api/catalogs', data);
}

export async function updateCatalog(id: string, data: Partial<Catalog>): Promise<Catalog> {
  return api.put<Catalog>(`/api/catalogs/${id}`, data);
}

export async function getCategories(catalogId: string | null): Promise<ProductCategoryWithChildren[]> {
  try {
    return await api.get<ProductCategoryWithChildren[]>('/api/products/categories/tree', {
      params: { catalogId: catalogId || undefined }
    });
  } catch (error) {
    console.warn('[categories] Failed to load categories', error);
    return [];
  }
}

export async function createCategory(data: Partial<ProductCategory>): Promise<ProductCategory> {
  return api.post<ProductCategory>('/api/products/categories', data);
}

export async function updateCategory(id: string, data: Partial<ProductCategory>): Promise<ProductCategory> {
  return api.put<ProductCategory>(`/api/products/categories/${id}`, data);
}

export async function deleteCategory(id: string): Promise<void> {
  return api.delete(`/api/products/categories/${id}`);
}

export async function getTags(catalogId: string | null): Promise<ProductTag[]> {
  return api.get<ProductTag[]>('/api/products/tags', {
    params: { catalogId: catalogId || undefined }
  });
}

export async function createTag(data: Partial<ProductTag>): Promise<ProductTag> {
  return api.post<ProductTag>('/api/products/tags', data);
}

export async function updateTag(id: string, data: Partial<ProductTag>): Promise<ProductTag> {
  return api.put<ProductTag>(`/api/products/tags/${id}`, data);
}

export async function deleteTag(id: string): Promise<void> {
  return api.delete(`/api/products/tags/${id}`);
}

export async function getParameters(catalogId: string | null): Promise<ProductParameter[]> {
  return api.get<ProductParameter[]>('/api/products/parameters', {
    params: { catalogId: catalogId || undefined }
  });
}

export async function createParameter(data: Partial<ProductParameter>): Promise<ProductParameter> {
  return api.post<ProductParameter>('/api/products/parameters', data);
}

export async function updateParameter(id: string, data: Partial<ProductParameter>): Promise<ProductParameter> {
  return api.put<ProductParameter>(`/api/products/parameters/${id}`, data);
}

export async function deleteParameter(id: string): Promise<void> {
  return api.delete(`/api/products/parameters/${id}`);
}

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  type ProductValidationPattern,
  type ProductValidatorConfig,
  type ProductValidatorSettings,
  type CreateProductValidationPatternInput as CreateValidationPatternPayload,
  type UpdateProductValidationPatternInput as UpdateValidationPatternPayload,
  type ReorderProductValidationPatternUpdate as ReorderValidationPatternUpdatePayload,
} from '@/shared/contracts/products/validation';

export type {
  CreateValidationPatternPayload,
  UpdateValidationPatternPayload,
  ReorderValidationPatternUpdatePayload,
};

import {
  type ProductValidatorImportRequest,
  type ProductValidatorImportResult,
} from '@/shared/contracts/validator-import';

export type ImportValidationPatternsPayload = ProductValidatorImportRequest;
export type ImportValidationPatternsResult = ProductValidatorImportResult;

import {
  type Catalog,
  type CatalogRecord,
  type PriceGroup,
} from '@/shared/contracts/products/catalogs';
import {
  type ProductCategory,
  type ProductCategoryWithChildren,
  type ReorderProductCategory as ReorderCategoryPayload,
} from '@/shared/contracts/products/categories';

export type { ReorderCategoryPayload };

import { type ProductTag } from '@/shared/contracts/products/tags';
import { type ProductParameter } from '@/shared/contracts/products/parameters';
import { api } from '@/shared/lib/api-client';

const PRICE_GROUPS_ENDPOINT = '/api/v2/products/metadata/price-groups';
const CATALOGS_ENDPOINT = '/api/v2/products/entities/catalogs';

export async function getPriceGroups(): Promise<PriceGroup[]> {
  try {
    return await api.get<PriceGroup[]>(PRICE_GROUPS_ENDPOINT);
  } catch (error) {
    logClientError(error instanceof Error ? error : new Error('Failed to load price groups'), {
      context: { source: 'products-api-settings', action: 'getPriceGroups' },
    });
    return [];
  }
}

export async function updatePriceGroup(group: PriceGroup): Promise<PriceGroup> {
  return api.put<PriceGroup>(`${PRICE_GROUPS_ENDPOINT}/${group.groupId}`, group);
}

export async function deletePriceGroup(id: string): Promise<void> {
  return api.delete(`${PRICE_GROUPS_ENDPOINT}/${id}`);
}

export async function savePriceGroup(
  id: string | undefined,
  data: Partial<PriceGroup>
): Promise<PriceGroup> {
  if (id) {
    return api.put<PriceGroup>(`${PRICE_GROUPS_ENDPOINT}/${id}`, data);
  }
  return api.post<PriceGroup>(PRICE_GROUPS_ENDPOINT, data);
}

export async function getCatalogs(): Promise<CatalogRecord[]> {
  return api.get<CatalogRecord[]>(CATALOGS_ENDPOINT);
}

export async function deleteCatalog(id: string): Promise<void> {
  return api.delete(`${CATALOGS_ENDPOINT}/${id}`);
}

export async function createCatalog(data: Partial<Catalog>): Promise<Catalog> {
  return api.post<Catalog>(CATALOGS_ENDPOINT, data);
}

export async function updateCatalog(id: string, data: Partial<Catalog>): Promise<Catalog> {
  return api.put<Catalog>(`${CATALOGS_ENDPOINT}/${id}`, data);
}

export async function getCategories(
  catalogId: string | null
): Promise<ProductCategoryWithChildren[]> {
  try {
    return await api.get<ProductCategoryWithChildren[]>('/api/v2/products/categories/tree', {
      params: { catalogId: catalogId || undefined, fresh: 1 },
      cache: 'no-store',
    });
  } catch (error) {
    logClientError(error instanceof Error ? error : new Error('Failed to load categories'), {
      context: { source: 'products-api-settings', action: 'getCategories', catalogId },
    });
    return [];
  }
}

export async function getCategoriesFlat(catalogId: string | null): Promise<ProductCategory[]> {
  try {
    return await api.get<ProductCategory[]>('/api/v2/products/categories', {
      params: { catalogId: catalogId || undefined, fresh: 1 },
      cache: 'no-store',
    });
  } catch (error) {
    logClientError(error instanceof Error ? error : new Error('Failed to load flat categories'), {
      context: { source: 'products-api-settings', action: 'getCategoriesFlat', catalogId },
    });
    return [];
  }
}

export async function createCategory(data: Partial<ProductCategory>): Promise<ProductCategory> {
  return api.post<ProductCategory>('/api/v2/products/categories', data);
}

export async function updateCategory(
  id: string,
  data: Partial<ProductCategory>
): Promise<ProductCategory> {
  return api.put<ProductCategory>(`/api/v2/products/categories/${id}`, data);
}

export async function reorderCategory(payload: ReorderCategoryPayload): Promise<ProductCategory> {
  return api.post<ProductCategory>('/api/v2/products/categories/reorder', payload);
}

export async function deleteCategory(id: string): Promise<void> {
  return api.delete(`/api/v2/products/categories/${id}`);
}

export async function getTags(catalogId: string | null): Promise<ProductTag[]> {
  return api.get<ProductTag[]>('/api/v2/products/tags', {
    params: { catalogId: catalogId || undefined },
  });
}

export async function createTag(data: Partial<ProductTag>): Promise<ProductTag> {
  return api.post<ProductTag>('/api/v2/products/tags', data);
}

export async function updateTag(id: string, data: Partial<ProductTag>): Promise<ProductTag> {
  return api.put<ProductTag>(`/api/v2/products/tags/${id}`, data);
}

export async function deleteTag(id: string): Promise<void> {
  return api.delete(`/api/v2/products/tags/${id}`);
}

export async function getParameters(catalogId: string | null): Promise<ProductParameter[]> {
  return api.get<ProductParameter[]>('/api/v2/products/parameters', {
    params: { catalogId: catalogId || undefined, fresh: 1 },
    cache: 'no-store',
  });
}

export async function createParameter(data: Partial<ProductParameter>): Promise<ProductParameter> {
  return api.post<ProductParameter>('/api/v2/products/parameters', data);
}

export async function updateParameter(
  id: string,
  data: Partial<ProductParameter>
): Promise<ProductParameter> {
  return api.put<ProductParameter>(`/api/v2/products/parameters/${id}`, data);
}

export async function deleteParameter(id: string): Promise<void> {
  return api.delete(`/api/v2/products/parameters/${id}`);
}

export async function getValidatorSettings(): Promise<ProductValidatorSettings> {
  return api.get<ProductValidatorSettings>('/api/v2/products/validator-settings');
}

export async function updateValidatorSettings(
  data: Partial<ProductValidatorSettings>
): Promise<ProductValidatorSettings> {
  return api.put<ProductValidatorSettings>('/api/v2/products/validator-settings', data);
}

export async function getValidationPatterns(): Promise<ProductValidationPattern[]> {
  return api.get<ProductValidationPattern[]>('/api/v2/products/validator-patterns');
}

export async function createValidationPattern(
  data: CreateValidationPatternPayload
): Promise<ProductValidationPattern> {
  return api.post<ProductValidationPattern>('/api/v2/products/validator-patterns', data);
}

export async function updateValidationPattern(
  id: string,
  data: UpdateValidationPatternPayload
): Promise<ProductValidationPattern> {
  return api.put<ProductValidationPattern>(`/api/v2/products/validator-patterns/${id}`, data);
}

export async function deleteValidationPattern(id: string): Promise<void> {
  return api.delete(`/api/v2/products/validator-patterns/${id}`);
}

export async function reorderValidationPatterns(payload: {
  updates: ReorderValidationPatternUpdatePayload[];
}): Promise<{ updated: ProductValidationPattern[] }> {
  return api.post<{ updated: ProductValidationPattern[] }>(
    '/api/v2/products/validator-patterns/reorder',
    payload
  );
}

export async function importValidationPatterns(
  payload: ProductValidatorImportRequest
): Promise<ProductValidatorImportResult> {
  return api.post<ProductValidatorImportResult>('/api/v2/products/validator-patterns/import', payload);
}

export async function getProductValidatorConfig(
  includeDisabled: boolean = false
): Promise<ProductValidatorConfig> {
  if (includeDisabled) {
    return api.get<ProductValidatorConfig>('/api/v2/products/validator-config', {
      params: { includeDisabled: true },
    });
  }
  return api.get<ProductValidatorConfig>('/api/v2/products/validator-config');
}

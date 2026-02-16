import {
  createPostMutation,
  createPatchMutation,
  createDeleteMutation,
  createSaveMutation,
} from '@/shared/lib/api-hooks';
import {
  createListQuery,
  createSingleQuery,
} from '@/shared/lib/query-factories';
import {
  invalidateCatalogScopedData,
  invalidatePriceGroups,
  invalidateProductSettingsCatalogs,
  invalidateValidatorConfig,
} from '@/shared/lib/query-invalidation';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';
export { productSettingsKeys };
import type { DeleteResponse } from '@/shared/types/api/api';
import type {
  ProductValidationPattern,
  ProductValidatorConfig,
  ProductValidatorSettings,
} from '@/shared/types/domain/products';
import type { 
  ListQuery,
  SingleQuery,
} from '@/shared/types/query-result-types';

import * as api from '../api/settings';
import {
  Catalog,
  CatalogRecord,
  PriceGroup,
  ProductCategory,
  ProductCategoryWithChildren,
  ProductParameter,
  ProductTag,
} from '../types';
import {
  useCatalogs as useMetadataCatalogs,
  useParameters as useMetadataParameters,
  usePriceGroups as useMetadataPriceGroups,
  useTags as useMetadataTags,
} from './useProductMetadataQueries';


export function usePriceGroups(): ListQuery<PriceGroup> {
  return useMetadataPriceGroups() as ListQuery<PriceGroup>;
}

export function useCatalogs(): ListQuery<CatalogRecord> {
  return useMetadataCatalogs();
}

export function useCategories(catalogId: string | null): ListQuery<ProductCategoryWithChildren> {
  return createListQuery({
    queryKey: productSettingsKeys.categoryTree(catalogId),
    queryFn: () => api.getCategories(catalogId),
    enabled: !!catalogId,
  });
}

export function useTags(catalogId: string | null): ListQuery<ProductTag> {
  return useMetadataTags(catalogId ?? undefined);
}

export function useParameters(catalogId: string | null): ListQuery<ProductParameter> {
  return useMetadataParameters(catalogId ?? undefined);
}

export function useValidatorSettings(): SingleQuery<ProductValidatorSettings> {
  return createSingleQuery({
    id: 'global',
    queryKey: () => productSettingsKeys.validatorSettings(),
    queryFn: api.getValidatorSettings,
  });
}

export function useValidationPatterns(): ListQuery<ProductValidationPattern> {
  return createListQuery({
    queryKey: productSettingsKeys.validatorPatterns(),
    queryFn: api.getValidationPatterns,
  });
}

export function useProductValidatorConfig(includeDisabled: boolean = false): SingleQuery<ProductValidatorConfig> {
  return createSingleQuery({
    id: includeDisabled ? 'config-all' : 'config-active',
    queryKey: () => productSettingsKeys.validatorConfig(includeDisabled),
    queryFn: () => api.getProductValidatorConfig(includeDisabled),
  });
}

export function useUpdatePriceGroupMutation() {
  return createPatchMutation<PriceGroup, PriceGroup>({
    endpoint: (group) => `/api/products/price-groups/${group.id}`,
    onSuccess: (_data, _variables, _context, queryClient) => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeletePriceGroupMutation() {
  return createDeleteMutation<DeleteResponse, string>({
    endpoint: (id) => `/api/products/price-groups/${id}`,
    onSuccess: (_data, _variables, _context, queryClient) => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useSavePriceGroupMutation() {
  return createSaveMutation<PriceGroup, { id?: string; data: Partial<PriceGroup> }>({
    createEndpoint: '/api/products/price-groups',
    updateEndpoint: ({ id }) => `/api/products/price-groups/${id}`,
    onSuccess: (_data, _variables, _context, queryClient) => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeleteCatalogMutation() {
  return createDeleteMutation<DeleteResponse, string>({
    endpoint: (id) => `/api/products/catalogs/${id}`,
    onSuccess: (_data, _variables, _context, queryClient) => {
      void invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCatalogMutation() {
  return createSaveMutation<Catalog, { id?: string; data: Partial<Catalog> }>({
    createEndpoint: '/api/products/catalogs',
    updateEndpoint: ({ id }) => `/api/products/catalogs/${id}`,
    onSuccess: (_data, _variables, _context, queryClient) => {
      void invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCategoryMutation() {
  return createSaveMutation<ProductCategory, { id?: string; data: Partial<ProductCategory> }>({
    createEndpoint: '/api/products/categories',
    updateEndpoint: ({ id }) => `/api/products/categories/${id}`,
    onSuccess: (_data, variables, _context, queryClient) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteCategoryMutation() {
  return createDeleteMutation<DeleteResponse, { id: string; catalogId: string | null }>({
    endpoint: ({ id }) => `/api/products/categories/${id}`,
    onSuccess: (_data, variables, _context, queryClient) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useReorderCategoryMutation() {
  return createPatchMutation<ProductCategory, api.ReorderCategoryPayload>({
    endpoint: '/api/products/categories/reorder',
    onSuccess: (_data, variables, _context, queryClient) => {
      const catalogId = variables.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useSaveTagMutation() {
  return createSaveMutation<ProductTag, { id?: string; data: Partial<ProductTag> }>({
    createEndpoint: '/api/products/tags',
    updateEndpoint: ({ id }) => `/api/products/tags/${id}`,
    onSuccess: (_data, variables, _context, queryClient) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteTagMutation() {
  return createDeleteMutation<DeleteResponse, { id: string; catalogId: string | null }>({
    endpoint: ({ id }) => `/api/products/tags/${id}`,
    onSuccess: (_data, variables, _context, queryClient) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useSaveParameterMutation() {
  return createSaveMutation<ProductParameter, { id?: string; data: Partial<ProductParameter> }>({
    createEndpoint: '/api/products/parameters',
    updateEndpoint: ({ id }) => `/api/products/parameters/${id}`,
    onSuccess: (_data, variables, _context, queryClient) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteParameterMutation() {
  return createDeleteMutation<DeleteResponse, { id: string; catalogId: string | null }>({
    endpoint: ({ id }) => `/api/products/parameters/${id}`,
    onSuccess: (_data, variables, _context, queryClient) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useUpdateValidatorSettingsMutation() {
  return createPatchMutation<ProductValidatorSettings, Partial<ProductValidatorSettings>>({
    endpoint: '/api/products/validator-settings',
    onSuccess: (_data, _variables, _context, queryClient) => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useCreateValidationPatternMutation() {
  return createPostMutation<ProductValidationPattern, api.CreateValidationPatternPayload>({
    endpoint: '/api/products/validator-patterns',
    onSuccess: (_data, _variables, _context, queryClient) => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useUpdateValidationPatternMutation() {
  return createPatchMutation<ProductValidationPattern, { id: string; data: api.UpdateValidationPatternPayload }>({
    endpoint: ({ id }) => `/api/products/validator-patterns/${id}`,
    onSuccess: (_data, _variables, _context, queryClient) => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useDeleteValidationPatternMutation() {
  return createDeleteMutation<DeleteResponse, string>({
    endpoint: (id) => `/api/products/validator-patterns/${id}`,
    onSuccess: (_data, _variables, _context, queryClient) => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}


'use client';

import { useQueryClient } from '@tanstack/react-query';

import {
  createListQueryV2,
  createSingleQueryV2,
  createMutationV2,
  createCreateMutationV2,
  createUpdateMutationV2,
  createDeleteMutationV2,
} from '@/shared/lib/query-factories-v2';
import {
  invalidateCatalogScopedData,
  invalidatePriceGroups,
  invalidateProductSettingsCatalogs,
  invalidateValidatorConfig,
} from '@/shared/lib/query-invalidation';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';
export { productSettingsKeys };
import type {
  ProductValidationPattern,
  ProductValidatorConfig,
  ProductValidatorSettings,
} from '@/shared/types/domain/products';
import type { 
  UpdateMutation, 
  DeleteMutation, 
  SaveMutation, 
  CreateMutation,
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
  return useMetadataPriceGroups();
}

export function useCatalogs(): ListQuery<CatalogRecord> {
  return useMetadataCatalogs();
}

export function useCategories(catalogId: string | null): ListQuery<ProductCategoryWithChildren> {
  const queryKey = productSettingsKeys.categoryTree(catalogId);
  return createListQueryV2({
    queryKey,
    queryFn: () => api.getCategories(catalogId),
    enabled: !!catalogId,
    meta: {
      source: 'products.hooks.useCategories',
      operation: 'list',
      resource: 'products.settings.categories.tree',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'categories', 'tree'],
    },
  });
}

export function useTags(catalogId: string | null): ListQuery<ProductTag> {
  return useMetadataTags(catalogId ?? undefined);
}

export function useParameters(catalogId: string | null): ListQuery<ProductParameter> {
  return useMetadataParameters(catalogId ?? undefined);
}

export function useValidatorSettings(): SingleQuery<ProductValidatorSettings> {
  const queryKey = productSettingsKeys.validatorSettings();
  return createSingleQueryV2({
    id: 'global',
    queryKey,
    queryFn: api.getValidatorSettings,
    meta: {
      source: 'products.hooks.useValidatorSettings',
      operation: 'detail',
      resource: 'products.settings.validator',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'validator'],
    },
  });
}

export function useValidationPatterns(): ListQuery<ProductValidationPattern> {
  const queryKey = productSettingsKeys.validatorPatterns();
  return createListQueryV2({
    queryKey,
    queryFn: api.getValidationPatterns,
    meta: {
      source: 'products.hooks.useValidationPatterns',
      operation: 'list',
      resource: 'products.settings.validator.patterns',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'validator', 'patterns'],
    },
  });
}

export function useProductValidatorConfig(includeDisabled: boolean = false): SingleQuery<ProductValidatorConfig> {
  const id = includeDisabled ? 'config-all' : 'config-active';
  const queryKey = productSettingsKeys.validatorConfig(includeDisabled);
  return createSingleQueryV2({
    id,
    queryKey,
    queryFn: () => api.getProductValidatorConfig(includeDisabled),
    meta: {
      source: 'products.hooks.useProductValidatorConfig',
      operation: 'detail',
      resource: 'products.settings.validator.config',
      domain: 'products',
      queryKey,
      tags: ['products', 'settings', 'validator', 'config'],
    },
  });
}

export function useUpdatePriceGroupMutation(): UpdateMutation<PriceGroup, PriceGroup> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.priceGroups();
  return createUpdateMutationV2({
    mutationFn: (group: PriceGroup) => api.updatePriceGroup(group),
    mutationKey,
    meta: {
      source: 'products.hooks.useUpdatePriceGroupMutation',
      operation: 'update',
      resource: 'products.settings.price-groups',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'price-groups', 'update'],
    },
    onSuccess: (_data: PriceGroup, _variables: PriceGroup, _context: unknown) => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeletePriceGroupMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.priceGroups();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.deletePriceGroup(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeletePriceGroupMutation',
      operation: 'delete',
      resource: 'products.settings.price-groups',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'price-groups', 'delete'],
    },
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useSavePriceGroupMutation(): SaveMutation<PriceGroup> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.priceGroups();
  return createMutationV2({
    mutationFn: ({ id, data }: { id?: string; data: Partial<PriceGroup> }) => api.savePriceGroup(id, data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSavePriceGroupMutation',
      operation: 'action',
      resource: 'products.settings.price-groups',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'price-groups', 'save'],
    },
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeleteCatalogMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.catalogs();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.deleteCatalog(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteCatalogMutation',
      operation: 'delete',
      resource: 'products.settings.catalogs',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'catalogs', 'delete'],
    },
    onSuccess: () => {
      void invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCatalogMutation(): SaveMutation<Catalog> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.catalogs();
  return createMutationV2({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Catalog> }) =>
      id ? api.updateCatalog(id, data) : api.createCatalog(data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveCatalogMutation',
      operation: 'action',
      resource: 'products.settings.catalogs',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'catalogs', 'save'],
    },
    onSuccess: () => {
      void invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCategoryMutation(): SaveMutation<ProductCategory, { id: string | undefined; data: Partial<ProductCategory> }> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.all;
  return createMutationV2({
    mutationFn: ({ id, data }: { id: string | undefined; data: Partial<ProductCategory> }) =>
      id ? api.updateCategory(id, data) : api.createCategory(data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveCategoryMutation',
      operation: 'action',
      resource: 'products.settings.categories',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'categories', 'save'],
    },
    onSuccess: (_data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteCategoryMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.all;
  return createDeleteMutationV2({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteCategory(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteCategoryMutation',
      operation: 'delete',
      resource: 'products.settings.categories',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'categories', 'delete'],
    },
    onSuccess: (_data, variables) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useReorderCategoryMutation(): UpdateMutation<ProductCategory, api.ReorderCategoryPayload> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.all;
  return createUpdateMutationV2({
    mutationFn: (payload: api.ReorderCategoryPayload) =>
      api.reorderCategory(payload),
    mutationKey,
    meta: {
      source: 'products.hooks.useReorderCategoryMutation',
      operation: 'update',
      resource: 'products.settings.categories.reorder',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'categories', 'reorder'],
    },
    onSuccess: (_data: ProductCategory, variables: api.ReorderCategoryPayload) => {
      const catalogId = variables.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useSaveTagMutation(): SaveMutation<ProductTag, { id: string | undefined; data: Partial<ProductTag> }> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.all;
  return createMutationV2({
    mutationFn: ({ id, data }: { id: string | undefined; data: Partial<ProductTag> }) =>
      id ? api.updateTag(id, data) : api.createTag(data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveTagMutation',
      operation: 'action',
      resource: 'products.settings.tags',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'tags', 'save'],
    },
    onSuccess: (_data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteTagMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.all;
  return createDeleteMutationV2({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteTag(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteTagMutation',
      operation: 'delete',
      resource: 'products.settings.tags',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'tags', 'delete'],
    },
    onSuccess: (_data, variables) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useSaveParameterMutation(): SaveMutation<ProductParameter, { id: string | undefined; data: Partial<ProductParameter> }> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.all;
  return createMutationV2({
    mutationFn: ({ id, data }: { id: string | undefined; data: Partial<ProductParameter> }) =>
      id ? api.updateParameter(id, data) : api.createParameter(data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSaveParameterMutation',
      operation: 'action',
      resource: 'products.settings.parameters',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'parameters', 'save'],
    },
    onSuccess: (_data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteParameterMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.all;
  return createDeleteMutationV2({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteParameter(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteParameterMutation',
      operation: 'delete',
      resource: 'products.settings.parameters',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'parameters', 'delete'],
    },
    onSuccess: (_data, variables) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useUpdateValidatorSettingsMutation(): UpdateMutation<ProductValidatorSettings, Partial<ProductValidatorSettings>> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.validatorSettings();
  return createUpdateMutationV2({
    mutationFn: api.updateValidatorSettings,
    mutationKey,
    meta: {
      source: 'products.hooks.useUpdateValidatorSettingsMutation',
      operation: 'update',
      resource: 'products.settings.validator',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'update'],
    },
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useCreateValidationPatternMutation(): CreateMutation<ProductValidationPattern, api.CreateValidationPatternPayload> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createCreateMutationV2({
    mutationFn: api.createValidationPattern,
    mutationKey,
    meta: {
      source: 'products.hooks.useCreateValidationPatternMutation',
      operation: 'create',
      resource: 'products.settings.validator.patterns',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'create'],
    },
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useUpdateValidationPatternMutation(): UpdateMutation<ProductValidationPattern, { id: string; data: api.UpdateValidationPatternPayload }> {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createUpdateMutationV2({
    mutationFn: ({ id, data }: { id: string; data: api.UpdateValidationPatternPayload }) => api.updateValidationPattern(id, data),
    mutationKey,
    meta: {
      source: 'products.hooks.useUpdateValidationPatternMutation',
      operation: 'update',
      resource: 'products.settings.validator.patterns',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'update'],
    },
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useDeleteValidationPatternMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.deleteValidationPattern(id),
    mutationKey,
    meta: {
      source: 'products.hooks.useDeleteValidationPatternMutation',
      operation: 'delete',
      resource: 'products.settings.validator.patterns',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'delete'],
    },
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

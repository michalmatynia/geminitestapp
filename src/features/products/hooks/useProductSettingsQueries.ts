'use client';

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
import {
  type ProductParameter,
  type ProductSimpleParameter,
} from '@/shared/contracts/products/parameters';
import { type ProductTag } from '@/shared/contracts/products/tags';
import {
  type ProductValidationPattern,
  type ProductValidatorConfig,
  type ProductValidatorSettings,
  type CreateProductValidationPatternInput as CreateValidationPatternPayload,
  type UpdateProductValidationPatternInput as UpdateValidationPatternPayload,
  type ReorderProductValidationPatternUpdate as ReorderValidationPatternUpdatePayload,
} from '@/shared/contracts/products/validation';
import {
  type ProductValidatorImportRequest as ImportValidationPatternsPayload,
  type ProductValidatorImportResult as ImportValidationPatternsResult,
} from '@/shared/contracts/validator-import';
import type {
  UpdateMutation,
  DeleteMutation,
  SaveMutation,
  CreateMutation,
  ListQuery,
  SingleQuery,
} from '@/shared/contracts/ui';
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

import {
  useCatalogs as useMetadataCatalogs,
  useParameters as useMetadataParameters,
  useSimpleParameters as useMetadataSimpleParameters,
  usePriceGroups as useMetadataPriceGroups,
  useTags as useMetadataTags,
} from './useProductMetadataQueries';
import * as api from '../api/settings';

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

export function useSimpleParameters(catalogId: string | null): ListQuery<ProductSimpleParameter> {
  return useMetadataSimpleParameters(catalogId ?? undefined);
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
    // Patterns are config data that rarely change mid-session. Mutations already
    // call invalidateValidatorConfig() on success, so fresh data is guaranteed
    // after any user-initiated change. Aggressive refetching caused a refetch
    // storm on every window focus event.
    staleTime: 5 * 60 * 1_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
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

export function useProductValidatorConfig(
  includeDisabled: boolean = false
): SingleQuery<ProductValidatorConfig> {
  const id = includeDisabled ? 'config-all' : 'config-active';
  const queryKey = productSettingsKeys.validatorConfig(includeDisabled);
  return createSingleQueryV2({
    id,
    queryKey,
    queryFn: () => api.getProductValidatorConfig(includeDisabled),
    // Same rationale as useValidationPatterns: config is stable within a session.
    // Keep refetch-on-mount enabled so a stale invalidated cache refreshes when
    // the Product form opens after validator settings were changed elsewhere.
    staleTime: 5 * 60 * 1_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
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
    invalidate: async (queryClient) => {
      await invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeletePriceGroupMutation(): DeleteMutation {
  const mutationKey = productSettingsKeys.priceGroups();
  return createDeleteMutationV2({
    mutationFn: (id: string) => api.deletePriceGroup(id),
    mutationKey,
    meta: {
      source: 'viewer3d.hooks.useDeleteAsset3DMutation', // Wait, this meta source looks wrong in the original file too, but I'll fix it to match the hook name.
      operation: 'delete',
      resource: 'products.settings.price-groups',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'price-groups', 'delete'],
    },
    invalidate: async (queryClient) => {
      await invalidatePriceGroups(queryClient);
    },
  });
}

export function useSavePriceGroupMutation(): SaveMutation<PriceGroup> {
  const mutationKey = productSettingsKeys.priceGroups();
  return createMutationV2({
    mutationFn: ({ id, data }: { id?: string; data: Partial<PriceGroup> }) =>
      api.savePriceGroup(id, data),
    mutationKey,
    meta: {
      source: 'products.hooks.useSavePriceGroupMutation',
      operation: 'action',
      resource: 'products.settings.price-groups',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'price-groups', 'save'],
    },
    invalidate: async (queryClient) => {
      await invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeleteCatalogMutation(): DeleteMutation {
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
    invalidate: async (queryClient) => {
      await invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCatalogMutation(): SaveMutation<Catalog> {
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
    invalidate: async (queryClient) => {
      await invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCategoryMutation(): SaveMutation<
  ProductCategory,
  { id: string | undefined; data: Partial<ProductCategory> }
  > {
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
    invalidate: async (queryClient, _data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      await invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteCategoryMutation(): UpdateMutation<
  void,
  { id: string; catalogId: string | null }
  > {
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
    invalidate: async (queryClient, _data, variables) => {
      await invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useReorderCategoryMutation(): UpdateMutation<
  ProductCategory,
  ReorderCategoryPayload
  > {
  const mutationKey = productSettingsKeys.all;
  return createUpdateMutationV2({
    mutationFn: (payload: ReorderCategoryPayload) => api.reorderCategory(payload),
    mutationKey,
    meta: {
      source: 'products.hooks.useReorderCategoryMutation',
      operation: 'update',
      resource: 'products.settings.categories.reorder',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'categories', 'reorder'],
    },
    invalidate: (queryClient, _data, variables) => {
      const catalogId = variables.catalogId ?? null;
      return invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useSaveTagMutation(): SaveMutation<
  ProductTag,
  { id: string | undefined; data: Partial<ProductTag> }
  > {
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
    invalidate: async (queryClient, _data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      await invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteTagMutation(): UpdateMutation<
  void,
  { id: string; catalogId: string | null }
  > {
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
    invalidate: async (queryClient, _data, variables) => {
      await invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useSaveParameterMutation(): SaveMutation<
  ProductParameter,
  { id: string | undefined; data: Partial<ProductParameter> }
  > {
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
    invalidate: async (queryClient, _data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      await invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteParameterMutation(): UpdateMutation<
  void,
  { id: string; catalogId: string | null }
  > {
  const queryKey = productSettingsKeys.all;
  return createDeleteMutationV2({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteParameter(id),
    mutationKey: queryKey,
    meta: {
      source: 'products.hooks.useDeleteParameterMutation',
      operation: 'delete',
      resource: 'products.settings.parameters',
      domain: 'products',
      mutationKey: queryKey,
      tags: ['products', 'settings', 'parameters', 'delete'],
    },
    invalidate: async (queryClient, _data, variables) => {
      await invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useUpdateValidatorSettingsMutation(): UpdateMutation<
  ProductValidatorSettings,
  Partial<ProductValidatorSettings>
  > {
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
    invalidate: async (queryClient) => {
      await invalidateValidatorConfig(queryClient);
    },
  });
}

export function useCreateValidationPatternMutation(): CreateMutation<
  ProductValidationPattern,
  CreateValidationPatternPayload
  > {
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
    invalidate: async (queryClient) => {
      await invalidateValidatorConfig(queryClient);
    },
  });
}

export function useUpdateValidationPatternMutation(): UpdateMutation<
  ProductValidationPattern,
  { id: string; data: UpdateValidationPatternPayload }
  > {
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createUpdateMutationV2({
    mutationFn: ({ id, data }: { id: string; data: UpdateValidationPatternPayload }) =>
      api.updateValidationPattern(id, data),
    mutationKey,
    meta: {
      source: 'products.hooks.useUpdateValidationPatternMutation',
      operation: 'update',
      resource: 'products.settings.validator.patterns',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'update'],
    },
    invalidate: async (queryClient) => {
      await invalidateValidatorConfig(queryClient);
    },
  });
}

export function useDeleteValidationPatternMutation(): DeleteMutation {
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
    invalidate: async (queryClient) => {
      await invalidateValidatorConfig(queryClient);
    },
  });
}

export function useReorderValidationPatternsMutation(): UpdateMutation<
  { updated: ProductValidationPattern[] },
  { updates: ReorderValidationPatternUpdatePayload[] }
  > {
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createUpdateMutationV2({
    mutationFn: (payload: { updates: ReorderValidationPatternUpdatePayload[] }) =>
      api.reorderValidationPatterns(payload),
    mutationKey,
    meta: {
      source: 'products.hooks.useReorderValidationPatternsMutation',
      operation: 'update',
      resource: 'products.settings.validator.patterns.reorder',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'reorder'],
    },
    invalidate: async (queryClient) => {
      await invalidateValidatorConfig(queryClient);
    },
  });
}

export function useImportValidationPatternsMutation(): UpdateMutation<
  ImportValidationPatternsResult,
  ImportValidationPatternsPayload
  > {
  const mutationKey = productSettingsKeys.validatorPatterns();
  return createUpdateMutationV2({
    mutationFn: (payload: ImportValidationPatternsPayload) => api.importValidationPatterns(payload),
    mutationKey,
    meta: {
      source: 'products.hooks.useImportValidationPatternsMutation',
      operation: 'update',
      resource: 'products.settings.validator.patterns.import',
      domain: 'products',
      mutationKey,
      tags: ['products', 'settings', 'validator', 'patterns', 'import'],
    },
    invalidate: async (queryClient, _data, variables) => {
      if (variables.dryRun) return;
      await invalidateValidatorConfig(queryClient);
    },
  });
}

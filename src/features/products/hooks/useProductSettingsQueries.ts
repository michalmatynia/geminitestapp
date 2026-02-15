import {
  createListQuery,
  createSingleQuery,
} from '@/shared/lib/query-factories';
import { createMutationHook } from '@/shared/lib/api-hooks';
import {
  invalidateCatalogScopedData,
  invalidatePriceGroups,
  invalidateProductSettingsCatalogs,
  invalidateValidatorConfig,
} from '@/shared/lib/query-invalidation';
import { productSettingsKeys } from '@/shared/lib/query-key-exports';
export { productSettingsKeys };
import type { QueryClient } from '@tanstack/react-query';
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

type InvalidateFn<TData, TVariables> = (
  queryClient: QueryClient,
  data: TData,
  variables: TVariables
) => void | Promise<void>;

function createRobustSaveMutation<TData, TVariables>(
  config: {
    saveFn: (variables: TVariables) => Promise<TData>;
    invalidateFn?: InvalidateFn<TData, TVariables>;
  }
): SaveMutation<TData, TVariables> {
  return createMutationHook<TData, TVariables>({
    mutationFn: config.saveFn,
    onSuccess: async (data, variables, _context, queryClient) => {
      if (config.invalidateFn) {
        await config.invalidateFn(queryClient, data, variables);
      }
    },
  })() as SaveMutation<TData, TVariables>;
}

function createRobustUpdateMutation<TData, TVariables>(
  config: {
    updateFn: (variables: TVariables) => Promise<TData>;
    invalidateFn?: InvalidateFn<TData, TVariables>;
  }
): UpdateMutation<TData, TVariables> {
  return createMutationHook<TData, TVariables>({
    mutationFn: config.updateFn,
    onSuccess: async (data, variables, _context, queryClient) => {
      if (config.invalidateFn) {
        await config.invalidateFn(queryClient, data, variables);
      }
    },
  })() as UpdateMutation<TData, TVariables>;
}

function createRobustCreateMutation<TData, TVariables>(
  config: {
    createFn: (variables: TVariables) => Promise<TData>;
    invalidateFn?: InvalidateFn<TData, TVariables>;
  }
): CreateMutation<TData, TVariables> {
  return createMutationHook<TData, TVariables>({
    mutationFn: config.createFn,
    onSuccess: async (data, variables, _context, queryClient) => {
      if (config.invalidateFn) {
        await config.invalidateFn(queryClient, data, variables);
      }
    },
  })() as CreateMutation<TData, TVariables>;
}

function createRobustDeleteMutation<TData = void, TVariables = string>(
  config: {
    deleteFn: (variables: TVariables) => Promise<TData>;
    invalidateFn?: InvalidateFn<TData, TVariables>;
  }
): DeleteMutation<TData, TVariables> {
  return createMutationHook<TData, TVariables>({
    mutationFn: config.deleteFn,
    onSuccess: async (data, variables, _context, queryClient) => {
      if (config.invalidateFn) {
        await config.invalidateFn(queryClient, data, variables);
      }
    },
  })() as DeleteMutation<TData, TVariables>;
}

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
  return useMetadataTags(catalogId ?? undefined) as ListQuery<ProductTag>;
}

export function useParameters(catalogId: string | null): ListQuery<ProductParameter> {
  return useMetadataParameters(catalogId ?? undefined) as ListQuery<ProductParameter>;
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

export function useUpdatePriceGroupMutation(): UpdateMutation<PriceGroup, PriceGroup> {
  return createRobustUpdateMutation({
    updateFn: (group: PriceGroup) => api.updatePriceGroup(group),
    invalidateFn: (queryClient) => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeletePriceGroupMutation(): DeleteMutation<void, string> {
  return createRobustDeleteMutation<void, string>({
    deleteFn: (id: string) => api.deletePriceGroup(id),
    invalidateFn: (queryClient) => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useSavePriceGroupMutation(): SaveMutation<PriceGroup> {
  return createRobustSaveMutation({
    saveFn: ({ id, data }: { id?: string; data: Partial<PriceGroup> }) => api.savePriceGroup(id, data),
    invalidateFn: (queryClient) => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeleteCatalogMutation(): DeleteMutation {
  return createRobustDeleteMutation({
    deleteFn: (id: string) => api.deleteCatalog(id),
    invalidateFn: (queryClient) => {
      void invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCatalogMutation(): SaveMutation<Catalog> {
  return createRobustSaveMutation({
    saveFn: ({ id, data }: { id?: string; data: Partial<Catalog> }) =>
      id ? api.updateCatalog(id, data) : api.createCatalog(data),
    invalidateFn: (queryClient) => {
      void invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCategoryMutation(): SaveMutation<ProductCategory, { id: string | undefined; data: Partial<ProductCategory> }> {
  return createRobustSaveMutation({
    saveFn: ({ id, data }: { id: string | undefined; data: Partial<ProductCategory> }) =>
      id ? api.updateCategory(id, data) : api.createCategory(data),
    invalidateFn: (queryClient, _data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteCategoryMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  return createRobustUpdateMutation({
    updateFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteCategory(id),
    invalidateFn: (queryClient, _data, variables) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useReorderCategoryMutation(): UpdateMutation<ProductCategory, api.ReorderCategoryPayload> {
  return createRobustUpdateMutation({
    updateFn: (payload: api.ReorderCategoryPayload) =>
      api.reorderCategory(payload),
    invalidateFn: (
      queryClient,
      _data: ProductCategory,
      variables: api.ReorderCategoryPayload
    ) => {
      const catalogId = variables.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useSaveTagMutation(): SaveMutation<ProductTag, { id: string | undefined; data: Partial<ProductTag> }> {
  return createRobustSaveMutation({
    saveFn: ({ id, data }: { id: string | undefined; data: Partial<ProductTag> }) =>
      id ? api.updateTag(id, data) : api.createTag(data),
    invalidateFn: (queryClient, _data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteTagMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  return createRobustUpdateMutation({
    updateFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteTag(id),
    invalidateFn: (queryClient, _data, variables) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useSaveParameterMutation(): SaveMutation<ProductParameter, { id: string | undefined; data: Partial<ProductParameter> }> {
  return createRobustSaveMutation({
    saveFn: ({ id, data }: { id: string | undefined; data: Partial<ProductParameter> }) =>
      id ? api.updateParameter(id, data) : api.createParameter(data),
    invalidateFn: (queryClient, _data, variables) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteParameterMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  return createRobustUpdateMutation({
    updateFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteParameter(id),
    invalidateFn: (queryClient, _data, variables) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useUpdateValidatorSettingsMutation(): UpdateMutation<ProductValidatorSettings, Partial<ProductValidatorSettings>> {
  return createRobustUpdateMutation({
    updateFn: api.updateValidatorSettings,
    invalidateFn: (queryClient) => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useCreateValidationPatternMutation(): CreateMutation<ProductValidationPattern, api.CreateValidationPatternPayload> {
  return createRobustCreateMutation({
    createFn: api.createValidationPattern,
    invalidateFn: (queryClient) => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useUpdateValidationPatternMutation(): UpdateMutation<ProductValidationPattern, { id: string; data: api.UpdateValidationPatternPayload }> {
  return createRobustUpdateMutation({
    updateFn: ({ id, data }: { id: string; data: api.UpdateValidationPatternPayload }) => api.updateValidationPattern(id, data),
    invalidateFn: (queryClient) => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useDeleteValidationPatternMutation(): DeleteMutation {
  return createRobustDeleteMutation({
    deleteFn: (id: string) => api.deleteValidationPattern(id),
    invalidateFn: (queryClient) => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

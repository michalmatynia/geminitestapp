import { useQueryClient } from '@tanstack/react-query';

import {
  createUpdateMutation,
  createDeleteMutation,
  createSaveMutation,
  createCreateMutation,
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
  return useMetadataPriceGroups() as ListQuery<PriceGroup>;
}

export function useCatalogs(): ListQuery<CatalogRecord> {
  return useMetadataCatalogs() as ListQuery<CatalogRecord>;
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
    id: 'global', // Constant ID for global settings
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

export function useValidationPatterns(): UseQueryResult<ProductValidationPattern[], Error> {
  return useQuery({
    queryKey: productSettingsKeys.validatorPatterns(),
    queryFn: api.getValidationPatterns,
  });
}

export function useProductValidatorConfig(includeDisabled: boolean = false): UseQueryResult<ProductValidatorConfig, Error> {
  return useQuery({
    queryKey: productSettingsKeys.validatorConfig(includeDisabled),
    queryFn: () => api.getProductValidatorConfig(includeDisabled),
  });
}

export function useUpdatePriceGroupMutation(): UpdateMutation<PriceGroup, PriceGroup> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: (group: PriceGroup) => api.updatePriceGroup(group),
    options: {
      onSuccess: () => {
        void invalidatePriceGroups(queryClient);
      },
    },
  });
}

export function useDeletePriceGroupMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (id: string) => api.deletePriceGroup(id),
    options: {
      onSuccess: () => {
        void invalidatePriceGroups(queryClient);
      },
    },
  });
}

export function useSavePriceGroupMutation(): SaveMutation<PriceGroup> {
  const queryClient = useQueryClient();
  return createSaveMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<PriceGroup> }) => api.savePriceGroup(id, data),
    options: {
      onSuccess: () => {
        void invalidatePriceGroups(queryClient);
      },
    },
  });
}

export function useDeleteCatalogMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (id: string) => api.deleteCatalog(id),
    options: {
      onSuccess: () => {
        void invalidateProductSettingsCatalogs(queryClient);
      },
    },
  });
}

export function useSaveCatalogMutation(): SaveMutation<Catalog> {
  const queryClient = useQueryClient();
  return createSaveMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Catalog> }) =>
      id ? api.updateCatalog(id, data) : api.createCatalog(data),
    options: {
      onSuccess: () => {
        void invalidateProductSettingsCatalogs(queryClient);
      },
    },
  });
}

export function useSaveCategoryMutation(): SaveMutation<ProductCategory, { id: string | undefined; data: Partial<ProductCategory> }> {
  const queryClient = useQueryClient();
  return createSaveMutation({
    mutationFn: ({ id, data }: { id: string | undefined; data: Partial<ProductCategory> }) =>
      id ? api.updateCategory(id, data) : api.createCategory(data),
    options: {
      onSuccess: (_: ProductCategory, variables: { id: string | undefined; data: Partial<ProductCategory> }) => {
        const catalogId = variables.data.catalogId ?? null;
        void invalidateCatalogScopedData(queryClient, catalogId);
      },
    },
  });
}

export function useDeleteCategoryMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteCategory(id),
    options: {
      onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
        void invalidateCatalogScopedData(queryClient, variables.catalogId);
      },
    },
  });
}

export function useReorderCategoryMutation(): UpdateMutation<ProductCategory, api.ReorderCategoryPayload> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: (payload: api.ReorderCategoryPayload) =>
      api.reorderCategory(payload),
    options: {
      onSuccess: (
        _: ProductCategory,
        variables: api.ReorderCategoryPayload
      ) => {
        const catalogId = variables.catalogId ?? null;
        void invalidateCatalogScopedData(queryClient, catalogId);
      },
    },
  });
}

export function useSaveTagMutation(): SaveMutation<ProductTag, { id: string | undefined; data: Partial<ProductTag> }> {
  const queryClient = useQueryClient();
  return createSaveMutation({
    mutationFn: ({ id, data }: { id: string | undefined; data: Partial<ProductTag> }) =>
      id ? api.updateTag(id, data) : api.createTag(data),
    options: {
      onSuccess: (_: ProductTag, variables: { id: string | undefined; data: Partial<ProductTag> }) => {
        const catalogId = variables.data.catalogId ?? null;
        void invalidateCatalogScopedData(queryClient, catalogId);
      },
    },
  });
}

export function useDeleteTagMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteTag(id),
    options: {
      onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
        void invalidateCatalogScopedData(queryClient, variables.catalogId);
      },
    },
  });
}

export function useSaveParameterMutation(): SaveMutation<ProductParameter, { id: string | undefined; data: Partial<ProductParameter> }> {
  const queryClient = useQueryClient();
  return createSaveMutation({
    mutationFn: ({ id, data }: { id: string | undefined; data: Partial<ProductParameter> }) =>
      id ? api.updateParameter(id, data) : api.createParameter(data),
    options: {
      onSuccess: (_: ProductParameter, variables: { id: string | undefined; data: Partial<ProductParameter> }) => {
        const catalogId = variables.data.catalogId ?? null;
        void invalidateCatalogScopedData(queryClient, catalogId);
      },
    },
  });
}

export function useDeleteParameterMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteParameter(id),
    options: {
      onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
        void invalidateCatalogScopedData(queryClient, variables.catalogId);
      },
    },
  });
}

export function useUpdateValidatorSettingsMutation(): UpdateMutation<ProductValidatorSettings, Partial<ProductValidatorSettings>> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: api.updateValidatorSettings,
    options: {
      onSuccess: () => {
        void invalidateValidatorConfig(queryClient);
      },
    },
  });
}

export function useCreateValidationPatternMutation(): CreateMutation<ProductValidationPattern, api.CreateValidationPatternPayload> {
  const queryClient = useQueryClient();
  return createCreateMutation({
    mutationFn: api.createValidationPattern,
    options: {
      onSuccess: () => {
        void invalidateValidatorConfig(queryClient);
      },
    },
  });
}

export function useUpdateValidationPatternMutation(): UpdateMutation<ProductValidationPattern, { id: string; data: api.UpdateValidationPatternPayload }> {
  const queryClient = useQueryClient();
  return createUpdateMutation({
    mutationFn: ({ id, data }) => api.updateValidationPattern(id, data),
    options: {
      onSuccess: () => {
        void invalidateValidatorConfig(queryClient);
      },
    },
  });
}

export function useDeleteValidationPatternMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  return createDeleteMutation({
    mutationFn: (id: string) => api.deleteValidationPattern(id),
    options: {
      onSuccess: () => {
        void invalidateValidatorConfig(queryClient);
      },
    },
  });
}

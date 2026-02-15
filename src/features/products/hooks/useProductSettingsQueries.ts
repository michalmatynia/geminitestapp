import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  return useQuery({
    queryKey: productSettingsKeys.categoryTree(catalogId),
    queryFn: () => api.getCategories(catalogId),
    enabled: !!catalogId,
  }) as ListQuery<ProductCategoryWithChildren>;
}

export function useTags(catalogId: string | null): ListQuery<ProductTag> {
  return useMetadataTags(catalogId ?? undefined) as ListQuery<ProductTag>;
}

export function useParameters(catalogId: string | null): ListQuery<ProductParameter> {
  return useMetadataParameters(catalogId ?? undefined) as ListQuery<ProductParameter>;
}

export function useValidatorSettings(): SingleQuery<ProductValidatorSettings> {
  return useQuery({
    queryKey: productSettingsKeys.validatorSettings(),
    queryFn: api.getValidatorSettings,
  }) as SingleQuery<ProductValidatorSettings>;
}

export function useValidationPatterns(): ListQuery<ProductValidationPattern> {
  return useQuery({
    queryKey: productSettingsKeys.validatorPatterns(),
    queryFn: api.getValidationPatterns,
  }) as ListQuery<ProductValidationPattern>;
}

export function useProductValidatorConfig(includeDisabled: boolean = false): SingleQuery<ProductValidatorConfig> {
  return useQuery({
    queryKey: productSettingsKeys.validatorConfig(includeDisabled),
    queryFn: () => api.getProductValidatorConfig(includeDisabled),
  }) as SingleQuery<ProductValidatorConfig>;
}

export function useUpdatePriceGroupMutation(): UpdateMutation<PriceGroup, PriceGroup> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (group: PriceGroup) => api.updatePriceGroup(group),
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeletePriceGroupMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePriceGroup(id),
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useSavePriceGroupMutation(): SaveMutation<PriceGroup> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<PriceGroup> }) => api.savePriceGroup(id, data),
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeleteCatalogMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCatalog(id),
    onSuccess: () => {
      void invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCatalogMutation(): SaveMutation<Catalog> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Catalog> }) =>
      id ? api.updateCatalog(id, data) : api.createCatalog(data),
    onSuccess: () => {
      void invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCategoryMutation(): SaveMutation<ProductCategory, { id: string | undefined; data: Partial<ProductCategory> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | undefined; data: Partial<ProductCategory> }) =>
      id ? api.updateCategory(id, data) : api.createCategory(data),
    onSuccess: (_: ProductCategory, variables: { id: string | undefined; data: Partial<ProductCategory> }) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteCategoryMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteCategory(id),
    onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useReorderCategoryMutation(): UpdateMutation<ProductCategory, api.ReorderCategoryPayload> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: api.ReorderCategoryPayload) =>
      api.reorderCategory(payload),
    onSuccess: (
      _: ProductCategory,
      variables: api.ReorderCategoryPayload
    ) => {
      const catalogId = variables.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useSaveTagMutation(): SaveMutation<ProductTag, { id: string | undefined; data: Partial<ProductTag> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | undefined; data: Partial<ProductTag> }) =>
      id ? api.updateTag(id, data) : api.createTag(data),
    onSuccess: (_: ProductTag, variables: { id: string | undefined; data: Partial<ProductTag> }) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteTagMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteTag(id),
    onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useSaveParameterMutation(): SaveMutation<ProductParameter, { id: string | undefined; data: Partial<ProductParameter> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | undefined; data: Partial<ProductParameter> }) =>
      id ? api.updateParameter(id, data) : api.createParameter(data),
    onSuccess: (_: ProductParameter, variables: { id: string | undefined; data: Partial<ProductParameter> }) => {
      const catalogId = variables.data.catalogId ?? null;
      void invalidateCatalogScopedData(queryClient, catalogId);
    },
  });
}

export function useDeleteParameterMutation(): UpdateMutation<void, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteParameter(id),
    onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useUpdateValidatorSettingsMutation(): UpdateMutation<ProductValidatorSettings, Partial<ProductValidatorSettings>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateValidatorSettings,
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useCreateValidationPatternMutation(): CreateMutation<ProductValidationPattern, api.CreateValidationPatternPayload> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createValidationPattern,
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useUpdateValidationPatternMutation(): UpdateMutation<ProductValidationPattern, { id: string; data: api.UpdateValidationPatternPayload }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.updateValidationPattern(id, data),
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useDeleteValidationPatternMutation(): DeleteMutation {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteValidationPattern(id),
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

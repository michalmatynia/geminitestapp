import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import {
  invalidateCatalogScopedData,
  invalidatePriceGroups,
  invalidateProductSettingsCatalogs,
  invalidateValidatorConfig,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type {
  ProductValidationPattern,
  ProductValidatorConfig,
  ProductValidatorSettings,
} from '@/shared/types/domain/products';

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

export const productSettingsKeys = QUERY_KEYS.products.settings;

export function usePriceGroups(): UseQueryResult<PriceGroup[], Error> {
  return useMetadataPriceGroups() as UseQueryResult<PriceGroup[], Error>;
}

export function useCatalogs(): UseQueryResult<CatalogRecord[], Error> {
  return useMetadataCatalogs();
}

export function useCategories(catalogId: string | null): UseQueryResult<ProductCategoryWithChildren[], Error> {
  return useQuery({
    queryKey: productSettingsKeys.categoryTree(catalogId),
    queryFn: () => api.getCategories(catalogId),
    enabled: !!catalogId,
  });
}

export function useTags(catalogId: string | null): UseQueryResult<ProductTag[], Error> {
  return useMetadataTags(catalogId ?? undefined);
}

export function useParameters(catalogId: string | null): UseQueryResult<ProductParameter[], Error> {
  return useMetadataParameters(catalogId ?? undefined);
}

export function useValidatorSettings(): UseQueryResult<ProductValidatorSettings, Error> {
  return useQuery({
    queryKey: productSettingsKeys.validatorSettings(),
    queryFn: api.getValidatorSettings,
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

export function useUpdatePriceGroupMutation(): UseMutationResult<PriceGroup, Error, PriceGroup> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (group: PriceGroup) => api.updatePriceGroup(group),
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeletePriceGroupMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePriceGroup(id),
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useSavePriceGroupMutation(): UseMutationResult<PriceGroup, Error, { id?: string; data: Partial<PriceGroup> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<PriceGroup> }) => api.savePriceGroup(id, data),
    onSuccess: () => {
      void invalidatePriceGroups(queryClient);
    },
  });
}

export function useDeleteCatalogMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCatalog(id),
    onSuccess: () => {
      void invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCatalogMutation(): UseMutationResult<Catalog, Error, { id?: string; data: Partial<Catalog> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Catalog> }) =>
      id ? api.updateCatalog(id, data) : api.createCatalog(data),
    onSuccess: () => {
      void invalidateProductSettingsCatalogs(queryClient);
    },
  });
}

export function useSaveCategoryMutation(): UseMutationResult<ProductCategory, Error, { id: string | undefined; data: Partial<ProductCategory> }> {
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

export function useDeleteCategoryMutation(): UseMutationResult<void, Error, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteCategory(id),
    onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useReorderCategoryMutation(): UseMutationResult<ProductCategory, Error, api.ReorderCategoryPayload> {
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

export function useSaveTagMutation(): UseMutationResult<ProductTag, Error, { id: string | undefined; data: Partial<ProductTag> }> {
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

export function useDeleteTagMutation(): UseMutationResult<void, Error, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteTag(id),
    onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useSaveParameterMutation(): UseMutationResult<ProductParameter, Error, { id: string | undefined; data: Partial<ProductParameter> }> {
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

export function useDeleteParameterMutation(): UseMutationResult<void, Error, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteParameter(id),
    onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
      void invalidateCatalogScopedData(queryClient, variables.catalogId);
    },
  });
}

export function useUpdateValidatorSettingsMutation(): UseMutationResult<ProductValidatorSettings, Error, Partial<ProductValidatorSettings>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateValidatorSettings,
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useCreateValidationPatternMutation(): UseMutationResult<ProductValidationPattern, Error, api.CreateValidationPatternPayload> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createValidationPattern,
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useUpdateValidationPatternMutation(): UseMutationResult<ProductValidationPattern, Error, { id: string; data: api.UpdateValidationPatternPayload }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.updateValidationPattern(id, data),
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

export function useDeleteValidationPatternMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteValidationPattern(id),
    onSuccess: () => {
      void invalidateValidatorConfig(queryClient);
    },
  });
}

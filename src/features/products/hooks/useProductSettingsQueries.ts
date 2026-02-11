import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';

import type { ProductValidationPattern } from '@/shared/types/domain/products';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import * as api from '../api/settings';
import { PriceGroup, Catalog, CatalogRecord, ProductCategory, ProductTag, ProductParameter, ProductCategoryWithChildren } from '../types';

export const productSettingsKeys = QUERY_KEYS.products.settings;

export function usePriceGroups(): UseQueryResult<PriceGroup[], Error> {
  return useQuery({
    queryKey: productSettingsKeys.priceGroups(),
    queryFn: api.getPriceGroups,
  });
}

export function useCatalogs(): UseQueryResult<CatalogRecord[], Error> {
  return useQuery<CatalogRecord[], Error>({
    queryKey: productSettingsKeys.catalogs(),
    queryFn: api.getCatalogs,
  });
}

export function useCategories(catalogId: string | null): UseQueryResult<ProductCategoryWithChildren[], Error> {
  return useQuery({
    queryKey: productSettingsKeys.categories(catalogId),
    queryFn: () => api.getCategories(catalogId),
    enabled: !!catalogId,
  });
}

export function useTags(catalogId: string | null): UseQueryResult<ProductTag[], Error> {
  return useQuery({
    queryKey: productSettingsKeys.tags(catalogId),
    queryFn: () => api.getTags(catalogId),
    enabled: !!catalogId,
  });
}

export function useParameters(catalogId: string | null): UseQueryResult<ProductParameter[], Error> {
  return useQuery({
    queryKey: productSettingsKeys.parameters(catalogId),
    queryFn: () => api.getParameters(catalogId),
    enabled: !!catalogId,
  });
}

export function useValidatorSettings(): UseQueryResult<{ enabledByDefault: boolean }, Error> {
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

export function useProductValidatorConfig(includeDisabled: boolean = false): UseQueryResult<{
  enabledByDefault: boolean;
  patterns: ProductValidationPattern[];
}, Error> {
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
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.priceGroups() });
    },
  });
}

export function useDeletePriceGroupMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePriceGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.priceGroups() });
    },
  });
}

export function useSavePriceGroupMutation(): UseMutationResult<PriceGroup, Error, { id?: string; data: Partial<PriceGroup> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<PriceGroup> }) => api.savePriceGroup(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.priceGroups() });
    },
  });
}

export function useDeleteCatalogMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCatalog(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.catalogs() });
    },
  });
}

export function useSaveCatalogMutation(): UseMutationResult<Catalog, Error, { id?: string; data: Partial<Catalog> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Catalog> }) =>
      id ? api.updateCatalog(id, data) : api.createCatalog(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.catalogs() });
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
      const treeCatalogId = variables.data.catalogId ?? undefined;
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.categories(catalogId) });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.categoryTree(treeCatalogId) });
    },
  });
}

export function useDeleteCategoryMutation(): UseMutationResult<void, Error, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteCategory(id),
    onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.categories(variables.catalogId) });
      void queryClient.invalidateQueries({
        queryKey: productSettingsKeys.categoryTree(variables.catalogId ?? undefined),
      });
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
      const treeCatalogId = variables.catalogId ?? undefined;
      void queryClient.invalidateQueries({
        queryKey: productSettingsKeys.categories(catalogId),
      });
      void queryClient.invalidateQueries({
        queryKey: productSettingsKeys.categoryTree(treeCatalogId),
      });
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
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.tags(catalogId) });
    },
  });
}

export function useDeleteTagMutation(): UseMutationResult<void, Error, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteTag(id),
    onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.tags(variables.catalogId) });
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
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.parameters(catalogId) });
    },
  });
}

export function useDeleteParameterMutation(): UseMutationResult<void, Error, { id: string; catalogId: string | null }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteParameter(id),
    onSuccess: (_: void, variables: { id: string; catalogId: string | null }) => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.parameters(variables.catalogId) });
    },
  });
}

export function useUpdateValidatorSettingsMutation(): UseMutationResult<{ enabledByDefault: boolean }, Error, { enabledByDefault: boolean }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateValidatorSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorSettings() });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorConfig(true) });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorConfig(false) });
    },
  });
}

export function useCreateValidationPatternMutation(): UseMutationResult<ProductValidationPattern, Error, Omit<ProductValidationPattern, 'id' | 'createdAt' | 'updatedAt'>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createValidationPattern,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorPatterns() });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorConfig(true) });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorConfig(false) });
    },
  });
}

export function useUpdateValidationPatternMutation(): UseMutationResult<ProductValidationPattern, Error, { id: string; data: Partial<Omit<ProductValidationPattern, 'id' | 'createdAt' | 'updatedAt'>> }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.updateValidationPattern(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorPatterns() });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorConfig(true) });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorConfig(false) });
    },
  });
}

export function useDeleteValidationPatternMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteValidationPattern(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorPatterns() });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorConfig(true) });
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.validatorConfig(false) });
    },
  });
}

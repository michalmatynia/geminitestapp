import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import * as api from "../api/settings";
import { PriceGroup, Catalog, CatalogRecord, ProductCategory, ProductTag, ProductParameter, ProductCategoryWithChildren } from "../types";

export const productSettingsKeys = {
  all: ["product-settings"] as const,
  priceGroups: () => [...productSettingsKeys.all, "price-groups"] as const,
  catalogs: () => [...productSettingsKeys.all, "catalogs"] as const,
  categories: (catalogId: string | null) => [...productSettingsKeys.all, "categories", catalogId] as const,
  tags: (catalogId: string | null) => [...productSettingsKeys.all, "tags", catalogId] as const,
  parameters: (catalogId: string | null) => [...productSettingsKeys.all, "parameters", catalogId] as const,
};

export function usePriceGroups() {
  return useQuery({
    queryKey: productSettingsKeys.priceGroups(),
    queryFn: api.getPriceGroups,
  });
}

export function useCatalogs() {
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

export function useTags(catalogId: string | null) {
  return useQuery({
    queryKey: productSettingsKeys.tags(catalogId),
    queryFn: () => api.getTags(catalogId),
    enabled: !!catalogId,
  });
}

export function useParameters(catalogId: string | null) {
  return useQuery({
    queryKey: productSettingsKeys.parameters(catalogId),
    queryFn: () => api.getParameters(catalogId),
    enabled: !!catalogId,
  });
}

export function useUpdatePriceGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (group: PriceGroup) => api.updatePriceGroup(group),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.priceGroups() });
    },
  });
}

export function useDeletePriceGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePriceGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.priceGroups() });
    },
  });
}

export function useSavePriceGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: any }) => api.savePriceGroup(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.priceGroups() });
    },
  });
}

export function useDeleteCatalogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCatalog(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.catalogs() });
    },
  });
}

export function useSaveCatalogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Catalog> }) =>
      id ? api.updateCatalog(id, data) : api.createCatalog(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.catalogs() });
    },
  });
}

export function useSaveCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<ProductCategory> }) =>
      id ? api.updateCategory(id, data) : api.createCategory(data),
    onSuccess: (_, variables) => {
      const catalogId = (variables.data as any).catalogId;
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.categories(catalogId) });
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteCategory(id),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.categories(variables.catalogId) });
    },
  });
}

export function useSaveTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<ProductTag> }) =>
      id ? api.updateTag(id, data) : api.createTag(data),
    onSuccess: (_, variables) => {
      const catalogId = (variables.data as any).catalogId;
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.tags(catalogId) });
    },
  });
}

export function useDeleteTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteTag(id),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.tags(variables.catalogId) });
    },
  });
}

export function useSaveParameterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<ProductParameter> }) =>
      id ? api.updateParameter(id, data) : api.createParameter(data),
    onSuccess: (_, variables) => {
      const catalogId = (variables.data as any).catalogId;
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.parameters(catalogId) });
    },
  });
}

export function useDeleteParameterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; catalogId: string | null }) => api.deleteParameter(id),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: productSettingsKeys.parameters(variables.catalogId) });
    },
  });
}

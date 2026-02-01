import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/settings";
import { PriceGroup, Catalog } from "../types";

export const productSettingsKeys = {
  all: ["product-settings"] as const,
  priceGroups: () => [...productSettingsKeys.all, "price-groups"] as const,
  catalogs: () => [...productSettingsKeys.all, "catalogs"] as const,
  categories: (catalogId: string | null) => [...productSettingsKeys.all, "categories", catalogId] as const,
  tags: (catalogId: string | null) => [...productSettingsKeys.all, "tags", catalogId] as const,
};

export function usePriceGroups() {
  return useQuery({
    queryKey: productSettingsKeys.priceGroups(),
    queryFn: api.getPriceGroups,
  });
}

export function useCatalogs() {
  return useQuery({
    queryKey: productSettingsKeys.catalogs(),
    queryFn: api.getCatalogs,
  });
}

export function useCategories(catalogId: string | null) {
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

export function useUpdatePriceGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (group: PriceGroup) => api.updatePriceGroup(group),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productSettingsKeys.priceGroups() });
    },
  });
}

export function useDeletePriceGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePriceGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productSettingsKeys.priceGroups() });
    },
  });
}

export function useDeleteCatalogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCatalog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productSettingsKeys.catalogs() });
    },
  });
}

export function useSaveCatalogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<Catalog> }) =>
      id ? api.updateCatalog(id, data) : api.createCatalog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productSettingsKeys.catalogs() });
    },
  });
}

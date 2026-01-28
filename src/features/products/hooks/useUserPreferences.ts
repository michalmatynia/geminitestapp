"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProductListPreferences } from "@/features/products/types/products-ui";

const DEFAULT_PREFERENCES: ProductListPreferences = {
  nameLocale: "name_en",
  catalogFilter: "all",
  currencyCode: "PLN",
  pageSize: 12,
};

type PreferencesApiResponse = {
  productListNameLocale?: string;
  productListCatalogFilter?: string;
  productListCurrencyCode?: string | null;
  productListPageSize?: number;
};

const userPreferencesQueryKey = ["user-preferences", "product-list"] as const;

async function fetchUserPreferences(): Promise<ProductListPreferences> {
  const res = await fetch("/api/user/preferences");
  if (!res.ok) {
    throw new Error("Failed to load preferences");
  }
  const data = (await res.json()) as PreferencesApiResponse;
  return {
    nameLocale: (data.productListNameLocale || "name_en") as "name_en" | "name_pl" | "name_de",
    catalogFilter: data.productListCatalogFilter || "all",
    currencyCode: data.productListCurrencyCode ?? "PLN",
    pageSize: data.productListPageSize || 12,
  };
}

async function updateUserPreference(key: keyof ProductListPreferences, value: unknown): Promise<void> {
  const apiKey = `productList${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  const res = await fetch("/api/user/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [apiKey]: value }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update preference: ${key}`);
  }
}

function getLocalStorageFallback(): Partial<ProductListPreferences> {
  if (typeof window === "undefined") return {};

  const storedLocale = window.localStorage.getItem("productListNameLocale");
  const storedCatalogFilter = window.localStorage.getItem("productListCatalogFilter");
  const storedCurrencyCode = window.localStorage.getItem("productListCurrencyCode");
  const storedPageSize = window.localStorage.getItem("productListPageSize");

  return {
    ...(storedLocale === "name_en" || storedLocale === "name_pl" || storedLocale === "name_de"
      ? { nameLocale: storedLocale }
      : {}),
    ...(storedCatalogFilter ? { catalogFilter: storedCatalogFilter } : {}),
    ...(storedCurrencyCode ? { currencyCode: storedCurrencyCode } : {}),
    ...(storedPageSize && !Number.isNaN(Number(storedPageSize))
      ? { pageSize: Number(storedPageSize) }
      : {}),
  };
}

function updateLocalStorage(key: keyof ProductListPreferences, value: unknown): void {
  if (typeof window === "undefined") return;

  const storageKey = `productList${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  window.localStorage.setItem(storageKey, String(value));
}

export function useUserPreferences() {
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: userPreferencesQueryKey,
    queryFn: async () => {
      try {
        return await fetchUserPreferences();
      } catch (error) {
        console.error("Failed to load user preferences:", error);
        // Fall back to localStorage if database fails
        const fallback = getLocalStorageFallback();
        return { ...DEFAULT_PREFERENCES, ...fallback };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: ({ key, value }: { key: keyof ProductListPreferences; value: unknown }) =>
      updateUserPreference(key, value),
    onMutate: async ({ key, value }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userPreferencesQueryKey });

      // Snapshot previous value
      const previousPreferences = queryClient.getQueryData<ProductListPreferences>(userPreferencesQueryKey);

      // Optimistically update
      queryClient.setQueryData<ProductListPreferences>(userPreferencesQueryKey, (old) => ({
        ...DEFAULT_PREFERENCES,
        ...old,
        [key]: value,
      }));

      // Also update localStorage as fallback
      updateLocalStorage(key, value);

      return { previousPreferences };
    },
    onError: (error, { key }, context) => {
      console.warn(`Preference update failed for ${key}.`, error);
      // Keep the optimistic update - don't rollback so UI stays responsive
    },
    onSettled: () => {
      // Optionally refetch to ensure consistency
      void queryClient.invalidateQueries({ queryKey: userPreferencesQueryKey });
    },
  });

  const preferences = preferencesQuery.data ?? DEFAULT_PREFERENCES;

  const setNameLocale = useCallback((locale: "name_en" | "name_pl" | "name_de") => {
    updatePreferenceMutation.mutate({ key: "nameLocale", value: locale });
  }, [updatePreferenceMutation]);

  const setCatalogFilter = useCallback((filter: string) => {
    updatePreferenceMutation.mutate({ key: "catalogFilter", value: filter });
  }, [updatePreferenceMutation]);

  const setCurrencyCode = useCallback((code: string | null) => {
    updatePreferenceMutation.mutate({ key: "currencyCode", value: code });
  }, [updatePreferenceMutation]);

  const setPageSize = useCallback((size: number) => {
    updatePreferenceMutation.mutate({ key: "pageSize", value: size });
  }, [updatePreferenceMutation]);

  return {
    preferences,
    loading: preferencesQuery.isLoading,
    error: preferencesQuery.error ? (preferencesQuery.error as Error).message : null,
    setNameLocale,
    setCatalogFilter,
    setCurrencyCode,
    setPageSize,
  };
}

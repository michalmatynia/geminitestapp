import { useEffect, useState, useCallback } from "react";
import type { ProductListPreferences } from "@/features/products/types/products-ui";

const DEFAULT_PREFERENCES: ProductListPreferences = {
  nameLocale: "name_en",
  catalogFilter: "all",
  currencyCode: "PLN",
  pageSize: 12,
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<ProductListPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/user/preferences");
        if (!res.ok) {
          throw new Error("Failed to load preferences");
        }

        const data = (await res.json()) as {
          productListNameLocale?: string;
          productListCatalogFilter?: string;
          productListCurrencyCode?: string | null;
          productListPageSize?: number;
        };
        setPreferences({
          nameLocale: (data.productListNameLocale || "name_en") as "name_en" | "name_pl" | "name_de",
          catalogFilter: data.productListCatalogFilter || "all",
          currencyCode: data.productListCurrencyCode ?? "PLN",
          pageSize: data.productListPageSize || 12,
        });
      } catch (err) {
        console.error("Failed to load user preferences:", err);
        setError(err instanceof Error ? err.message : "Failed to load preferences");

        // Fall back to localStorage if database fails
        const storedLocale = window.localStorage.getItem("productListNameLocale");
        const storedCatalogFilter = window.localStorage.getItem("productListCatalogFilter");
        const storedCurrencyCode = window.localStorage.getItem("productListCurrencyCode");
        const storedPageSize = window.localStorage.getItem("productListPageSize");
        setPreferences(prev => ({
          ...prev,
          ...(storedLocale === "name_en" || storedLocale === "name_pl" || storedLocale === "name_de"
            ? { nameLocale: storedLocale }
            : {}),
          ...(storedCatalogFilter ? { catalogFilter: storedCatalogFilter } : {}),
          ...(storedCurrencyCode ? { currencyCode: storedCurrencyCode } : {}),
          ...(storedPageSize && !Number.isNaN(Number(storedPageSize))
            ? { pageSize: Number(storedPageSize) }
            : {}),
        }));
      } finally {
        setLoading(false);
      }
    };

    void loadPreferences();
  }, []);

  // Update preference in database
  const updatePreference = useCallback(async (key: keyof ProductListPreferences, value: unknown) => {
    const apiKey = `productList${key.charAt(0).toUpperCase()}${key.slice(1)}`;

    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [apiKey]: value }),
      });

      if (!res.ok) {
        let details: unknown = null;
        try {
          details = await res.json();
        } catch {
          // Ignore parse errors for non-JSON responses.
        }
        console.warn(`Preference update failed for ${key}.`, {
          status: res.status,
          details,
        });
      }
    } catch (err) {
      console.warn(`Preference update request failed for ${key}.`, err);
    }

    // Always update local state so UI stays responsive.
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));

    // Keep localStorage as a lightweight fallback for key preferences.
    if (key === "nameLocale") {
      window.localStorage.setItem("productListNameLocale", String(value));
    }
    if (key === "catalogFilter") {
      window.localStorage.setItem("productListCatalogFilter", String(value));
    }
    if (key === "currencyCode") {
      window.localStorage.setItem("productListCurrencyCode", String(value));
    }
    if (key === "pageSize") {
      window.localStorage.setItem("productListPageSize", String(value));
    }
  }, []);

  const setNameLocale = useCallback((locale: "name_en" | "name_pl" | "name_de") => {
    void updatePreference("nameLocale", locale);
  }, [updatePreference]);

  const setCatalogFilter = useCallback((filter: string) => {
    void updatePreference("catalogFilter", filter);
  }, [updatePreference]);

  const setCurrencyCode = useCallback((code: string | null) => {
    void updatePreference("currencyCode", code);
  }, [updatePreference]);

  const setPageSize = useCallback((size: number) => {
    void updatePreference("pageSize", size);
  }, [updatePreference]);

  return {
    preferences,
    loading,
    error,
    setNameLocale,
    setCatalogFilter,
    setCurrencyCode,
    setPageSize,
  };
}

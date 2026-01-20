import { useEffect, useState, useCallback } from "react";

export type ProductListPreferences = {
  nameLocale: "name_en" | "name_pl" | "name_de";
  catalogFilter: string;
  currencyCode: string | null;
  pageSize: number;
};

const DEFAULT_PREFERENCES: ProductListPreferences = {
  nameLocale: "name_en",
  catalogFilter: "all",
  currencyCode: null,
  pageSize: 50,
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

        const data = await res.json();
        setPreferences({
          nameLocale: (data.productListNameLocale || "name_en") as "name_en" | "name_pl" | "name_de",
          catalogFilter: data.productListCatalogFilter || "all",
          currencyCode: data.productListCurrencyCode,
          pageSize: data.productListPageSize || 50,
        });
      } catch (err) {
        console.error("Failed to load user preferences:", err);
        setError(err instanceof Error ? err.message : "Failed to load preferences");

        // Fall back to localStorage if database fails
        const storedLocale = window.localStorage.getItem("productListNameLocale");
        if (storedLocale === "name_en" || storedLocale === "name_pl" || storedLocale === "name_de") {
          setPreferences(prev => ({ ...prev, nameLocale: storedLocale }));
        }
      } finally {
        setLoading(false);
      }
    };

    void loadPreferences();
  }, []);

  // Update preference in database
  const updatePreference = useCallback(async (key: keyof ProductListPreferences, value: unknown) => {
    try {
      const apiKey = `productList${key.charAt(0).toUpperCase()}${key.slice(1)}`;

      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [apiKey]: value }),
      });

      if (!res.ok) {
        throw new Error("Failed to update preference");
      }

      const updated = await res.json();

      // Update local state
      setPreferences(prev => ({
        ...prev,
        [key]: value,
      }));

      // Also update localStorage as backup
      if (key === "nameLocale") {
        window.localStorage.setItem("productListNameLocale", String(value));
      }
    } catch (err) {
      console.error(`Failed to update preference ${key}:`, err);
      // Still update local state even if API fails
      setPreferences(prev => ({
        ...prev,
        [key]: value,
      }));
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

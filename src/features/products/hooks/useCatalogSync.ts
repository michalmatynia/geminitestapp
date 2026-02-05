/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types */
"use client";

import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { logger } from "@/shared/utils/logger";
import type { Catalog } from "@/features/products/types";
import type { PriceGroupWithDetails } from "@/features/products/types";

type LanguageRecord = { id: string; code: string; name: string };
type LanguageOption = {
  value: "name_en" | "name_pl" | "name_de";
  label: string;
};
type CurrencyRecord = { code?: string | null };

const supportedLanguageMap: Record<string, LanguageOption> = {
  EN: { value: "name_en", label: "English" },
  PL: { value: "name_pl", label: "Polish" },
  DE: { value: "name_de", label: "German" },
};

// Query keys for cache management
const catalogSyncQueryKeys = {
  catalogs: ["catalogs"] as const,
  priceGroups: ["price-groups"] as const,
  languages: ["languages"] as const,
  currencies: ["currencies"] as const,
};

// API fetch functions
async function fetchCatalogs(): Promise<Catalog[]> {
  const res = await fetch("/api/catalogs");
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload?.error || "Failed to load catalogs");
  }
  return res.json() as Promise<Catalog[]>;
}

async function fetchPriceGroups(): Promise<PriceGroupWithDetails[]> {
  const res = await fetch("/api/price-groups");
  if (!res.ok) {
    throw new Error("Failed to load price groups");
  }
  return res.json() as Promise<PriceGroupWithDetails[]>;
}

async function fetchLanguages(): Promise<LanguageRecord[]> {
  const res = await fetch("/api/languages");
  if (!res.ok) {
    throw new Error("Failed to load languages");
  }
  return res.json() as Promise<LanguageRecord[]>;
}

async function fetchCurrencies(): Promise<CurrencyRecord[]> {
  const res = await fetch("/api/currencies");
  if (!res.ok) {
    throw new Error("Failed to load currencies");
  }
  return res.json() as Promise<CurrencyRecord[]>;
}

export function useCatalogSync(catalogFilter: string) {
  const catalogFilterInitialized = useRef(false);

  // Parallel queries for all data sources
  const catalogsQuery = useQuery({
    queryKey: catalogSyncQueryKeys.catalogs,
    queryFn: fetchCatalogs,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const priceGroupsQuery = useQuery({
    queryKey: catalogSyncQueryKeys.priceGroups,
    queryFn: fetchPriceGroups,
    staleTime: 1000 * 60 * 5,
  });

  const languagesQuery = useQuery({
    queryKey: catalogSyncQueryKeys.languages,
    queryFn: fetchLanguages,
    staleTime: 1000 * 60 * 5,
  });

  const currenciesQuery = useQuery({
    queryKey: catalogSyncQueryKeys.currencies,
    queryFn: fetchCurrencies,
    staleTime: 1000 * 60 * 5,
  });

  // Log errors
  if (catalogsQuery.error) {
    logger.error("Failed to load catalogs:", catalogsQuery.error);
  }
  if (priceGroupsQuery.error) {
    logger.error("Failed to load price groups:", priceGroupsQuery.error);
  }
  if (languagesQuery.error) {
    logger.error("Failed to load languages:", languagesQuery.error);
  }
  if (currenciesQuery.error) {
    logger.error("Failed to load currencies:", currenciesQuery.error);
  }

  // Extract data with defaults
  const rawCatalogs = useMemo(
    () => catalogsQuery.data ?? [],
    [catalogsQuery.data],
  );
  const priceGroups = useMemo(
    () => priceGroupsQuery.data ?? [],
    [priceGroupsQuery.data],
  );
  const languages = useMemo(
    () => languagesQuery.data ?? [],
    [languagesQuery.data],
  );
  const currencyPriceGroups = priceGroups;

  // Compute allowed currency codes
  const allowedCurrencyCodes = useMemo(() => {
    const data = currenciesQuery.data ?? [];
    return data
      .map((entry) => entry.code?.trim().toUpperCase())
      .filter((code): code is string => Boolean(code));
  }, [currenciesQuery.data]);

  // Memoize catalog transformation to prevent new references
  const catalogs = useMemo(
    () =>
      rawCatalogs.map((catalog) => ({
        ...catalog,
        priceGroupIds: catalog.priceGroupIds ?? [],
        defaultPriceGroupId: catalog.defaultPriceGroupId ?? null,
      })),
    [rawCatalogs],
  );

  // Memoize currency options to prevent unnecessary re-renders
  const { codes, fallbackCode } = useMemo(() => {
    if (currencyPriceGroups.length === 0)
      return { codes: [] as string[], fallbackCode: "" };

    const isCatalogScoped =
      catalogFilter !== "all" && catalogFilter !== "unassigned";
    const catalog = isCatalogScoped
      ? catalogs.find((entry) => entry.id === catalogFilter)
      : undefined;
    const catalogPriceGroupIds = catalog?.priceGroupIds ?? [];
    const allowedGroupIds =
      catalogPriceGroupIds.length > 0 ? new Set(catalogPriceGroupIds) : null;

    const candidateGroups = allowedGroupIds
      ? currencyPriceGroups.filter((group) => allowedGroupIds.has(group.id))
      : currencyPriceGroups;

    let codes = Array.from(
      new Set(
        candidateGroups
          .map((group) => group.currency?.code)
          .filter((code): code is NonNullable<typeof code> => Boolean(code)),
      ),
    ).map((code) => code.trim().toUpperCase());

    const allowedSet = new Set(
      allowedCurrencyCodes.map((code) => code.trim().toUpperCase()),
    );
    if (allowedSet.size > 0) {
      codes = codes.filter((code) => allowedSet.has(code));
    } else {
      // Basic safety filter if no allowed list available.
      codes = codes.filter((code) => /^[A-Z]{3,5}$/.test(code));
    }

    const defaultGroupId = catalog?.defaultPriceGroupId ?? null;
    const defaultGroup = defaultGroupId
      ? candidateGroups.find((group) => group.id === defaultGroupId)
      : candidateGroups.find((group) => group.isDefault);

    const fallbackCode = defaultGroup?.currency?.code || codes[0] || "";

    return { codes, fallbackCode };
  }, [catalogFilter, catalogs, currencyPriceGroups, allowedCurrencyCodes]);

  // Sync Currency Options based on Catalog
  const currencyOptions = codes;

  // Derived state for currencyCode to avoid set-state-in-effect
  // If the current user selection is valid for the current catalog, keep it.
  // Otherwise, fallback to the catalog's default.
  // We use a piece of state to track the user's *explicit* selection if any.
  // Note: We use 'currencyCode' state here to track the *effective* code if possible,
  // but to match the "derived" pattern we need to know if the state value is "stale".
  // Actually, the simplest way is to just let the user set a preference, and validate it on read.
  const [userCurrencyCode, setUserCurrencyCode] = useState<string | null>(null);

  const currencyCode =
    userCurrencyCode && codes.includes(userCurrencyCode)
      ? userCurrencyCode
      : fallbackCode;

  const setCurrencyCode = (action: string | ((prev: string) => string)) => {
    // Wrap the setter to handle functional updates correctly with the derived value
    if (typeof action === "function") {
      setUserCurrencyCode((_prev) => {
        // We use the *derived* currencyCode as the base for the update
        const newVal = action(currencyCode);
        return newVal;
      });
    } else {
      setUserCurrencyCode(action);
    }
  };

  const { languageOptions, fallbackNameLocale } = useMemo(() => {
    const options: LanguageOption[] = [];
    const isCatalogScoped =
      catalogFilter !== "all" && catalogFilter !== "unassigned";
    const catalog = isCatalogScoped
      ? catalogs.find((entry) => entry.id === catalogFilter)
      : undefined;
    const allowedIds = catalog?.languageIds ?? [];

    const scopedLanguages =
      allowedIds.length > 0
        ? languages.filter((lang) => allowedIds.includes(lang.id))
        : languages;

    const seen = new Set<string>();
    scopedLanguages.forEach((lang) => {
      const key = lang.code?.trim().toUpperCase();
      const option = supportedLanguageMap[key];
      if (!option || seen.has(option.value)) return;
      seen.add(option.value);
      options.push(option);
    });

    if (options.length === 0) {
      options.push(supportedLanguageMap.EN!);
      options.push(supportedLanguageMap.PL!);
      options.push(supportedLanguageMap.DE!);
    }

    const defaultLanguageId = catalog?.defaultLanguageId ?? null;
    const defaultLang = defaultLanguageId
      ? languages.find((lang) => lang.id === defaultLanguageId)
      : null;
    const defaultOption = defaultLang
      ? supportedLanguageMap[defaultLang.code?.trim().toUpperCase() || ""]
      : undefined;
    const fallbackNameLocale = defaultOption?.value ?? options[0]?.value;

    return { languageOptions: options, fallbackNameLocale };
  }, [catalogFilter, catalogs, languages]);

  return {
    catalogs,
    catalogsLoading: catalogsQuery.isLoading,
    catalogsError: catalogsQuery.error ? catalogsQuery.error.message : null,
    currencyCode,
    setCurrencyCode,
    currencyOptions,
    priceGroups,
    catalogFilterInitialized,
    languageOptions,
    fallbackNameLocale,
  };
}

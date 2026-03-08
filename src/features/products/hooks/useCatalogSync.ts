'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { Catalog, PriceGroupWithDetails } from '@/shared/contracts/products';
import type { LanguageRecord, CurrencyRecord } from '@/shared/contracts/internationalization';
import { api } from '@/shared/lib/api-client';
import { createMultiQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { UseProductsOptions } from './useProductsQuery';

type LanguageOption = {
  value: 'name_en' | 'name_pl' | 'name_de';
  label: string;
};

const supportedLanguageMap: Record<string, LanguageOption> = {
  EN: { value: 'name_en', label: 'English' },
  PL: { value: 'name_pl', label: 'Polish' },
  DE: { value: 'name_de', label: 'German' },
};

const PRICE_GROUPS_ENDPOINT = '/api/v2/products/metadata/price-groups';
const LANGUAGES_ENDPOINT = '/api/v2/metadata/languages';
const CURRENCIES_ENDPOINT = '/api/v2/metadata/currencies';
const CATALOGS_ENDPOINT = '/api/v2/products/entities/catalogs';

// API fetch functions
async function fetchCatalogs(signal?: AbortSignal): Promise<Catalog[]> {
  return api.get<Catalog[]>(CATALOGS_ENDPOINT, { signal });
}

async function fetchPriceGroups(signal?: AbortSignal): Promise<PriceGroupWithDetails[]> {
  return api.get<PriceGroupWithDetails[]>(PRICE_GROUPS_ENDPOINT, { signal });
}

async function fetchLanguages(signal?: AbortSignal): Promise<LanguageRecord[]> {
  return api.get<LanguageRecord[]>(LANGUAGES_ENDPOINT, { signal });
}

async function fetchCurrencies(signal?: AbortSignal): Promise<CurrencyRecord[]> {
  return api.get<CurrencyRecord[]>(CURRENCIES_ENDPOINT, { signal });
}

export interface UseCatalogSyncResult {
  catalogs: Catalog[];
  catalogsLoading: boolean;
  catalogsError: string | null;
  currencyCode: string;
  setCurrencyCode: (action: string | ((prev: string) => string)) => void;
  currencyOptions: string[];
  priceGroups: PriceGroupWithDetails[];
  catalogFilterInitialized: React.MutableRefObject<boolean>;
  languageOptions: LanguageOption[];
  fallbackNameLocale: 'name_en' | 'name_pl' | 'name_de' | undefined;
}

export type UseCatalogSyncOptions = UseProductsOptions;

export function useCatalogSync(
  catalogFilter: string,
  { enabled = true }: UseCatalogSyncOptions = {}
): UseCatalogSyncResult {
  const catalogFilterInitialized = useRef(false);
  const [runtimeReady, setRuntimeReady] = useState(process.env['NODE_ENV'] === 'production');

  useEffect(() => {
    if (runtimeReady) return;
    // In React Strict Mode (dev), the first mount is intentionally discarded.
    // Deferring query enablement avoids start->abort noise for metadata calls.
    const timer = setTimeout(() => {
      setRuntimeReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [runtimeReady]);

  const queriesEnabled = enabled && runtimeReady;

  // Parallel queries for all data sources
  const results = createMultiQueryV2({
    queries: [
      {
        queryKey: normalizeQueryKey(QUERY_KEYS.products.metadata.catalogs()),
        queryFn: ({ signal }: { signal?: AbortSignal }): Promise<Catalog[]> =>
          fetchCatalogs(signal),
        enabled: queriesEnabled,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        meta: {
          source: 'products.hooks.useCatalogSync.fetchCatalogs',
          operation: 'list',
          resource: 'products.metadata.catalogs',
          description: 'Loads products metadata catalogs.',
          domain: 'products',
          tags: ['products', 'metadata', 'catalogs', 'sync'],
        },
      },
      {
        queryKey: normalizeQueryKey(QUERY_KEYS.products.metadata.priceGroups()),
        queryFn: ({ signal }: { signal?: AbortSignal }): Promise<PriceGroupWithDetails[]> =>
          fetchPriceGroups(signal),
        enabled: queriesEnabled,
        staleTime: 1000 * 60 * 5,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        meta: {
          source: 'products.hooks.useCatalogSync.fetchPriceGroups',
          operation: 'list',
          resource: 'products.metadata.price-groups',
          description: 'Loads products metadata price groups.',
          domain: 'products',
          tags: ['products', 'metadata', 'price-groups', 'sync'],
        },
      },
      {
        queryKey: normalizeQueryKey(QUERY_KEYS.products.metadata.languages()),
        queryFn: ({ signal }: { signal?: AbortSignal }): Promise<LanguageRecord[]> =>
          fetchLanguages(signal),
        enabled: queriesEnabled,
        staleTime: 1000 * 60 * 5,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        meta: {
          source: 'products.hooks.useCatalogSync.fetchLanguages',
          operation: 'list',
          resource: 'products.metadata.languages',
          description: 'Loads products metadata languages.',
          domain: 'products',
          tags: ['products', 'metadata', 'languages', 'sync'],
        },
      },
      {
        queryKey: normalizeQueryKey(QUERY_KEYS.internationalization.currencies()),
        queryFn: ({ signal }: { signal?: AbortSignal }): Promise<CurrencyRecord[]> =>
          fetchCurrencies(signal),
        enabled: queriesEnabled,
        staleTime: 1000 * 60 * 5,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        meta: {
          source: 'products.hooks.useCatalogSync.fetchCurrencies',
          operation: 'list',
          resource: 'internationalization.currencies',
          description: 'Loads internationalization currencies.',
          domain: 'global',
          tags: ['internationalization', 'currencies', 'sync'],
        },
      },
    ] as const,
  });

  const catalogsQuery = results[0];
  const priceGroupsQuery = results[1];
  const languagesQuery = results[2];
  const currenciesQuery = results[3];

  // Log errors
  useEffect(() => {
    if (catalogsQuery.error) {
      logClientError(catalogsQuery.error as Error, {
        context: { source: 'useCatalogSync', action: 'fetchCatalogs' },
      });
    }
    if (priceGroupsQuery.error) {
      logClientError(priceGroupsQuery.error as Error, {
        context: { source: 'useCatalogSync', action: 'fetchPriceGroups' },
      });
    }
    if (languagesQuery.error) {
      logClientError(languagesQuery.error as Error, {
        context: { source: 'useCatalogSync', action: 'fetchLanguages' },
      });
    }
    if (currenciesQuery.error) {
      logClientError(currenciesQuery.error as Error, {
        context: { source: 'useCatalogSync', action: 'fetchCurrencies' },
      });
    }
  }, [catalogsQuery.error, priceGroupsQuery.error, languagesQuery.error, currenciesQuery.error]);

  // Extract data with defaults
  const rawCatalogs = useMemo(() => (catalogsQuery.data as Catalog[]) ?? [], [catalogsQuery.data]);
  const priceGroups = useMemo(
    () => (priceGroupsQuery.data as PriceGroupWithDetails[]) ?? [],
    [priceGroupsQuery.data]
  );
  const languages = useMemo(
    () => (languagesQuery.data as LanguageRecord[]) ?? [],
    [languagesQuery.data]
  );

  // Compute allowed currency codes
  const allowedCurrencyCodes = useMemo(() => {
    const data = (currenciesQuery.data as CurrencyRecord[]) ?? [];
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
    [rawCatalogs]
  );

  // Memoize currency options to prevent unnecessary re-renders
  const { codes, fallbackCode } = useMemo((): { codes: string[]; fallbackCode: string } => {
    if (priceGroups.length === 0) return { codes: [] as string[], fallbackCode: '' };

    const isCatalogScoped = catalogFilter !== 'all' && catalogFilter !== 'unassigned';
    const catalog = isCatalogScoped
      ? catalogs.find((entry) => entry.id === catalogFilter)
      : undefined;
    const catalogPriceGroupIds = catalog?.priceGroupIds ?? [];
    const allowedGroupIds = catalogPriceGroupIds.length > 0 ? new Set(catalogPriceGroupIds) : null;

    const candidateGroups = allowedGroupIds
      ? priceGroups.filter((group) => allowedGroupIds.has(group.id))
      : priceGroups;

    let codes = Array.from(
      new Set(
        candidateGroups
          .map((group) => group.currency?.code)
          .filter((code): code is NonNullable<typeof code> => Boolean(code))
      )
    ).map((code) => code.trim().toUpperCase());

    const allowedSet = new Set(allowedCurrencyCodes.map((code) => code.trim().toUpperCase()));
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

    const fallbackCode = defaultGroup?.currency?.code || codes[0] || '';

    return { codes, fallbackCode };
  }, [catalogFilter, catalogs, priceGroups, allowedCurrencyCodes]);

  // Sync Currency Options based on Catalog
  const currencyOptions = codes;

  const [userCurrencyCode, setUserCurrencyCode] = useState<string | null>(null);

  const currencyCode =
    userCurrencyCode && codes.includes(userCurrencyCode) ? userCurrencyCode : fallbackCode;

  const handleSetCurrencyCode = useCallback(
    (action: string | ((prev: string) => string)): void => {
      setUserCurrencyCode((current) => {
        const baseValue = current ?? fallbackCode;
        return typeof action === 'function' ? action(baseValue) : action;
      });
    },
    [fallbackCode]
  );

  const { languageOptions, fallbackNameLocale } = useMemo((): {
    languageOptions: LanguageOption[];
    fallbackNameLocale: 'name_en' | 'name_pl' | 'name_de' | undefined;
  } => {
    const options: LanguageOption[] = [];
    const isCatalogScoped = catalogFilter !== 'all' && catalogFilter !== 'unassigned';
    const catalog = isCatalogScoped
      ? catalogs.find((entry) => entry.id === catalogFilter)
      : undefined;
    const allowedIds = catalog?.languageIds ?? [];
    const normalizedAllowed = new Set(
      allowedIds.map((value) => String(value).trim().toUpperCase()).filter(Boolean)
    );

    const scopedLanguages =
      allowedIds.length > 0
        ? languages.filter((lang) => {
          const idKey = String(lang.id).trim().toUpperCase();
          const codeKey = String(lang.code).trim().toUpperCase();
          return normalizedAllowed.has(idKey) || normalizedAllowed.has(codeKey);
        })
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
      if (normalizedAllowed.size > 0) {
        normalizedAllowed.forEach((code) => {
          const option = supportedLanguageMap[code];
          if (!option || seen.has(option.value)) return;
          seen.add(option.value);
          options.push(option);
        });
      }
      if (options.length === 0) {
        options.push(supportedLanguageMap['EN']!);
        options.push(supportedLanguageMap['PL']!);
        options.push(supportedLanguageMap['DE']!);
      }
    }

    const defaultLanguageId = catalog?.defaultLanguageId ?? null;
    const defaultLang = defaultLanguageId
      ? languages.find((lang) => {
        const value = String(defaultLanguageId).trim().toUpperCase();
        const idKey = String(lang.id).trim().toUpperCase();
        const codeKey = String(lang.code).trim().toUpperCase();
        return value === idKey || value === codeKey;
      })
      : null;
    const defaultOption = defaultLang
      ? supportedLanguageMap[defaultLang.code?.trim().toUpperCase() || '']
      : undefined;
    const fallbackNameLocale = defaultOption?.value ?? options[0]?.value;

    return { languageOptions: options, fallbackNameLocale };
  }, [catalogFilter, catalogs, languages]);

  return {
    catalogs,
    catalogsLoading: catalogsQuery.isLoading,
    catalogsError: catalogsQuery.error ? (catalogsQuery.error as Error).message : null,
    currencyCode,
    setCurrencyCode: handleSetCurrencyCode,
    currencyOptions,
    priceGroups,
    catalogFilterInitialized,
    languageOptions,
    fallbackNameLocale,
  };
}

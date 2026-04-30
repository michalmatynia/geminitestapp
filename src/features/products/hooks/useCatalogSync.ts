'use client';
'use no memo';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { PriceGroupWithDetails } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import { createMultiQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildLanguageOptions,
  findCatalogForFilter,
  getCatalogsErrorMessage,
  getSupportedLanguageKeys,
  normalizeCatalogRecord,
  resolveCatalogPriceGroups,
  resolveCurrencyCodes,
  resolveFallbackCurrencyCode,
  resolveSupportedLanguageOption,
  type LanguageOption,
} from './useCatalogSync.helpers';
import type { UseProductsOptions } from './useProductsQuery';

// This hook composes deferred runtime state with multi-query metadata loading.
// Opt out of React Compiler memoization to keep the admin products page on a
// stable dev hook path.

const PRICE_GROUPS_ENDPOINT = '/api/v2/products/metadata/price-groups';
const CATALOGS_ENDPOINT = '/api/v2/products/entities/catalogs';

// API fetch functions
async function fetchCatalogs(signal?: AbortSignal): Promise<Catalog[]> {
  return api.get<Catalog[]>(CATALOGS_ENDPOINT, { signal });
}

async function fetchPriceGroups(signal?: AbortSignal): Promise<PriceGroupWithDetails[]> {
  return api.get<PriceGroupWithDetails[]>(PRICE_GROUPS_ENDPOINT, { signal });
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

type CatalogSyncQueryResult = {
  data: unknown;
  error: unknown;
  isLoading: boolean;
};

type CatalogSyncQueries = readonly [CatalogSyncQueryResult, CatalogSyncQueryResult];

const useRuntimeReady = (): boolean => {
  const [runtimeReady, setRuntimeReady] = useState(process.env['NODE_ENV'] === 'production');

  useEffect(() => {
    if (runtimeReady) return undefined;
    const timer = setTimeout(() => {
      setRuntimeReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [runtimeReady]);

  return runtimeReady;
};

const useCatalogSyncQueries = (queriesEnabled: boolean): CatalogSyncQueries =>
  createMultiQueryV2({
    queries: [
      {
        queryKey: normalizeQueryKey(QUERY_KEYS.products.metadata.catalogs()),
        queryFn: ({ signal }: { signal?: AbortSignal }): Promise<Catalog[]> =>
          fetchCatalogs(signal),
        enabled: queriesEnabled,
        staleTime: 1000 * 60 * 5,
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
    ] as const,
  });

const useCatalogSyncErrors = (
  catalogsError: unknown,
  priceGroupsError: unknown
): void => {
  useEffect(() => {
    if (catalogsError !== null && catalogsError !== undefined) {
      logClientError(catalogsError, {
        context: { source: 'useCatalogSync', action: 'fetchCatalogs' },
      });
    }
    if (priceGroupsError !== null && priceGroupsError !== undefined) {
      logClientError(priceGroupsError, {
        context: { source: 'useCatalogSync', action: 'fetchPriceGroups' },
      });
    }
  }, [catalogsError, priceGroupsError]);
};

const useCatalogSyncData = (
  catalogsQuery: CatalogSyncQueryResult,
  priceGroupsQuery: CatalogSyncQueryResult
): { catalogs: Catalog[]; priceGroups: PriceGroupWithDetails[] } => {
  const catalogs = useMemo(
    () =>
      Array.isArray(catalogsQuery.data)
        ? (catalogsQuery.data as Catalog[]).map(normalizeCatalogRecord)
        : [],
    [catalogsQuery.data]
  );
  const priceGroups = useMemo(
    () =>
      Array.isArray(priceGroupsQuery.data)
        ? (priceGroupsQuery.data as PriceGroupWithDetails[])
        : [],
    [priceGroupsQuery.data]
  );
  return { catalogs, priceGroups };
};

const useCurrencySync = ({
  catalogFilter,
  catalogs,
  priceGroups,
}: {
  catalogFilter: string;
  catalogs: Catalog[];
  priceGroups: PriceGroupWithDetails[];
}): {
  currencyCode: string;
  setCurrencyCode: (action: string | ((prev: string) => string)) => void;
  currencyOptions: string[];
} => {
  const { codes, fallbackCode } = useMemo(() => {
    const candidateGroups = resolveCatalogPriceGroups({ catalogFilter, catalogs, priceGroups });
    const resolvedCodes = resolveCurrencyCodes(candidateGroups);
    return {
      codes: resolvedCodes,
      fallbackCode: resolveFallbackCurrencyCode({
        catalogFilter,
        catalogs,
        candidateGroups,
        codes: resolvedCodes,
      }),
    };
  }, [catalogFilter, catalogs, priceGroups]);
  const [userCurrencyCode, setUserCurrencyCode] = useState<string | null>(null);
  const currencyCode =
    userCurrencyCode !== null && codes.includes(userCurrencyCode) ? userCurrencyCode : fallbackCode;
  const setCurrencyCode = useCallback(
    (action: string | ((prev: string) => string)): void => {
      setUserCurrencyCode((current) => {
        const baseValue = current ?? fallbackCode;
        return typeof action === 'function' ? action(baseValue) : action;
      });
    },
    [fallbackCode]
  );
  return { currencyCode, setCurrencyCode, currencyOptions: codes };
};

const useCatalogLanguageOptions = ({
  catalogFilter,
  catalogs,
}: {
  catalogFilter: string;
  catalogs: Catalog[];
}): Pick<UseCatalogSyncResult, 'languageOptions' | 'fallbackNameLocale'> =>
  useMemo(() => {
    const catalog = findCatalogForFilter(catalogFilter, catalogs);
    const options = buildLanguageOptions(catalog?.languageIds ?? getSupportedLanguageKeys());
    const defaultOption = resolveSupportedLanguageOption(catalog?.defaultLanguageId ?? null);
    return {
      languageOptions: options,
      fallbackNameLocale: defaultOption?.value ?? options[0]?.value,
    };
  }, [catalogFilter, catalogs]);

export function useCatalogSync(
  catalogFilter: string,
  { enabled = true }: UseCatalogSyncOptions = {}
): UseCatalogSyncResult {
  const runtimeReady = useRuntimeReady();
  const catalogFilterInitialized = useRef(false);
  const queriesEnabled = enabled && runtimeReady;
  const results = useCatalogSyncQueries(queriesEnabled);
  const catalogsQuery = results[0];
  const priceGroupsQuery = results[1];
  useCatalogSyncErrors(catalogsQuery.error, priceGroupsQuery.error);
  const { catalogs, priceGroups } = useCatalogSyncData(catalogsQuery, priceGroupsQuery);
  const { currencyCode, setCurrencyCode, currencyOptions } = useCurrencySync({
    catalogFilter,
    catalogs,
    priceGroups,
  });
  const { languageOptions, fallbackNameLocale } = useCatalogLanguageOptions({
    catalogFilter,
    catalogs,
  });

  return { catalogs, catalogsLoading: catalogsQuery.isLoading,
    catalogsError: getCatalogsErrorMessage(catalogsQuery.error), currencyCode, setCurrencyCode,
    currencyOptions, priceGroups, catalogFilterInitialized, languageOptions, fallbackNameLocale };
}

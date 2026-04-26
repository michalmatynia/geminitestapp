import { useMemo } from 'react';

import type { CategoryMapperFetchWarning } from '@/features/integrations/context/CategoryMapperContext.helpers';
import type { ExternalCategory } from '@/shared/contracts/integrations/listings';
import type { MarketplaceFetchResponse } from '@/shared/contracts/integrations/marketplace';

export type CategoryMapperCategoryStats = {
  rootCount: number;
  withParentCount: number;
  maxDepth: number;
};

export type CategoryMapperFetchDiagnostics = {
  activeCategoryCount: number;
  activeFetchSource: string | null;
  activeFetchStats: CategoryMapperCategoryStats | null;
  derivedCategoryStats: CategoryMapperCategoryStats;
  hasLoadedExternalCategories: boolean;
  preservedCategoryCount: number;
  preservedMaxDepth: number;
  shallowTraderaFallbackGuidance: string | null;
  usedTraderaPublicFallback: boolean;
};

const normalizeText = (value: string | null | undefined): string | null => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
};

const hasRealParentExternalId = (value: string | null | undefined): boolean => {
  const parentExternalId = normalizeText(value);
  return (
    parentExternalId !== null &&
    parentExternalId !== '0' &&
    parentExternalId.toLowerCase() !== 'null'
  );
};

const getPersistedFetchSource = (externalCategories: ExternalCategory[]): string | null => {
  for (const category of externalCategories) {
    const source =
      typeof category.metadata?.['categoryFetchSource'] === 'string'
        ? normalizeText(category.metadata['categoryFetchSource'])
        : null;
    if (source !== null) return source;
  }
  return null;
};

const buildDerivedCategoryStats = (
  externalCategories: ExternalCategory[]
): CategoryMapperCategoryStats => {
  let rootCount = 0;
  let withParentCount = 0;
  let maxDepth = 0;

  for (const category of externalCategories) {
    if (hasRealParentExternalId(category.parentExternalId)) {
      withParentCount += 1;
    } else {
      rootCount += 1;
    }
    maxDepth = Math.max(maxDepth, category.depth);
  }

  return { rootCount, withParentCount, maxDepth };
};

const toCategoryStats = (
  stats: MarketplaceFetchResponse['categoryStats'] | null | undefined
): CategoryMapperCategoryStats | null =>
  stats === null || stats === undefined
    ? null
    : {
        rootCount: stats.rootCount,
        withParentCount: stats.withParentCount,
        maxDepth: stats.maxDepth,
      };

const getActiveFetchStats = ({
  derivedCategoryStats,
  lastFetchResult,
  persistedFetchSource,
}: {
  derivedCategoryStats: CategoryMapperCategoryStats;
  lastFetchResult: MarketplaceFetchResponse | null;
  persistedFetchSource: string | null;
}): CategoryMapperCategoryStats | null => {
  if (persistedFetchSource !== null) return derivedCategoryStats;
  return toCategoryStats(lastFetchResult?.categoryStats);
};

const getActiveCategoryCount = ({
  externalCategoryCount,
  lastFetchResult,
  persistedFetchSource,
}: {
  externalCategoryCount: number;
  lastFetchResult: MarketplaceFetchResponse | null;
  persistedFetchSource: string | null;
}): number => {
  if (persistedFetchSource !== null) return externalCategoryCount;
  return lastFetchResult?.total ?? lastFetchResult?.fetched ?? 0;
};

const getShallowTraderaFallbackGuidance = (isShallowFallback: boolean): string | null =>
  isShallowFallback
    ? 'These stored Tradera categories came from the retired public taxonomy-page fallback and only reached shallow levels. Refetch categories to replace them with the listing form picker tree.'
    : null;

const getPreservedCategoryCount = (
  externalCategoryCount: number,
  lastFetchWarning: CategoryMapperFetchWarning | null
): number => {
  if (externalCategoryCount > 0) return externalCategoryCount;
  return lastFetchWarning?.existingTotal ?? 0;
};

const getPreservedMaxDepth = ({
  derivedCategoryStats,
  externalCategoryCount,
  lastFetchWarning,
}: {
  derivedCategoryStats: CategoryMapperCategoryStats;
  externalCategoryCount: number;
  lastFetchWarning: CategoryMapperFetchWarning | null;
}): number => {
  if (externalCategoryCount > 0) return derivedCategoryStats.maxDepth;
  return lastFetchWarning?.existingMaxDepth ?? 0;
};

const isTraderaPublicFallback = (
  activeFetchSource: string | null,
  isTraderaConnection: boolean
): boolean => isTraderaConnection && activeFetchSource === 'Tradera public taxonomy pages';

const isShallowTraderaFallback = (
  activeFetchStats: CategoryMapperCategoryStats | null,
  usedTraderaPublicFallback: boolean
): boolean => usedTraderaPublicFallback && (activeFetchStats?.maxDepth ?? 0) <= 1;

const buildFetchDiagnostics = ({
  derivedCategoryStats,
  externalCategoryCount,
  isTraderaConnection,
  lastFetchResult,
  lastFetchWarning,
  persistedFetchSource,
}: {
  derivedCategoryStats: CategoryMapperCategoryStats;
  externalCategoryCount: number;
  isTraderaConnection: boolean;
  lastFetchResult: MarketplaceFetchResponse | null;
  lastFetchWarning: CategoryMapperFetchWarning | null;
  persistedFetchSource: string | null;
}): CategoryMapperFetchDiagnostics => {
  const activeFetchSource = persistedFetchSource ?? normalizeText(lastFetchResult?.source);
  const activeFetchStats = getActiveFetchStats({
    derivedCategoryStats,
    lastFetchResult,
    persistedFetchSource,
  });
  const usedTraderaPublicFallback = isTraderaPublicFallback(
    activeFetchSource,
    isTraderaConnection
  );
  const isShallowFallback = isShallowTraderaFallback(
    activeFetchStats,
    usedTraderaPublicFallback
  );

  return {
    activeCategoryCount: getActiveCategoryCount({
      externalCategoryCount,
      lastFetchResult,
      persistedFetchSource,
    }),
    activeFetchSource,
    activeFetchStats,
    derivedCategoryStats,
    hasLoadedExternalCategories: externalCategoryCount > 0,
    preservedCategoryCount: getPreservedCategoryCount(externalCategoryCount, lastFetchWarning),
    preservedMaxDepth: getPreservedMaxDepth({
      derivedCategoryStats,
      externalCategoryCount,
      lastFetchWarning,
    }),
    shallowTraderaFallbackGuidance: getShallowTraderaFallbackGuidance(isShallowFallback),
    usedTraderaPublicFallback,
  };
};

export function useCategoryMapperFetchDiagnostics({
  externalCategories,
  isTraderaConnection,
  lastFetchResult,
  lastFetchWarning,
}: {
  externalCategories: ExternalCategory[];
  isTraderaConnection: boolean;
  lastFetchResult: MarketplaceFetchResponse | null;
  lastFetchWarning: CategoryMapperFetchWarning | null;
}): CategoryMapperFetchDiagnostics {
  const persistedFetchSource = useMemo(
    () => getPersistedFetchSource(externalCategories),
    [externalCategories]
  );
  const derivedCategoryStats = useMemo(
    () => buildDerivedCategoryStats(externalCategories),
    [externalCategories]
  );

  return useMemo(
    () =>
      buildFetchDiagnostics({
        derivedCategoryStats,
        externalCategoryCount: externalCategories.length,
        isTraderaConnection,
        lastFetchResult,
        lastFetchWarning,
        persistedFetchSource,
      }),
    [
      derivedCategoryStats,
      externalCategories.length,
      isTraderaConnection,
      lastFetchResult,
      lastFetchWarning,
      persistedFetchSource,
    ]
  );
}

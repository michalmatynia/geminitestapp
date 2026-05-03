import type { KangurScore } from '@kangur/contracts/kangur';
import type { KangurClientStorageAdapter } from '@kangur/platform';
import { useEffect, useMemo } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { resolveKangurMobileScoreScope } from '../profile/mobileScoreScope';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import {
  persistKangurMobileRecentResults,
  resolvePersistedKangurMobileRecentResults,
} from '../scores/persistedKangurMobileRecentResults';
import { useKangurMobileScoreHistory } from '../scores/useKangurMobileScoreHistory';

type UseKangurMobileRecentResultsOptions = {
  enabled?: boolean;
  limit?: number;
};

type UseKangurMobileRecentResultsResult = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  refresh: () => Promise<void>;
  results: KangurScore[];
};

const getPersistedResults = (
  identityKey: string,
  limit: number,
  storage: KangurClientStorageAdapter,
): KangurScore[] => {
  return resolvePersistedKangurMobileRecentResults({
    identityKey,
    limit,
    storage,
  });
};

const getErrorMessage = (
  copy: (params: { de: string; en: string; pl: string }) => string,
): string => {
  return copy({
    de: 'Die letzten Ergebnisse konnten nicht geladen werden.',
    en: 'Could not load the recent results.',
    pl: 'Nie udało się pobrać ostatnich wyników.',
  });
};

type ResultsQuery = {
  isEnabled: boolean;
  isLoading: boolean;
  isPlaceholderData: boolean;
  isRestoringAuth: boolean;
  error: unknown;
};

const canPersist = (
  identityKey: string | null,
  resultsQuery: ResultsQuery,
): boolean => identityKey !== null && shouldPersist(identityKey, resultsQuery);

export const useKangurMobileRecentResults = (
  options: UseKangurMobileRecentResultsOptions = {},
): UseKangurMobileRecentResultsResult => {
  const { copy } = useKangurMobileI18n();
  const { session } = useKangurMobileAuth();
  const { storage } = useKangurMobileRuntime();
  const limit =
    typeof options.limit === 'number' && options.limit > 0
      ? Math.round(options.limit)
      : 3;
  const isQueryEnabled = options.enabled ?? true;
  const scoreScope = resolveKangurMobileScoreScope(session.user);
  const scoreScopeIdentityKey = scoreScope?.identityKey ?? null;

  const persistedResults = useMemo(
    () =>
      scoreScopeIdentityKey !== null
        ? getPersistedResults(scoreScopeIdentityKey, limit, storage)
        : null,
    [limit, scoreScopeIdentityKey, storage],
  );
  const resultsQuery = useKangurMobileScoreHistory({
    enabled: isQueryEnabled,
    limit,
    placeholderData: persistedResults ?? undefined,
    sort: '-created_date',
  });
  const results = (
    resultsQuery.isEnabled || !persistedResults ? resultsQuery.scores : persistedResults
  ).slice(0, limit);

  useEffect(() => {
    if (canPersist(scoreScopeIdentityKey, resultsQuery)) {
      persistKangurMobileRecentResults({
        identityKey: scoreScopeIdentityKey!,
        results,
        storage,
      });
    }
  }, [
    results,
    resultsQuery.error,
    resultsQuery.isEnabled,
    resultsQuery.isLoading,
    resultsQuery.isPlaceholderData,
    resultsQuery.isRestoringAuth,
    scoreScopeIdentityKey,
    storage,
  ]);

  return {
    error: resultsQuery.error instanceof Error ? getErrorMessage(copy) : null,
    isEnabled: resultsQuery.isEnabled,
    isLoading: resultsQuery.isLoading,
    isRestoringAuth: resultsQuery.isRestoringAuth,
    refresh: async () => {
      if (resultsQuery.isEnabled) {
        await resultsQuery.refresh();
      }
    },
    results,
  };
};

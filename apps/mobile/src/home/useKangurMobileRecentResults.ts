import type { KangurScore } from '@kangur/contracts';
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
      scoreScopeIdentityKey
        ? resolvePersistedKangurMobileRecentResults({
            identityKey: scoreScopeIdentityKey,
            limit,
            storage,
          })
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
    if (
      !scoreScopeIdentityKey ||
      !resultsQuery.isEnabled ||
      resultsQuery.isLoading ||
      resultsQuery.isPlaceholderData ||
      resultsQuery.isRestoringAuth ||
      resultsQuery.error
    ) {
      return;
    }

    persistKangurMobileRecentResults({
      identityKey: scoreScopeIdentityKey,
      results,
      storage,
    });
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
    error:
      resultsQuery.error instanceof Error
        ? copy({
            de: 'Die letzten Ergebnisse konnten nicht geladen werden.',
            en: 'Could not load the recent results.',
            pl: 'Nie udało się pobrać ostatnich wyników.',
          })
        : null,
    isEnabled: resultsQuery.isEnabled,
    isLoading: resultsQuery.isLoading,
    isRestoringAuth: resultsQuery.isRestoringAuth,
    refresh: async () => {
      if (!resultsQuery.isEnabled) {
        return;
      }

      await resultsQuery.refresh();
    },
    results,
  };
};

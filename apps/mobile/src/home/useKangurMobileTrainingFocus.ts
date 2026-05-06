import type { KangurScore } from '@kangur/contracts/kangur';
import { resolveKangurLessonFocusForPracticeOperation } from '@kangur/core';
import type { KangurClientStorageAdapter } from '@kangur/platform';
import { useEffect, useMemo } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import {
  buildKangurMobileTrainingFocus,
  type KangurMobileOperationPerformance,
} from '../scores/mobileScoreSummary';
import {
  persistKangurMobileTrainingFocus,
  resolvePersistedKangurMobileTrainingFocus,
} from '../scores/persistedKangurMobileTrainingFocus';
import { persistKangurMobileRecentResults } from '../scores/persistedKangurMobileRecentResults';
import { useKangurMobileResults } from '../scores/useKangurMobileResults';
import { resolveKangurMobileScoreScope } from '../profile/mobileScoreScope';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';

type UseKangurMobileTrainingFocusResult = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  isRestoringAuth: boolean;
  recentResults: KangurScore[];
  refresh: () => Promise<void>;
  strongestLessonFocus: string | null;
  strongestOperation: KangurMobileOperationPerformance | null;
  weakestLessonFocus: string | null;
  weakestOperation: KangurMobileOperationPerformance | null;
};

type UseKangurMobileTrainingFocusOptions = {
  enabled?: boolean;
  recentResultsLimit?: number;
};

const DEFAULT_RECENT_RESULTS_LIMIT = 3;

function resolveRecentResultsLimit(
  options: UseKangurMobileTrainingFocusOptions,
): number {
  return typeof options.recentResultsLimit === 'number' &&
    options.recentResultsLimit > 0
    ? Math.round(options.recentResultsLimit)
    : DEFAULT_RECENT_RESULTS_LIMIT;
}

function resolveTrainingFocusResult({
  results,
  recentResults,
  focus,
}: {
  results: ReturnType<typeof useKangurMobileResults>;
  recentResults: KangurScore[];
  focus: ReturnType<typeof buildKangurMobileTrainingFocus>;
}): UseKangurMobileTrainingFocusResult {
  return {
    error: results.error,
    isEnabled: results.isEnabled,
    isLoading: results.isLoading,
    isRestoringAuth: results.isRestoringAuth,
    recentResults,
    refresh: results.refresh,
    strongestLessonFocus:
      focus.strongestOperation !== null
        ? resolveKangurLessonFocusForPracticeOperation(
            focus.strongestOperation.operation,
          )
        : null,
    strongestOperation: focus.strongestOperation,
    weakestLessonFocus:
      focus.weakestOperation !== null
        ? resolveKangurLessonFocusForPracticeOperation(
            focus.weakestOperation.operation,
          )
        : null,
    weakestOperation: focus.weakestOperation,
  };
}

function usePersistTrainingFocus({
  hasResolvedLiveFocus,
  liveFocus,
  recentResults,
  scoreScopeIdentityKey,
  storage,
}: {
  hasResolvedLiveFocus: boolean;
  liveFocus: ReturnType<typeof buildKangurMobileTrainingFocus>;
  recentResults: KangurScore[];
  scoreScopeIdentityKey: string | null;
  storage: KangurClientStorageAdapter;
}): void {
  useEffect(() => {
    if (scoreScopeIdentityKey === null || !hasResolvedLiveFocus) {
      return;
    }

    persistKangurMobileTrainingFocus({
      focus: liveFocus,
      identityKey: scoreScopeIdentityKey,
      storage,
    });
    persistKangurMobileRecentResults({
      identityKey: scoreScopeIdentityKey,
      results: recentResults,
      storage,
    });
  }, [
    hasResolvedLiveFocus,
    liveFocus,
    recentResults,
    scoreScopeIdentityKey,
    storage,
  ]);
}

function useTrainingFocusData({
  results,
  recentResultsLimit,
  storage,
  scoreScopeIdentityKey,
}: {
  results: ReturnType<typeof useKangurMobileResults>;
  recentResultsLimit: number;
  storage: KangurClientStorageAdapter;
  scoreScopeIdentityKey: string | null;
}): {
  focus: ReturnType<typeof buildKangurMobileTrainingFocus>;
  recentResults: KangurScore[];
} {
  const persistedFocus = useMemo(
    () =>
      scoreScopeIdentityKey !== null
        ? resolvePersistedKangurMobileTrainingFocus({
            identityKey: scoreScopeIdentityKey,
            storage,
          })
        : null,
    [scoreScopeIdentityKey, storage],
  );

  const liveFocus = useMemo(
    () => buildKangurMobileTrainingFocus(results.operationPerformance),
    [results.operationPerformance],
  );

  const recentResults = useMemo(
    () => results.scores.slice(0, recentResultsLimit),
    [recentResultsLimit, results.scores],
  );

  const hasResolvedLiveFocus =
    results.isEnabled &&
    !results.isLoading &&
    !results.isRestoringAuth &&
    results.error === null;

  const focus = hasResolvedLiveFocus
    ? liveFocus
    : persistedFocus ?? liveFocus;

  usePersistTrainingFocus({
    hasResolvedLiveFocus,
    liveFocus,
    recentResults,
    scoreScopeIdentityKey,
    storage,
  });

  return { focus, recentResults };
}

export const useKangurMobileTrainingFocus = (
  options: UseKangurMobileTrainingFocusOptions = {},
): UseKangurMobileTrainingFocusResult => {
  const { session } = useKangurMobileAuth();
  const { storage } = useKangurMobileRuntime();
  const recentResultsLimit = resolveRecentResultsLimit(options);

  const results = useKangurMobileResults({
    enabled: options.enabled,
  });

  const scoreScopeIdentityKey =
    resolveKangurMobileScoreScope(session.user)?.identityKey ?? null;

  const { focus, recentResults } = useTrainingFocusData({
    results,
    recentResultsLimit,
    storage,
    scoreScopeIdentityKey,
  });

  return resolveTrainingFocusResult({
    results,
    recentResults,
    focus,
  });
};

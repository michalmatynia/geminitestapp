import type { KangurScore } from '@kangur/contracts/kangur';
import { resolveKangurLessonFocusForPracticeOperation } from '@kangur/core';
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

export const useKangurMobileTrainingFocus =
  (
    options: UseKangurMobileTrainingFocusOptions = {},
  ): UseKangurMobileTrainingFocusResult => {
    const { session } = useKangurMobileAuth();
    const { storage } = useKangurMobileRuntime();
    const recentResultsLimit =
      typeof options.recentResultsLimit === 'number' &&
      options.recentResultsLimit > 0
        ? Math.round(options.recentResultsLimit)
        : 3;
    const results = useKangurMobileResults({
      enabled: options.enabled,
    });
    const scoreScopeIdentityKey =
      resolveKangurMobileScoreScope(session.user)?.identityKey ?? null;
    const persistedFocus = useMemo(
      () =>
        scoreScopeIdentityKey
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
      !results.error;
    const focus = hasResolvedLiveFocus
      ? liveFocus
      : persistedFocus ?? liveFocus;

    useEffect(() => {
      if (!scoreScopeIdentityKey || !hasResolvedLiveFocus) {
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

    return {
      error: results.error,
      isEnabled: results.isEnabled,
      isLoading: results.isLoading,
      isRestoringAuth: results.isRestoringAuth,
      recentResults,
      refresh: results.refresh,
      strongestLessonFocus: focus.strongestOperation
        ? resolveKangurLessonFocusForPracticeOperation(
            focus.strongestOperation.operation,
          )
        : null,
      strongestOperation: focus.strongestOperation,
      weakestLessonFocus: focus.weakestOperation
        ? resolveKangurLessonFocusForPracticeOperation(
            focus.weakestOperation.operation,
          )
        : null,
      weakestOperation: focus.weakestOperation,
    };
  };

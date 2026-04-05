import type { KangurPracticeOperation } from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts/kangur';
import { useMemo, useSyncExternalStore } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileLeaderboard } from '../leaderboard/useKangurMobileLeaderboard';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { useKangurMobileScoreHistory } from '../scores/useKangurMobileScoreHistory';
import {
  buildKangurPracticeSyncProofSnapshot,
  type KangurPracticeSyncProofSnapshot,
} from './practiceSyncProof';

type UseKangurPracticeSyncProofOptions = {
  enabled: boolean;
  expectedCorrectAnswers: number;
  expectedTotalQuestions: number;
  operation: KangurPracticeOperation;
  runStartedAt: number;
};

type UseKangurPracticeSyncProofResult = {
  error: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  snapshot: KangurPracticeSyncProofSnapshot;
};

const EMPTY_SNAPSHOT: KangurPracticeSyncProofSnapshot = {
  matchedScoreId: null,
  surfaces: [],
};

export const useKangurPracticeSyncProof = ({
  enabled,
  expectedCorrectAnswers,
  expectedTotalQuestions,
  operation,
  runStartedAt,
}: UseKangurPracticeSyncProofOptions): UseKangurPracticeSyncProofResult => {
  const { progressStore } = useKangurMobileRuntime();
  const { copy, locale } = useKangurMobileI18n();
  const progress = useSyncExternalStore(
    progressStore.subscribeToProgress,
    progressStore.loadProgress,
    createDefaultKangurProgressState,
  );
  const scoresQuery = useKangurMobileScoreHistory({
    enabled,
    limit: 40,
    sort: '-created_date',
  });
  const leaderboard = useKangurMobileLeaderboard({
    enabled,
    limit: 100,
  });

  const snapshot = useMemo(() => {
    if (!enabled) {
      return EMPTY_SNAPSHOT;
    }

    return buildKangurPracticeSyncProofSnapshot({
      expectedCorrectAnswers,
      expectedTotalQuestions,
      leaderboardItems: leaderboard.items,
      locale,
      operation,
      progress,
      runStartedAt,
      scores: scoresQuery.scores,
    });
  }, [
    enabled,
    expectedCorrectAnswers,
    expectedTotalQuestions,
    leaderboard.items,
    locale,
    operation,
    progress,
    runStartedAt,
    scoresQuery.scores,
  ]);

  return {
    error:
      leaderboard.error ??
      (scoresQuery.error instanceof Error
        ? copy({
            de: 'Die Synchronisierungsvorschau konnte nicht aktualisiert werden.',
            en: 'Could not refresh the sync proof.',
            pl: 'Nie udało się odświeżyć podglądu synchronizacji.',
          })
        : null),
    isEnabled: enabled,
    isLoading: enabled && (scoresQuery.isLoading || leaderboard.isLoading),
    refresh: async () => {
      await Promise.all([scoresQuery.refresh(), leaderboard.refresh()]);
    },
    snapshot,
  };
};

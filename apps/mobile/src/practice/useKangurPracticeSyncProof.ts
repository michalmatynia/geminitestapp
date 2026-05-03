import { type KangurLeaderboardItem, type KangurPracticeOperation } from '@kangur/core';
import { createDefaultKangurProgressState, type KangurProgressState, type KangurScore } from '@kangur/contracts/kangur';
import { useMemo, useSyncExternalStore } from 'react';

import { useKangurMobileI18n, type KangurMobileLocale } from '../i18n/kangurMobileI18n';
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

interface SnapshotParams {
  enabled: boolean;
  expectedCorrectAnswers: number;
  expectedTotalQuestions: number;
  leaderboardItems: KangurLeaderboardItem[];
  locale: KangurMobileLocale;
  operation: KangurPracticeOperation;
  progress: KangurProgressState;
  runStartedAt: number;
  scores: KangurScore[];
}

function calculateSnapshot(params: SnapshotParams): KangurPracticeSyncProofSnapshot {
  if (!params.enabled) {
    return EMPTY_SNAPSHOT;
  }

  return buildKangurPracticeSyncProofSnapshot({
    expectedCorrectAnswers: params.expectedCorrectAnswers,
    expectedTotalQuestions: params.expectedTotalQuestions,
    leaderboardItems: params.leaderboardItems,
    locale: params.locale,
    operation: params.operation,
    progress: params.progress,
    runStartedAt: params.runStartedAt,
    scores: params.scores,
  });
}

function getSyncError(
  leaderboardError: string | null,
  scoresQueryError: unknown,
  copy: (v: Record<string, string>) => string
): string | null {
  if (leaderboardError !== null) {
    return leaderboardError;
  }
  if (scoresQueryError instanceof Error) {
    return copy({
      de: 'Die Synchronisierungsvorschau konnte nicht aktualisiert werden.',
      en: 'Could not refresh the sync proof.',
      pl: 'Nie udało się odświeżyć podglądu synchronizacji.',
    });
  }
  return null;
}

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

  const snapshot = useMemo(() => calculateSnapshot({
    enabled,
    expectedCorrectAnswers,
    expectedTotalQuestions,
    leaderboardItems: leaderboard.items,
    locale,
    operation,
    progress,
    runStartedAt,
    scores: scoresQuery.scores,
  }), [
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

  const error = useMemo(
    () => getSyncError(leaderboard.error, scoresQuery.error, copy),
    [leaderboard.error, scoresQuery.error, copy]
  );

  return {
    error,
    isEnabled: enabled,
    isLoading: enabled && (scoresQuery.isLoading || leaderboard.isLoading),
    refresh: async () => {
      await Promise.all([scoresQuery.refresh(), leaderboard.refresh()]);
    },
    snapshot,
  };
};

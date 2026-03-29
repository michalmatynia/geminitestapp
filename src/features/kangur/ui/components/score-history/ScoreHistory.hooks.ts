'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type { KangurScoreRecord } from '@kangur/platform';
import {
  isRecoverableKangurClientFetchError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { loadScopedKangurScores } from '@/features/kangur/ui/services/learner-profile-scores';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { resolveKangurScoreSubject } from '@/shared/contracts/kangur';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  buildKangurScoreInsights,
  resolveKangurScoreOperationInfo,
} from '@/features/kangur/ui/services/score-insights';
import { getScoreHistoryFallbackCopy } from './ScoreHistory.copy';
import { SCORE_FETCH_LIMIT } from './ScoreHistory.constants';
import type { ScoreHistoryProps } from './ScoreHistory.types';
import { translateScoreHistoryWithFallback } from './ScoreHistory.utils';

const kangurPlatform = getKangurPlatform();

type NormalizedScoreHistoryScope = {
  createdBy: string;
  learnerId: string;
  playerName: string;
};

const normalizeScoreHistoryScope = (input: {
  createdBy: string | null;
  learnerId: string | null;
  playerName: string | null;
}): NormalizedScoreHistoryScope => ({
  learnerId: input.learnerId?.trim() || '',
  playerName: input.playerName?.trim() || '',
  createdBy: input.createdBy?.trim() || '',
});

const resolveScoreHistoryLoadContext = (
  normalizedScope: NormalizedScoreHistoryScope,
  subject: string
) => ({
  learnerIdProvided: normalizedScope.learnerId.length > 0,
  playerNameProvided: normalizedScope.playerName.length > 0,
  createdByProvided: normalizedScope.createdBy.length > 0,
  subject,
});

const setScoreHistoryLoadingState = (
  isActive: boolean,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  nextValue: boolean
): void => {
  if (isActive) {
    setLoading(nextValue);
  }
};

const setScoreHistoryRecordsIfActive = (
  isActive: boolean,
  setRecords: React.Dispatch<React.SetStateAction<KangurScoreRecord[]>>,
  nextRecords: KangurScoreRecord[]
): void => {
  if (isActive) {
    setRecords(nextRecords);
  }
};

const loadScoreHistoryRecords = async (input: {
  normalizedScope: NormalizedScoreHistoryScope;
  onError: () => void;
  subject: string;
}): Promise<KangurScoreRecord[]> =>
  withKangurClientError(
    {
      source: 'kangur.score-history',
      action: 'load-scores',
      description: 'Loads scoped Kangur scores for the learner history panel.',
      context: resolveScoreHistoryLoadContext(input.normalizedScope, input.subject),
    },
    async () =>
      await loadScopedKangurScores(kangurPlatform.score, {
        learnerId: input.normalizedScope.learnerId,
        playerName: input.normalizedScope.playerName,
        createdBy: input.normalizedScope.createdBy,
        limit: SCORE_FETCH_LIMIT,
        fallbackToAll: true,
        subject: input.subject,
      }),
    {
      fallback: [],
      shouldReport: (error) => !isRecoverableKangurClientFetchError(error),
      onError: input.onError,
    }
  );

export function useScoreHistoryState(props: ScoreHistoryProps) {
  const {
    learnerId = null,
    playerName = null,
    createdBy = null,
    prefetchedScores,
    prefetchedLoading,
  } = props;

  const locale = useLocale();
  const normalizedLocale = normalizeSiteLocale(locale);
  const translations = useTranslations('KangurScoreHistory');
  const operationTranslations = useTranslations('KangurScoreHistory.operations');
  const fallbackCopy = useMemo(
    () => getScoreHistoryFallbackCopy(normalizedLocale),
    [normalizedLocale]
  );
  const { subject } = useKangurSubjectFocus();
  const [scores, setScores] = useState<KangurScoreRecord[]>([]);
  const [isInternalLoading, setIsInternalLoading] = useState(true);
  
  const usesPrefetchedScores = prefetchedScores !== undefined || prefetchedLoading !== undefined;
  const resolvedScores = prefetchedScores ?? scores;
  const loading = prefetchedLoading ?? isInternalLoading;

  useEffect(() => {
    if (usesPrefetchedScores) return;

    let isActive = true;
    const loadScores = async (): Promise<void> => {
      const normalizedScope = normalizeScoreHistoryScope({
        learnerId,
        playerName,
        createdBy,
      });
      setScoreHistoryLoadingState(isActive, setIsInternalLoading, true);

      try {
        const loadedScores = await loadScoreHistoryRecords({
          normalizedScope,
          subject,
          onError: () => setScoreHistoryRecordsIfActive(isActive, setScores, []),
        });
        setScoreHistoryRecordsIfActive(isActive, setScores, loadedScores);
      } finally {
        setScoreHistoryLoadingState(isActive, setIsInternalLoading, false);
      }
    };

    void loadScores();
    return () => {
      isActive = false;
    };
  }, [createdBy, learnerId, playerName, subject, usesPrefetchedScores]);

  const subjectScores = useMemo(
    () => resolvedScores.filter((score) => resolveKangurScoreSubject(score) === subject),
    [resolvedScores, subject]
  );

  const scoreInsightsLocalizer = useMemo(
    () => ({
      locale: normalizedLocale,
      translateOperationLabel: (operation: string, fallback: string) =>
        translateScoreHistoryWithFallback(operationTranslations, operation, fallback),
    }),
    [normalizedLocale, operationTranslations]
  );

  const insights = useMemo(() => {
    const scoreInsights = buildKangurScoreInsights(
      subjectScores,
      undefined,
      scoreInsightsLocalizer
    );
    const summary = {
      totalGames: subjectScores.length,
      averageAccuracy:
        subjectScores.length === 0
          ? 0
          : Math.round(
              subjectScores.reduce((total, score) => {
                const totalQuestions = Math.max(1, score.total_questions || 1);
                return total + (score.correct_answers / totalQuestions) * 100;
              }, 0) / subjectScores.length
            ),
      perfectGames: subjectScores.filter(
        (score) => score.correct_answers === score.total_questions
      ).length,
    };
    const operationPerformance = Array.from(
      subjectScores.reduce(
        (buckets, score) => {
          const totalQuestions = Math.max(1, score.total_questions || 1);
          const accuracy = Math.round((score.correct_answers / totalQuestions) * 100);
          const bucket = buckets.get(score.operation) ?? {
            accuracySum: 0,
            attempts: 0,
          };
          bucket.attempts += 1;
          bucket.accuracySum += accuracy;
          buckets.set(score.operation, bucket);
          return buckets;
        },
        new Map<string, { accuracySum: number; attempts: number }>()
      ).entries()
    ).map(([operation, bucket]) => {
      const operationInfo = resolveKangurScoreOperationInfo(operation, scoreInsightsLocalizer);
      return {
        operation,
        label: operationInfo.label,
        emoji: operationInfo.emoji,
        attempts: bucket.attempts,
        averageAccuracy: Math.round(bucket.accuracySum / Math.max(1, bucket.attempts)),
      };
    });

    return {
      lastPlayedAt: scoreInsights.lastPlayedAt,
      operationPerformance,
      strongest: scoreInsights.strongestOperation
        ? {
            ...scoreInsights.strongestOperation,
            averageXpPerSession: scoreInsights.strongestOperation.averageXpEarned,
          }
        : null,
      summary,
      trend: scoreInsights.trend,
      weakest: scoreInsights.weakestOperation
        ? {
            ...scoreInsights.weakestOperation,
            averageXpPerSession: scoreInsights.weakestOperation.averageXpEarned,
          }
        : null,
    };
  }, [subjectScores, scoreInsightsLocalizer]);

  return {
    translations,
    fallbackCopy,
    subject,
    loading,
    subjectScores,
    insights,
    normalizedLocale,
    translateOperationLabel: scoreInsightsLocalizer.translateOperationLabel,
  };
}

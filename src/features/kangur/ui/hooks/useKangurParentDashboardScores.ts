'use client';

import { useEffect, useMemo, useState } from 'react';

import { withKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import {
  loadScopedKangurScores,
  peekCachedScopedKangurScores,
} from '@/features/kangur/ui/services/learner-profile-scores';
import type { KangurScoreRecord } from '@kangur/platform';
import type { KangurLessonSubject } from '@/shared/contracts/kangur';

const kangurPlatform = getKangurPlatform();
const PARENT_DASHBOARD_SCORE_FETCH_LIMIT = 120;

export function useKangurParentDashboardScores({
  createdBy,
  enabled,
  learnerId,
  playerName,
  subject,
}: {
  createdBy?: string | null;
  enabled: boolean;
  learnerId?: string | null;
  playerName?: string | null;
  subject?: KangurLessonSubject;
}): {
  isLoadingScores: boolean;
  scores: KangurScoreRecord[];
  scoresError: string | null;
} {
  const cachedScores = useMemo(
    () =>
      enabled
        ? peekCachedScopedKangurScores(kangurPlatform.score, {
            learnerId,
            playerName,
            createdBy,
            limit: PARENT_DASHBOARD_SCORE_FETCH_LIMIT,
            subject,
          })
        : null,
    [createdBy, enabled, learnerId, playerName, subject]
  );
  const [scores, setScores] = useState<KangurScoreRecord[]>(() => cachedScores ?? []);
  const [isLoadingScores, setIsLoadingScores] = useState(enabled && cachedScores === null);
  const [scoresError, setScoresError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    if (!enabled) {
      setScores([]);
      setScoresError(null);
      setIsLoadingScores(false);
      return () => {
        isActive = false;
      };
    }

    if (cachedScores !== null) {
      setScores(cachedScores);
      setScoresError(null);
      setIsLoadingScores(false);
      return () => {
        isActive = false;
      };
    }

    const loadScores = async (): Promise<void> => {
      if (isActive) {
        setIsLoadingScores(true);
        setScoresError(null);
      }

      try {
        const loadedScores = await withKangurClientError(
          {
            source: 'kangur.parent-dashboard',
            action: 'load-score-analytics',
            description: 'Loads scoped learner score history for parent dashboard analytics.',
            context: {
              learnerIdProvided: Boolean(learnerId?.trim()),
              playerNameProvided: Boolean(playerName?.trim()),
              createdByProvided: Boolean(createdBy?.trim()),
              subject,
            },
          },
          async () =>
            await loadScopedKangurScores(kangurPlatform.score, {
              learnerId,
              playerName,
              createdBy,
              limit: PARENT_DASHBOARD_SCORE_FETCH_LIMIT,
              subject,
            }),
          {
            fallback: [],
            onError: (error) => {
              if (!isActive) {
                return;
              }

              if (isKangurAuthStatusError(error)) {
                setScores([]);
                setScoresError(null);
                return;
              }

              setScoresError('load_failed');
            },
            shouldReport: () => false,
          }
        );

        if (!isActive) {
          return;
        }
        setScores(loadedScores);
      } finally {
        if (isActive) {
          setIsLoadingScores(false);
        }
      }
    };

    void loadScores();

    return () => {
      isActive = false;
    };
  }, [cachedScores, createdBy, enabled, learnerId, playerName, subject]);

  return {
    isLoadingScores,
    scores,
    scoresError,
  };
}

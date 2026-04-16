'use client';

import { useEffect, useState } from 'react';
import type { KangurScoreRecord } from '@kangur/platform';
import { isKangurAuthStatusError } from '@/features/kangur/services/status-errors';
import { logKangurClientError, withKangurClientError } from '@/features/kangur/observability/client';
import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import {
  LEARNER_PROFILE_SCORE_FETCH_LIMIT,
  loadLearnerProfileScores,
} from '@/features/kangur/ui/services/learner-profile-scores';
import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
import {
  type KangurLearnerProfileScoreIdentity,
  type KangurLearnerProfileScoreState,
  applyLearnerProfileScoreState,
  hasLearnerProfileScoreIdentity,
  resolveLearnerProfileScoreLoadMode,
} from './KangurLearnerProfileRuntimeContext.utils';

const kangurPlatform = getKangurPlatform();
const LEARNER_PROFILE_SCORES_LOAD_DEFER_MS = 0;

export const loadDeferredLearnerProfileScores = async ({
  hasUser,
  isActive,
  loadScoresErrorLabel,
  scoreIdentity,
  setState,
  subject,
}: {
  hasUser: boolean;
  isActive: () => boolean;
  loadScoresErrorLabel: string;
  scoreIdentity: KangurLearnerProfileScoreIdentity;
  setState: React.Dispatch<React.SetStateAction<KangurLearnerProfileScoreState>>;
  subject: string;
}): Promise<void> => {
  const { learnerId, userEmail, userName } = scoreIdentity;
  try {
    const loadedScores = await withKangurClientError(
      {
        source: 'kangur.learner-profile',
        action: 'load-scores',
        description: 'Loads learner score history for the profile view.',
        context: {
          hasUser,
          subject,
        },
      },
      async () =>
        await loadLearnerProfileScores(kangurPlatform.score, {
          learnerId,
          userName,
          userEmail,
          subject: subject as KangurLessonSubject,
          limit: LEARNER_PROFILE_SCORE_FETCH_LIMIT,
        }),
      {
        fallback: [],
        onError: (error) => {
          if (!isActive()) {
            return;
          }

          if (isKangurAuthStatusError(error)) {
            applyLearnerProfileScoreState(setState, {
              scores: [],
              scoresError: null,
            });
            return;
          }

          applyLearnerProfileScoreState(setState, {
            scoresError: loadScoresErrorLabel,
          });
          logKangurClientError(error, {
            source: 'kangur.learner-profile',
            action: 'load-scores',
            hasUser,
            subject,
          });
        },
        shouldReport: () => false,
      }
    );
    if (!isActive()) {
      return;
    }
    applyLearnerProfileScoreState(setState, {
      scores: loadedScores,
    });
  } finally {
    if (isActive()) {
      applyLearnerProfileScoreState(setState, {
        isLoadingScores: false,
      });
    }
  }
};

export const useLearnerProfileScores = ({
  cachedScores,
  hasUser,
  loadScoresErrorLabel,
  scoreIdentity,
  subject,
}: {
  cachedScores: KangurScoreRecord[] | null;
  hasUser: boolean;
  loadScoresErrorLabel: string;
  scoreIdentity: KangurLearnerProfileScoreIdentity;
  subject: string;
}): KangurLearnerProfileScoreState => {
  const hasScoreIdentity = hasLearnerProfileScoreIdentity(scoreIdentity);
  const [scoreState, setScoreState] = useState<KangurLearnerProfileScoreState>(() => ({
    scores: cachedScores ?? [],
    isLoadingScores: hasScoreIdentity && cachedScores === null,
    scoresError: null,
  }));

  useEffect(() => {
    let isActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const stop = (): void => {
      isActive = false;
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
    const mode = resolveLearnerProfileScoreLoadMode({
      cachedScores,
      scoreIdentity,
    });

    if (mode === 'empty') {
      applyLearnerProfileScoreState(setScoreState, {
        scores: [],
        isLoadingScores: false,
        scoresError: null,
      });
      return stop;
    }

    if (mode === 'cached') {
      applyLearnerProfileScoreState(setScoreState, {
        scores: cachedScores ?? [],
        isLoadingScores: false,
        scoresError: null,
      });
      return stop;
    }

    applyLearnerProfileScoreState(setScoreState, {
      isLoadingScores: true,
      scoresError: null,
    });
    timeoutId = globalThis.setTimeout(() => {
      void loadDeferredLearnerProfileScores({
        hasUser,
        isActive: () => isActive,
        loadScoresErrorLabel,
        scoreIdentity,
        setState: setScoreState,
        subject,
      });
    }, LEARNER_PROFILE_SCORES_LOAD_DEFER_MS);

    return stop;
  }, [cachedScores, hasUser, loadScoresErrorLabel, scoreIdentity, subject]);

  return scoreState;
};

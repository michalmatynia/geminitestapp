import type { KangurLeaderboardItem, KangurPracticeOperation } from '@kangur/core';
import type { KangurProgressState, KangurScore } from '@kangur/contracts/kangur';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { findMatchingKangurPracticeSyncScore } from './practiceSyncProofLogic';
import { 
  buildRecentResultsSurface, 
  buildProfileProgressSurface, 
  buildDailyPlanSurface, 
  buildLeaderboardSurface,
  type KangurPracticeSyncProofSnapshot 
} from './practiceSyncProofSurfaces';
import { formatKangurMobileScoreOperation } from '../scores/mobileScoreSummary';

export type BuildKangurPracticeSyncProofInput = {
  expectedCorrectAnswers: number;
  expectedTotalQuestions: number;
  leaderboardItems: KangurLeaderboardItem[];
  locale?: KangurMobileLocale;
  operation: KangurPracticeOperation;
  progress: KangurProgressState;
  runStartedAt: number;
  scores: KangurScore[];
};

export const buildKangurPracticeSyncProofSnapshot = ({
  expectedCorrectAnswers,
  expectedTotalQuestions,
  leaderboardItems,
  locale = 'pl',
  operation,
  progress,
  runStartedAt,
  scores,
}: BuildKangurPracticeSyncProofInput): KangurPracticeSyncProofSnapshot => {
  const matchedScore = findMatchingKangurPracticeSyncScore({
    expectedCorrectAnswers,
    expectedTotalQuestions,
    operation,
    runStartedAt,
    scores,
  });

  const operationLabel = formatKangurMobileScoreOperation(operation, locale);
  const lessonMastery = progress.lessonMastery[operation] ?? null;
  const hasOperationProgress =
    progress.operationsPlayed.includes(operation) || lessonMastery !== null;
  const planRecentResults = scores.slice(0, 3);
  const isVisibleInDailyPlan =
    matchedScore !== null &&
    planRecentResults.some((score) => score.id === matchedScore.id);
  const leaderboardItem =
    matchedScore !== null
      ? leaderboardItems.find((item) => item.id === matchedScore.id)
      : null;

  return {
    matchedScoreId: matchedScore?.id ?? null,
    surfaces: [
      buildRecentResultsSurface({ locale, matchedScore, operationLabel }),
      buildProfileProgressSurface({
        hasOperationProgress,
        lessonMastery,
        locale,
        progress,
      }),
      buildDailyPlanSurface({ isVisibleInDailyPlan, locale }),
      buildLeaderboardSurface({ leaderboardItem, locale }),
    ],
  };
};

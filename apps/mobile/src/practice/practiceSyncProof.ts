import type { KangurLeaderboardItem, KangurPracticeOperation } from '@kangur/core';
import type { KangurProgressState, KangurScore } from '@kangur/contracts';

import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
} from '../scores/mobileScoreSummary';

export type KangurPracticeSyncProofSurfaceStatus = 'missing' | 'ready';

export type KangurPracticeSyncProofSurface = {
  detail: string;
  label: string;
  status: KangurPracticeSyncProofSurfaceStatus;
};

export type KangurPracticeSyncProofSnapshot = {
  matchedScoreId: string | null;
  surfaces: KangurPracticeSyncProofSurface[];
};

type BuildKangurPracticeSyncProofInput = {
  expectedCorrectAnswers: number;
  expectedTotalQuestions: number;
  leaderboardItems: KangurLeaderboardItem[];
  operation: KangurPracticeOperation;
  progress: KangurProgressState;
  runStartedAt: number;
  scores: KangurScore[];
};

const findMatchingKangurPracticeSyncScore = ({
  expectedCorrectAnswers,
  expectedTotalQuestions,
  operation,
  runStartedAt,
  scores,
}: Pick<
  BuildKangurPracticeSyncProofInput,
  | 'expectedCorrectAnswers'
  | 'expectedTotalQuestions'
  | 'operation'
  | 'runStartedAt'
  | 'scores'
>): KangurScore | null => {
  const exactMatches = scores.filter(
    (score) =>
      score.operation === operation &&
      score.correct_answers === expectedCorrectAnswers &&
      score.total_questions === expectedTotalQuestions,
  );

  if (exactMatches.length === 0) {
    return null;
  }

  if (!Number.isFinite(runStartedAt) || runStartedAt <= 0) {
    return exactMatches[0] ?? null;
  }

  return (
    exactMatches.find((score) => {
      const createdAt = Date.parse(score.created_date);
      return Number.isFinite(createdAt) && createdAt >= runStartedAt;
    }) ?? null
  );
};

export const buildKangurPracticeSyncProofSnapshot = ({
  expectedCorrectAnswers,
  expectedTotalQuestions,
  leaderboardItems,
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
  const operationLabel = formatKangurMobileScoreOperation(operation);
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
      matchedScore
        ? {
            detail: `${operationLabel} ${matchedScore.score}/${matchedScore.total_questions} · ${formatKangurMobileScoreDateTime(
              matchedScore.created_date,
            )}`,
            label: 'Results history',
            status: 'ready',
          }
        : {
            detail:
              'Fresh synced row is not visible in learner score history yet.',
            label: 'Results history',
            status: 'missing',
          },
      hasOperationProgress
        ? {
            detail: lessonMastery
              ? `Mastery ${lessonMastery.masteryPercent}% · games ${progress.gamesPlayed}`
              : `Operation saved locally · games ${progress.gamesPlayed}`,
            label: 'Profile progress',
            status: 'ready',
          }
        : {
            detail:
              'Local progress does not show this operation in lesson mastery yet.',
            label: 'Profile progress',
            status: 'missing',
          },
      isVisibleInDailyPlan
        ? {
            detail: 'Fresh score is visible in the recent-results slice used by /plan.',
            label: 'Daily plan',
            status: 'ready',
          }
        : {
            detail: 'Fresh score is not in the recent-results slice for /plan yet.',
            label: 'Daily plan',
            status: 'missing',
          },
      leaderboardItem
        ? {
            detail: `${leaderboardItem.rankLabel} ${leaderboardItem.playerName}${
              leaderboardItem.isCurrentUser ? ' · Ty' : ''
            }`,
            label: 'Leaderboard',
            status: 'ready',
          }
        : {
            detail:
              'Current synced row is not visible in the leaderboard feed yet.',
            label: 'Leaderboard',
            status: 'missing',
          },
    ],
  };
};

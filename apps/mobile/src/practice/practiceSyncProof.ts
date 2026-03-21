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
            label: 'Historia wynikow',
            status: 'ready',
          }
        : {
            detail: 'Swiezy zsynchronizowany wynik nie jest jeszcze widoczny w historii ucznia.',
            label: 'Historia wynikow',
            status: 'missing',
          },
      hasOperationProgress
        ? {
            detail: lessonMastery
              ? `Opanowanie ${lessonMastery.masteryPercent}% · gier ${progress.gamesPlayed}`
              : `Tryb zapisany lokalnie · gier ${progress.gamesPlayed}`,
            label: 'Postep profilu',
            status: 'ready',
          }
        : {
            detail: 'Lokalny postep nie pokazuje jeszcze tego trybu w opanowaniu lekcji.',
            label: 'Postep profilu',
            status: 'missing',
          },
      isVisibleInDailyPlan
        ? {
            detail: 'Swiezy wynik jest widoczny w sekcji ostatnich wynikow uzywanej przez /plan.',
            label: 'Plan dnia',
            status: 'ready',
          }
        : {
            detail: 'Swiezy wynik nie trafil jeszcze do sekcji ostatnich wynikow dla /plan.',
            label: 'Plan dnia',
            status: 'missing',
          },
      leaderboardItem
        ? {
            detail: `${leaderboardItem.rankLabel} ${leaderboardItem.playerName}${
              leaderboardItem.isCurrentUser ? ' · Ty' : ''
            }`,
            label: 'Ranking',
            status: 'ready',
          }
        : {
            detail: 'Biezacy zsynchronizowany wynik nie jest jeszcze widoczny w rankingu.',
            label: 'Ranking',
            status: 'missing',
          },
    ],
  };
};

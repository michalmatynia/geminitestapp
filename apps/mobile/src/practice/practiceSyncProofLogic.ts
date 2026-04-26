import type { KangurPracticeOperation } from '@kangur/core';
import type { KangurProgressState, KangurScore } from '@kangur/contracts/kangur';

type PracticeSyncScoreMatchInput = {
  expectedCorrectAnswers: number;
  expectedTotalQuestions: number;
  operation: KangurPracticeOperation;
  runStartedAt: number;
  scores: KangurScore[];
};

export const findExactPracticeSyncScoreMatches = ({
  expectedCorrectAnswers,
  expectedTotalQuestions,
  operation,
  scores,
}: Omit<PracticeSyncScoreMatchInput, 'runStartedAt'>): KangurScore[] =>
  scores.filter(
    (score) =>
      score.operation === operation &&
      score.correct_answers === expectedCorrectAnswers &&
      score.total_questions === expectedTotalQuestions,
  );

export const canUseRunStartedAt = (runStartedAt: number): boolean =>
  Number.isFinite(runStartedAt) && runStartedAt > 0;

export const wasScoreCreatedAfterRunStart = (
  score: KangurScore,
  runStartedAt: number,
): boolean => {
  const createdAt = Date.parse(score.created_date);
  return Number.isFinite(createdAt) && createdAt >= runStartedAt;
};

export const findExactPracticeSyncScoreMatchCreatedAfterRunStart = (
  scores: KangurScore[],
  runStartedAt: number,
): KangurScore | null =>
  scores.find((score) => wasScoreCreatedAfterRunStart(score, runStartedAt)) ?? null;

export const findMatchingKangurPracticeSyncScore = ({
  expectedCorrectAnswers,
  expectedTotalQuestions,
  operation,
  runStartedAt,
  scores,
}: PracticeSyncScoreMatchInput): KangurScore | null => {
  const exactMatches = findExactPracticeSyncScoreMatches({
    expectedCorrectAnswers,
    expectedTotalQuestions,
    operation,
    scores,
  });

  if (exactMatches.length === 0) {
    return null;
  }

  if (!canUseRunStartedAt(runStartedAt)) {
    return exactMatches[0] ?? null;
  }

  return findExactPracticeSyncScoreMatchCreatedAfterRunStart(exactMatches, runStartedAt);
};

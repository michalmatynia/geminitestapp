/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import { buildKangurCompletedGameOutcome } from './KangurGameRuntimeContext.helpers';

describe('buildKangurCompletedGameOutcome', () => {
  it('returns empty rewards when reward awarding is disabled', () => {
    const result = buildKangurCompletedGameOutcome({
      activeSessionRecommendation: null,
      difficulty: 'medium',
      nextScore: 6,
      operation: 'addition',
      taken: 42,
      totalQuestions: 10,
      allowRewards: false,
    });

    expect(result.awardedXp).toBe(0);
    expect(result.awardedBadges).toEqual([]);
    expect(result.awardedBreakdown).toEqual([]);
    expect(result.dailyQuestToastHint).toBeNull();
    expect(result.nextBadgeToastHint).toBeNull();
    expect(result.recommendationToastHint).toBeNull();
  });
});

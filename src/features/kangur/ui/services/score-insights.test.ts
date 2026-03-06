import { describe, expect, it } from 'vitest';

import type { KangurScoreRecord } from '@/features/kangur/services/ports';

import { SCORE_INSIGHT_WINDOW_DAYS, buildKangurScoreInsights } from './score-insights';

const createScore = (overrides: Partial<KangurScoreRecord> = {}): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Jan',
  score: 8,
  operation: 'addition',
  total_questions: 10,
  correct_answers: 8,
  time_taken: 42,
  created_date: '2026-03-06T12:00:00.000Z',
  created_by: 'jan@example.com',
  ...overrides,
});

describe('buildKangurScoreInsights', () => {
  it('summarizes recent weekly games, trend, and weakest or strongest operations', () => {
    const now = new Date('2026-03-06T15:00:00.000Z');
    const insights = buildKangurScoreInsights(
      [
        createScore({
          id: 'recent-1',
          operation: 'division',
          correct_answers: 5,
          score: 5,
          created_date: '2026-03-06T10:00:00.000Z',
        }),
        createScore({
          id: 'recent-2',
          operation: 'multiplication',
          correct_answers: 10,
          score: 10,
          created_date: '2026-03-05T10:00:00.000Z',
        }),
        createScore({
          id: 'recent-3',
          operation: 'division',
          correct_answers: 6,
          score: 6,
          created_date: '2026-03-04T10:00:00.000Z',
        }),
        createScore({
          id: 'previous-1',
          operation: 'division',
          correct_answers: 3,
          score: 3,
          created_date: '2026-02-25T10:00:00.000Z',
        }),
        createScore({
          id: 'previous-2',
          operation: 'multiplication',
          correct_answers: 4,
          score: 4,
          created_date: '2026-02-24T10:00:00.000Z',
        }),
      ],
      now
    );

    expect(SCORE_INSIGHT_WINDOW_DAYS).toBe(7);
    expect(insights.recentGames).toBe(3);
    expect(insights.recentAverageAccuracy).toBe(70);
    expect(insights.recentPerfectGames).toBe(1);
    expect(insights.trend.direction).toBe('up');
    expect(insights.trend.deltaAccuracy).toBe(35);
    expect(insights.strongestOperation).toMatchObject({
      operation: 'multiplication',
      averageAccuracy: 100,
      attempts: 1,
    });
    expect(insights.weakestOperation).toMatchObject({
      operation: 'division',
      averageAccuracy: 55,
      attempts: 2,
    });
  });

  it('falls back to all loaded scores for operation insights when there is no recent activity', () => {
    const now = new Date('2026-03-20T15:00:00.000Z');
    const insights = buildKangurScoreInsights(
      [
        createScore({
          id: 'older-1',
          operation: 'clock',
          correct_answers: 10,
          score: 10,
          created_date: '2026-03-01T10:00:00.000Z',
        }),
        createScore({
          id: 'older-2',
          operation: 'division',
          correct_answers: 4,
          score: 4,
          created_date: '2026-02-28T10:00:00.000Z',
        }),
      ],
      now
    );

    expect(insights.recentGames).toBe(0);
    expect(insights.trend.direction).toBe('insufficient_data');
    expect(insights.strongestOperation?.operation).toBe('clock');
    expect(insights.weakestOperation?.operation).toBe('division');
  });

  it('returns empty insights when there are no scores', () => {
    expect(buildKangurScoreInsights([], new Date('2026-03-06T12:00:00.000Z'))).toEqual({
      recentGames: 0,
      recentAverageAccuracy: 0,
      recentPerfectGames: 0,
      lastPlayedAt: null,
      trend: {
        direction: 'insufficient_data',
        deltaAccuracy: null,
        recentAverageAccuracy: 0,
        previousAverageAccuracy: null,
      },
      strongestOperation: null,
      weakestOperation: null,
    });
  });
});

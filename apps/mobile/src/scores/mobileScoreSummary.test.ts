import type { KangurScore } from '@kangur/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildKangurMobileOperationPerformance,
  buildKangurMobileScoreSummary,
  filterKangurMobileScores,
  formatKangurMobileScoreFamily,
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreDuration,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreFamily,
  getKangurMobileScoreAccuracyPercent,
  listKangurMobileScoreOperations,
} from './mobileScoreSummary';

const createScore = (overrides: Partial<KangurScore> = {}): KangurScore => ({
  id: 'score-1',
  player_name: 'Ada Learner',
  score: 6,
  operation: 'addition',
  total_questions: 8,
  correct_answers: 6,
  time_taken: 42,
  created_date: '2026-03-20T12:00:00.000Z',
  created_by: 'user-1',
  learner_id: 'learner-1',
  owner_user_id: 'user-1',
  ...overrides,
});

describe('mobileScoreSummary', () => {
  it('builds score history summary across arithmetic, time and logic sessions', () => {
    const summary = buildKangurMobileScoreSummary([
      createScore({
        id: 'score-1',
        operation: 'addition',
        correct_answers: 6,
      }),
      createScore({
        id: 'score-2',
        operation: 'logical_patterns',
        correct_answers: 8,
        score: 8,
      }),
      createScore({
        id: 'score-3',
        operation: 'multiplication',
        correct_answers: 4,
        score: 4,
      }),
      createScore({
        id: 'score-4',
        operation: 'clock',
        correct_answers: 8,
        score: 8,
      }),
    ]);

    expect(summary).toEqual({
      arithmeticSessions: 2,
      averageAccuracyPercent: 81,
      bestAccuracyPercent: 100,
      logicSessions: 1,
      timeSessions: 1,
      totalSessions: 4,
    });
  });

  it('formats mobile score labels consistently', () => {
    expect(formatKangurMobileScoreOperation('logical_reasoning')).toBe(
      'Wnioskowanie',
    );
    expect(formatKangurMobileScoreOperation('clock')).toBe('Zegar');
    expect(formatKangurMobileScoreFamily('time')).toBe('Time practice');
    expect(formatKangurMobileScoreDuration(125)).toBe('2m 05s');
    expect(getKangurMobileScoreAccuracyPercent(createScore())).toBe(75);
    expect(formatKangurMobileScoreDateTime('not-a-date')).toBe('not-a-date');
  });

  it('filters score history by family and operation', () => {
    const scores = [
      createScore({ id: 'score-1', operation: 'addition' }),
      createScore({ id: 'score-2', operation: 'logical_patterns' }),
      createScore({ id: 'score-3', operation: 'multiplication' }),
      createScore({ id: 'score-4', operation: 'calendar' }),
    ];

    expect(
      filterKangurMobileScores(scores, {
        family: 'logic',
      }).map((score) => score.id),
    ).toEqual(['score-2']);
    expect(
      filterKangurMobileScores(scores, {
        family: 'arithmetic',
      }).map((score) => score.id),
    ).toEqual(['score-1', 'score-3']);
    expect(
      filterKangurMobileScores(scores, {
        family: 'time',
      }).map((score) => score.id),
    ).toEqual(['score-4']);
    expect(
      filterKangurMobileScores(scores, {
        operation: 'multiplication',
      }).map((score) => score.id),
    ).toEqual(['score-3']);
    expect(listKangurMobileScoreOperations(scores)).toEqual([
      'addition',
      'logical_patterns',
      'multiplication',
      'calendar',
    ]);
    expect(getKangurMobileScoreFamily(createScore({ operation: 'calendar' }))).toBe(
      'time',
    );
  });

  it('builds operation performance breakdown sorted by average accuracy', () => {
    const breakdown = buildKangurMobileOperationPerformance([
      createScore({
        id: 'score-1',
        operation: 'logical_patterns',
        correct_answers: 8,
        score: 8,
      }),
      createScore({
        id: 'score-2',
        operation: 'addition',
        correct_answers: 6,
        score: 6,
      }),
      createScore({
        id: 'score-4',
        operation: 'clock',
        correct_answers: 8,
        score: 8,
      }),
      createScore({
        id: 'score-3',
        operation: 'addition',
        correct_answers: 4,
        score: 4,
      }),
    ]);

    expect(breakdown).toEqual([
      {
        averageAccuracyPercent: 100,
        bestAccuracyPercent: 100,
        family: 'time',
        operation: 'clock',
        sessions: 1,
      },
      {
        averageAccuracyPercent: 100,
        bestAccuracyPercent: 100,
        family: 'logic',
        operation: 'logical_patterns',
        sessions: 1,
      },
      {
        averageAccuracyPercent: 63,
        bestAccuracyPercent: 75,
        family: 'arithmetic',
        operation: 'addition',
        sessions: 2,
      },
    ]);
  });
});

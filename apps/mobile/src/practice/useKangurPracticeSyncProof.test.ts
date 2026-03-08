import { createDefaultKangurProgressState, type KangurScore } from '@kangur/contracts';
import type { KangurLeaderboardItem } from '@kangur/core';
import { describe, expect, it } from 'vitest';

import { buildKangurPracticeSyncProofSnapshot } from './practiceSyncProof';

const createScore = (overrides: Partial<KangurScore> = {}): KangurScore => ({
  id: 'score-1',
  player_name: 'Ada Learner',
  score: 8,
  operation: 'clock',
  total_questions: 8,
  correct_answers: 8,
  time_taken: 30,
  created_date: '2026-03-20T19:35:28.244Z',
  created_by: 'parent@example.com',
  learner_id: 'learner-1',
  owner_user_id: 'user-1',
  ...overrides,
});

const createLeaderboardItem = (
  overrides: Partial<KangurLeaderboardItem> = {},
): KangurLeaderboardItem => ({
  accountLabel: 'Zalogowany',
  currentUserBadgeLabel: 'Ty',
  id: 'score-1',
  isCurrentUser: true,
  isMedal: true,
  isRegistered: true,
  metaLabel: '🕐 Zegar · Zalogowany',
  operationEmoji: '🕐',
  operationLabel: 'Zegar',
  operationSummary: '🕐 Zegar',
  playerName: 'Ada Learner',
  rank: 1,
  rankLabel: '🥇',
  scoreLabel: '8/8',
  timeLabel: '30s',
  ...overrides,
});

describe('buildKangurPracticeSyncProofSnapshot', () => {
  it('marks all downstream surfaces ready when the synced row is visible everywhere', () => {
    const progress = {
      ...createDefaultKangurProgressState(),
      gamesPlayed: 1,
      operationsPlayed: ['clock'],
      lessonMastery: {
        clock: {
          attempts: 1,
          bestScorePercent: 100,
          completions: 1,
          lastCompletedAt: '2026-03-20T19:35:28.244Z',
          lastScorePercent: 100,
          masteryPercent: 100,
        },
      },
    };

    const snapshot = buildKangurPracticeSyncProofSnapshot({
      expectedCorrectAnswers: 8,
      expectedTotalQuestions: 8,
      leaderboardItems: [createLeaderboardItem()],
      operation: 'clock',
      progress,
      runStartedAt: Date.parse('2026-03-20T19:35:00.000Z'),
      scores: [
        createScore(),
        createScore({
          id: 'score-older',
          created_date: '2026-03-20T18:00:00.000Z',
          operation: 'addition',
        }),
      ],
    });

    expect(snapshot.matchedScoreId).toBe('score-1');
    expect(snapshot.surfaces).toEqual([
      expect.objectContaining({
        label: 'Results history',
        status: 'ready',
      }),
      expect.objectContaining({
        label: 'Profile progress',
        status: 'ready',
      }),
      expect.objectContaining({
        label: 'Daily plan',
        status: 'ready',
      }),
      expect.objectContaining({
        label: 'Leaderboard',
        status: 'ready',
      }),
    ]);
  });

  it('reports missing result propagation when the fresh score row is not yet visible', () => {
    const snapshot = buildKangurPracticeSyncProofSnapshot({
      expectedCorrectAnswers: 8,
      expectedTotalQuestions: 8,
      leaderboardItems: [],
      operation: 'clock',
      progress: createDefaultKangurProgressState(),
      runStartedAt: Date.parse('2026-03-20T19:35:00.000Z'),
      scores: [
        createScore({
          id: 'score-older',
          created_date: '2026-03-20T18:00:00.000Z',
        }),
      ],
    });

    expect(snapshot.matchedScoreId).toBeNull();
    expect(snapshot.surfaces).toEqual([
      expect.objectContaining({
        label: 'Results history',
        status: 'missing',
      }),
      expect.objectContaining({
        label: 'Profile progress',
        status: 'missing',
      }),
      expect.objectContaining({
        label: 'Daily plan',
        status: 'missing',
      }),
      expect.objectContaining({
        label: 'Leaderboard',
        status: 'missing',
      }),
    ]);
  });
});

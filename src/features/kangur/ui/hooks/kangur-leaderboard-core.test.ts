import { describe, expect, it } from 'vitest';

import {
  buildKangurLeaderboardItems,
  filterKangurLeaderboardScores,
} from '@kangur/core';
import type { KangurScore } from '@kangur/contracts/kangur';

const createScore = (overrides: Partial<KangurScore> = {}): KangurScore => ({
  id: 'score-1',
  player_name: 'Ada',
  score: 9,
  operation: 'addition',
  total_questions: 10,
  correct_answers: 9,
  time_taken: 41,
  created_date: '2026-03-07T12:00:00.000Z',
  created_by: 'ada@example.com',
  learner_id: 'learner-1',
  owner_user_id: 'parent-1',
  ...overrides,
});

describe('kangur leaderboard shared helpers', () => {
  it('filters leaderboard scores by operation and account type before limiting', () => {
    const scores = [
      createScore({ id: 'score-1', operation: 'division', created_by: 'ada@example.com' }),
      createScore({ id: 'score-2', operation: 'division', created_by: null }),
      createScore({ id: 'score-3', operation: 'addition', created_by: null }),
    ];

    expect(
      filterKangurLeaderboardScores(scores, {
        limit: 10,
        operationFilter: 'division',
        userFilter: 'anonymous',
      }).map((score) => score.id),
    ).toEqual(['score-2']);
  });

  it('builds leaderboard items with medals and current-user labels', () => {
    const items = buildKangurLeaderboardItems({
      currentUserEmail: 'ada@example.com',
      scores: [
        createScore({ id: 'score-1', player_name: 'Ada', created_by: 'ada@example.com' }),
        createScore({ id: 'score-2', player_name: 'Olek', created_by: null }),
      ],
    });

    expect(items[0]).toMatchObject({
      isCurrentUser: true,
      rankLabel: '🥇',
      scoreLabel: '9/10',
      timeLabel: '41s',
    });
    expect(items[1]).toMatchObject({
      accountLabel: 'Anonim',
      metaLabel: '➕ Dodawanie · Anonim',
      rankLabel: '🥈',
    });
  });

  it('marks learner-scoped scores as current user when matching by learner id', () => {
    const items = buildKangurLeaderboardItems({
      currentLearnerId: 'learner-2',
      scores: [
        createScore({
          id: 'score-1',
          player_name: 'Ada',
          created_by: null,
          learner_id: 'learner-2',
        }),
      ],
    });

    expect(items[0]).toMatchObject({
      isCurrentUser: true,
      accountLabel: 'Anonim',
      currentUserBadgeLabel: 'Ty',
    });
  });
});

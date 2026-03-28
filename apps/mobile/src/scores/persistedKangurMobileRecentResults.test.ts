import { createMemoryKangurClientStorage } from '@kangur/platform';
import { describe, expect, it } from 'vitest';

import {
  persistKangurMobileRecentResults,
  resolvePersistedKangurMobileRecentResults,
} from './persistedKangurMobileRecentResults';

const createScore = (id: string) => ({
  id,
  player_name: 'Ada Learner',
  score: 7,
  operation: 'addition',
  subject: 'maths' as const,
  total_questions: 8,
  correct_answers: 7,
  time_taken: 42,
  xp_earned: 14,
  created_date: `2026-03-2${id.slice(-1)}T08:00:00.000Z`,
  client_mutation_id: null,
  created_by: 'parent@example.com',
  learner_id: 'learner-1',
  owner_user_id: 'parent-1',
});

const INVALID_RECENT_RESULTS_JSON = JSON.stringify({
  'learner:learner-1': [{ id: 'broken-score' }],
});

describe('persistedKangurMobileRecentResults', () => {
  it('persists and resolves recent results for the current score scope', () => {
    const storage = createMemoryKangurClientStorage();

    persistKangurMobileRecentResults({
      identityKey: 'learner:learner-1',
      results: [createScore('score-1'), createScore('score-2')],
      storage,
    });
    persistKangurMobileRecentResults({
      identityKey: 'learner:learner-2',
      results: [createScore('score-3')],
      storage,
    });

    expect(
      resolvePersistedKangurMobileRecentResults({
        identityKey: 'learner:learner-1',
        limit: 3,
        storage,
      }),
    ).toEqual([createScore('score-1'), createScore('score-2')]);
  });

  it('ignores invalid persisted score payloads', () => {
    const storage = createMemoryKangurClientStorage();
    storage.setItem('kangur.mobile.scores.recent', INVALID_RECENT_RESULTS_JSON);

    expect(
      resolvePersistedKangurMobileRecentResults({
        identityKey: 'learner:learner-1',
        limit: 3,
        storage,
      }),
    ).toBeNull();
  });

  it('caps persisted snapshots to the mobile startup slice', () => {
    const storage = createMemoryKangurClientStorage();

    persistKangurMobileRecentResults({
      identityKey: 'learner:learner-1',
      results: [
        createScore('score-1'),
        createScore('score-2'),
        createScore('score-3'),
        createScore('score-4'),
      ],
      storage,
    });

    expect(
      resolvePersistedKangurMobileRecentResults({
        identityKey: 'learner:learner-1',
        limit: 4,
        storage,
      }),
    ).toEqual([
      createScore('score-1'),
      createScore('score-2'),
      createScore('score-3'),
    ]);
  });
});

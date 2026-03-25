import type { KangurClientStorageAdapter } from '@kangur/platform';
import { describe, expect, it, vi } from 'vitest';

import {
  persistKangurMobileHomeDuelInvites,
  resolvePersistedKangurMobileHomeDuelInvites,
} from './persistedKangurMobileHomeDuelInvites';

const createStorage = (
  initialValues: Record<string, string> = {},
): KangurClientStorageAdapter => {
  const values = new Map(Object.entries(initialValues));

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    subscribe: vi.fn(() => () => {}),
  };
};

const createEntry = (sessionId: string, hostLearnerId: string) => ({
  createdAt: '2026-03-21T08:00:00.000Z',
  difficulty: 'medium' as const,
  host: {
    bonusPoints: 0,
    currentQuestionIndex: 0,
    displayName: 'Ada Learner',
    joinedAt: '2026-03-21T08:00:00.000Z',
    learnerId: hostLearnerId,
    score: 0,
    status: 'ready' as const,
  },
  mode: 'challenge' as const,
  operation: 'multiplication' as const,
  questionCount: 5,
  sessionId,
  status: 'waiting' as const,
  timePerQuestionSec: 15,
  updatedAt: '2026-03-21T08:05:00.000Z',
  visibility: 'private' as const,
});

describe('persistedKangurMobileHomeDuelInvites', () => {
  it('persists and restores a learner-scoped private lobby snapshot', () => {
    const storage = createStorage();

    persistKangurMobileHomeDuelInvites({
      entries: [createEntry('invite-1', 'learner-2')],
      learnerIdentity: 'learner-1',
      storage,
    });

    expect(
      resolvePersistedKangurMobileHomeDuelInvites({
        learnerIdentity: 'learner-1',
        storage,
      }),
    ).toEqual([createEntry('invite-1', 'learner-2')]);
  });

  it('ignores invalid persisted private lobby payloads', () => {
    const storage = createStorage({
      'kangur.mobile.home.duels.privateLobby': JSON.stringify({
        'learner-1': [{ sessionId: 'invite-1' }],
      }),
    });

    expect(
      resolvePersistedKangurMobileHomeDuelInvites({
        learnerIdentity: 'learner-1',
        storage,
      }),
    ).toBeNull();
  });
});

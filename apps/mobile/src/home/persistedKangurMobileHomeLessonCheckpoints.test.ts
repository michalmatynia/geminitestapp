import type { KangurClientStorageAdapter } from '@kangur/platform';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  buildPersistedKangurMobileHomeLessonCheckpointSnapshot,
  persistKangurMobileHomeLessonCheckpoints,
  resolveKangurMobileHomeLessonCheckpointIdentity,
  resolvePersistedKangurMobileHomeLessonCheckpoints,
} from './persistedKangurMobileHomeLessonCheckpoints';

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

const INVALID_GUEST_CHECKPOINTS_JSON = JSON.stringify({
  guest: {
    adding: {
      attempts: 3,
    },
  },
});

describe('persistedKangurMobileHomeLessonCheckpoints', () => {
  it('builds, persists, and restores the latest learner-scoped lesson checkpoints', () => {
    const storage = createStorage({
      'kangur.activeLearnerId': 'learner-1',
    });
    const progress = {
      ...createDefaultKangurProgressState(),
      lessonMastery: {
        adding: {
          attempts: 3,
          bestScorePercent: 72,
          completions: 1,
          lastCompletedAt: '2026-03-21T08:12:00.000Z',
          lastScorePercent: 70,
          masteryPercent: 68,
        },
        clock: {
          attempts: 2,
          bestScorePercent: 84,
          completions: 1,
          lastCompletedAt: '2026-03-22T09:10:00.000Z',
          lastScorePercent: 80,
          masteryPercent: 75,
        },
        multiplication: {
          attempts: 4,
          bestScorePercent: 88,
          completions: 2,
          lastCompletedAt: '2026-03-20T07:00:00.000Z',
          lastScorePercent: 82,
          masteryPercent: 74,
        },
      },
    };

    persistKangurMobileHomeLessonCheckpoints({
      learnerIdentity: resolveKangurMobileHomeLessonCheckpointIdentity(storage),
      snapshot: buildPersistedKangurMobileHomeLessonCheckpointSnapshot({
        progress,
      }),
      storage,
    });

    expect(
      resolvePersistedKangurMobileHomeLessonCheckpoints({
        learnerIdentity: 'learner-1',
        locale: 'pl',
        storage,
      }),
    ).toMatchObject([
      { componentId: 'clock', title: 'Nauka zegara' },
      { componentId: 'adding', title: 'Dodawanie' },
    ]);
  });

  it('falls back to the guest identity and ignores invalid persisted payloads', () => {
    const storage = createStorage({
      'kangur.mobile.home.lessonCheckpoints': INVALID_GUEST_CHECKPOINTS_JSON,
    });

    expect(resolveKangurMobileHomeLessonCheckpointIdentity(storage)).toBe('guest');
    expect(
      resolvePersistedKangurMobileHomeLessonCheckpoints({
        learnerIdentity: 'guest',
        locale: 'pl',
        storage,
      }),
    ).toBeNull();
  });
});

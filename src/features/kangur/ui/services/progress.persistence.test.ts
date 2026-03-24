/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultKangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';

import {
  KANGUR_PROGRESS_OWNER_STORAGE_KEY,
  KANGUR_PROGRESS_STORAGE_KEY,
} from './progress.contracts';

const createProgress = (
  overrides: Partial<ReturnType<typeof createDefaultKangurProgressState>> = {}
) => ({
  ...createDefaultKangurProgressState(),
  ...overrides,
});

describe('progress persistence owner scoping', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('retains separate local progress snapshots for each learner', async () => {
    const { loadProgress, saveProgress, saveProgressOwnerKey } =
      await import('@/features/kangur/ui/services/progress');

    saveProgressOwnerKey('learner-1');
    saveProgress(
      createProgress({
        totalXp: 120,
        gamesPlayed: 5,
      }),
      { ownerKey: 'learner-1' }
    );

    saveProgressOwnerKey('learner-2');
    saveProgress(
      createProgress({
        totalXp: 45,
        gamesPlayed: 2,
      }),
      { ownerKey: 'learner-2' }
    );

    expect(loadProgress({ ownerKey: 'learner-1' }).totalXp).toBe(120);
    expect(loadProgress({ ownerKey: 'learner-1' }).gamesPlayed).toBe(5);
    expect(loadProgress({ ownerKey: 'learner-2' }).totalXp).toBe(45);
    expect(loadProgress({ ownerKey: 'learner-2' }).gamesPlayed).toBe(2);
  });

  it('uses the active owner scope for default progress reads instead of stale persisted owner metadata', async () => {
    const { loadProgress, saveProgress, saveProgressOwnerKey, setProgressOwnerKey } =
      await import('@/features/kangur/ui/services/progress');

    saveProgressOwnerKey('learner-1');
    saveProgress(
      createProgress({
        totalXp: 120,
      }),
      { ownerKey: 'learner-1' }
    );
    saveProgress(
      createProgress({
        totalXp: 45,
      }),
      { ownerKey: 'learner-2' }
    );

    setProgressOwnerKey('learner-2');
    expect(loadProgress().totalXp).toBe(45);

    setProgressOwnerKey(null);
    expect(loadProgress().totalXp).toBe(0);
  });

  it('keeps the live owner scope in sync when the persisted owner key changes', async () => {
    const { getProgressOwnerKey, saveProgressOwnerKey } =
      await import('@/features/kangur/ui/services/progress');

    saveProgressOwnerKey('learner-1');
    expect(getProgressOwnerKey()).toBe('learner-1');

    saveProgressOwnerKey(null);
    expect(getProgressOwnerKey()).toBeNull();
  });

  it('switches the default progress snapshot when subject and owner scope change together', async () => {
    const {
      getProgressOwnerKey,
      getProgressSubject,
      loadProgress,
      saveProgress,
      setProgressScope,
    } = await import('@/features/kangur/ui/services/progress');

    saveProgress(
      createProgress({
        totalXp: 10,
        gamesPlayed: 1,
      }),
      { ownerKey: 'learner-1' }
    );

    setProgressScope({ subject: 'english', ownerKey: 'learner-1' });
    saveProgress(
      createProgress({
        totalXp: 24,
        gamesPlayed: 3,
      }),
      { ownerKey: 'learner-1' }
    );

    setProgressScope({ subject: 'maths', ownerKey: 'learner-2' });
    saveProgress(
      createProgress({
        totalXp: 41,
        gamesPlayed: 5,
      }),
      { ownerKey: 'learner-2' }
    );

    setProgressScope({ subject: 'english', ownerKey: ' learner-1 ' });

    expect(getProgressOwnerKey()).toBe('learner-1');
    expect(getProgressSubject()).toBe('english');
    expect(loadProgress().totalXp).toBe(24);
    expect(loadProgress().gamesPlayed).toBe(3);

    setProgressScope({ subject: 'maths', ownerKey: 'learner-2' });

    expect(getProgressOwnerKey()).toBe('learner-2');
    expect(getProgressSubject()).toBe('maths');
    expect(loadProgress().totalXp).toBe(41);
    expect(loadProgress().gamesPlayed).toBe(5);
  });

  it('emits the scoped snapshot when the active progress scope changes', async () => {
    const { saveProgress, setProgressScope, subscribeToProgress } =
      await import('@/features/kangur/ui/services/progress');

    saveProgress(
      createProgress({
        totalXp: 8,
      }),
      { ownerKey: 'learner-1' }
    );

    setProgressScope({ subject: 'english', ownerKey: 'learner-1' });
    saveProgress(
      createProgress({
        totalXp: 19,
        lessonsCompleted: 2,
      }),
      { ownerKey: 'learner-1' }
    );

    const listener = vi.fn();
    const unsubscribe = subscribeToProgress(listener);

    setProgressScope({ subject: 'maths', ownerKey: 'learner-1' });
    setProgressScope({ subject: 'english', ownerKey: 'learner-1' });

    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        totalXp: 19,
        lessonsCompleted: 2,
      })
    );

    unsubscribe();
  });

  it('migrates legacy shared progress into the previous owner slot without leaking it to another learner', async () => {
    localStorage.setItem(KANGUR_PROGRESS_OWNER_STORAGE_KEY, 'learner-1');
    localStorage.setItem(
      KANGUR_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        subjects: {
          alphabet: {
            totalXp: 77,
            gamesPlayed: 3,
          },
          art: {},
          music: {},
          geometry: {},
          maths: {},
          english: {},
          web_development: {},
          agentic_coding: {},
        },
      })
    );

    const { loadProgress } = await import('@/features/kangur/ui/services/progress');

    expect(loadProgress({ ownerKey: 'learner-2' }).totalXp).toBe(0);
    expect(loadProgress({ ownerKey: 'learner-2' }).gamesPlayed).toBe(0);
    expect(loadProgress({ ownerKey: 'learner-1' }).totalXp).toBe(77);
    expect(loadProgress({ ownerKey: 'learner-1' }).gamesPlayed).toBe(3);

    expect(JSON.parse(localStorage.getItem(KANGUR_PROGRESS_STORAGE_KEY) ?? '{}')).toEqual(
      expect.objectContaining({
        version: 2,
        owners: expect.objectContaining({
          'learner-1': expect.objectContaining({
            subjects: expect.objectContaining({
              alphabet: expect.objectContaining({
                totalXp: 77,
                gamesPlayed: 3,
              }),
            }),
          }),
        }),
      })
    );
  });
});

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

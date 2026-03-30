/**
 * @vitest-environment jsdom
 */

import { createKangurProgressStore } from '@kangur/core';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createMobileDevelopmentKangurStorage,
  resetMobileDevelopmentKangurStorage,
} from './createMobileDevelopmentKangurStorage';

const expectLessonMasteryProgress = (masteryPercent: number, attempts: number) =>
  expect.objectContaining({
    masteryPercent,
    attempts,
  });

describe('createMobileDevelopmentKangurStorage on web', () => {
  beforeEach(() => {
    localStorage.clear();
    resetMobileDevelopmentKangurStorage();
  });

  it('persists values across browser adapter recreation', () => {
    const firstStorage = createMobileDevelopmentKangurStorage();
    firstStorage.setItem('kangur.activeLearnerId', 'learner-1');

    const recreatedStorage = createMobileDevelopmentKangurStorage();

    expect(recreatedStorage.getItem('kangur.activeLearnerId')).toBe('learner-1');
  });

  it('preserves progress snapshots across browser runtime recreation', () => {
    const firstStorage = createMobileDevelopmentKangurStorage();
    const firstStore = createKangurProgressStore({
      storage: firstStorage,
      progressStorageKey: 'sprycio_progress',
      ownerStorageKey: 'sprycio_progress_owner',
    });
    const updatedProgress = {
      ...createDefaultKangurProgressState(),
      totalXp: 50,
      lessonsCompleted: 1,
      lessonMastery: {
        logical_patterns: {
          attempts: 1,
          completions: 1,
          masteryPercent: 100,
          bestScorePercent: 100,
          lastScorePercent: 100,
          lastCompletedAt: '2026-03-20T12:00:00.000Z',
        },
      },
    };

    firstStore.saveProgress(updatedProgress);
    resetMobileDevelopmentKangurStorage();

    const recreatedStorage = createMobileDevelopmentKangurStorage();
    const recreatedStore = createKangurProgressStore({
      storage: recreatedStorage,
      progressStorageKey: 'sprycio_progress',
      ownerStorageKey: 'sprycio_progress_owner',
    });

    expect(recreatedStore.loadProgress()).toMatchObject({
      totalXp: 50,
      lessonsCompleted: 1,
      lessonMastery: {
        logical_patterns: expectLessonMasteryProgress(100, 1),
      },
    });
  });
});

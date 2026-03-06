import { describe, expect, it } from 'vitest';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

import {
  XP_REWARDS,
  buildLessonMasteryUpdate,
  createLessonPracticeReward,
  mergeProgressStates,
} from './progress';

describe('kangur progress mastery helpers', () => {
  it('builds a lesson mastery entry from a completed lesson attempt', () => {
    const progress = createDefaultKangurProgressState();

    const updated = buildLessonMasteryUpdate(progress, 'clock', 60, '2026-03-06T10:00:00.000Z');

    expect(updated['clock']).toEqual({
      attempts: 1,
      completions: 1,
      masteryPercent: 60,
      bestScorePercent: 60,
      lastScorePercent: 60,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    });
  });

  it('creates a standard lesson practice reward with mastery and lesson completion updates', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonPracticeReward(progress, 'adding', 4, 6);

    expect(reward.xp).toBe(XP_REWARDS.great_game);
    expect(reward.scorePercent).toBe(67);
    expect(reward.progressUpdates.lessonsCompleted).toBe(1);
    expect(reward.progressUpdates.lessonMastery?.['adding']).toEqual({
      attempts: 1,
      completions: 1,
      masteryPercent: 67,
      bestScorePercent: 67,
      lastScorePercent: 67,
      lastCompletedAt: expect.any(String),
    });
  });

  it('uses the perfect-game reward when lesson practice finishes with a full score', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonPracticeReward(progress, 'division', 7, 7);

    expect(reward.xp).toBe(XP_REWARDS.perfect_game);
    expect(reward.scorePercent).toBe(100);
    expect(reward.progressUpdates.lessonMastery?.['division']).toEqual({
      attempts: 1,
      completions: 1,
      masteryPercent: 100,
      bestScorePercent: 100,
      lastScorePercent: 100,
      lastCompletedAt: expect.any(String),
    });
  });

  it('falls back to the baseline reward when lesson practice stays below the mastery threshold', () => {
    const progress = createDefaultKangurProgressState();

    const reward = createLessonPracticeReward(progress, 'subtracting', 2, 6);

    expect(reward.xp).toBe(XP_REWARDS.good_game);
    expect(reward.scorePercent).toBe(33);
    expect(reward.progressUpdates.lessonMastery?.['subtracting']?.masteryPercent).toBe(33);
  });

  it('merges lesson mastery by keeping the latest mastery snapshot and the best score', () => {
    const remote = {
      ...createDefaultKangurProgressState(),
      lessonMastery: {
        clock: {
          attempts: 2,
          completions: 2,
          masteryPercent: 68,
          bestScorePercent: 90,
          lastScorePercent: 70,
          lastCompletedAt: '2026-03-05T10:00:00.000Z',
        },
      },
    };
    const local = {
      ...createDefaultKangurProgressState(),
      lessonMastery: {
        clock: {
          attempts: 3,
          completions: 3,
          masteryPercent: 82,
          bestScorePercent: 82,
          lastScorePercent: 82,
          lastCompletedAt: '2026-03-06T10:00:00.000Z',
        },
        geometry_shapes: {
          attempts: 1,
          completions: 1,
          masteryPercent: 60,
          bestScorePercent: 60,
          lastScorePercent: 60,
          lastCompletedAt: '2026-03-06T11:00:00.000Z',
        },
      },
    };

    const merged = mergeProgressStates(remote, local);

    expect(merged.lessonMastery['clock']).toEqual({
      attempts: 3,
      completions: 3,
      masteryPercent: 82,
      bestScorePercent: 90,
      lastScorePercent: 82,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    });
    expect(merged.lessonMastery['geometry_shapes']).toEqual(local.lessonMastery['geometry_shapes']);
  });
});

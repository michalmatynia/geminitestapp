import { describe, expect, it } from 'vitest';

import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

import { buildLessonMasteryUpdate, mergeProgressStates } from './progress';

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

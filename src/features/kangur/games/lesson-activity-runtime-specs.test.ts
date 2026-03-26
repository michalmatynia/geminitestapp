import { describe, expect, it } from 'vitest';

import { createDefaultKangurGames } from './defaults';
import {
  getKangurLessonActivityRuntimeSpec,
  KANGUR_LESSON_ACTIVITY_RUNTIME_SPECS,
} from './lesson-activity-runtime-specs';
import { KANGUR_LESSON_ACTIVITY_IDS } from '@/features/kangur/shared/contracts/kangur';
import { kangurLessonActivityRuntimeSpecSchema } from '@/shared/contracts/kangur-games';

describe('lesson activity runtime specs', () => {
  it('covers every lesson activity with a schema-valid serializable runtime spec', () => {
    expect(Object.keys(KANGUR_LESSON_ACTIVITY_RUNTIME_SPECS).sort()).toEqual(
      [...KANGUR_LESSON_ACTIVITY_IDS].sort()
    );

    for (const activityId of KANGUR_LESSON_ACTIVITY_IDS) {
      const spec = getKangurLessonActivityRuntimeSpec(activityId);

      expect(spec.activityId).toBe(activityId);
      expect(spec.engineId).toBeTruthy();
      expect(kangurLessonActivityRuntimeSpecSchema.parse(spec)).toEqual(spec);
    }
  });

  it('keeps seeded inline lesson variants pointed at runtime specs instead of local component maps', () => {
    const lessonInlineVariants = createDefaultKangurGames().flatMap((game) =>
      game.variants.filter((variant) => variant.surface === 'lesson_inline')
    );

    expect(lessonInlineVariants.length).toBeGreaterThan(0);
    expect(
      lessonInlineVariants
        .filter((variant) => Boolean(variant.legacyActivityId))
        .every((variant) => Boolean(variant.lessonActivityRuntimeId))
    ).toBe(true);
    expect(
      lessonInlineVariants.map((variant) => variant.lessonActivityRuntimeId).filter(Boolean)
    ).toEqual(expect.arrayContaining(['clock-training', 'division-game']));
  });
});

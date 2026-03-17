import { describe, expect, it } from 'vitest';

import {
  KANGUR_LESSON_ACTIVITY_IDS,
  KANGUR_LESSON_ACTIVITY_TYPES,
} from '@/features/kangur/shared/contracts/kangur';

import {
  KANGUR_LESSON_ACTIVITY_DEFINITIONS,
  applyKangurLessonActivityDefaults,
} from './lesson-activities';

describe('kangur lesson activities', () => {
  it('describes the clock training activity as segmented practice', () => {
    expect(applyKangurLessonActivityDefaults('clock-training')).toEqual({
      activityId: 'clock-training',
      title: 'Ćwiczenie z zegarem',
      description:
        'Ćwicz osobno godziny, minuty i pełny czas na zegarze analogowym w sekcjach treningowych.',
    });
  });

  it('assigns a game type to every lesson activity', () => {
    expect(Object.keys(KANGUR_LESSON_ACTIVITY_DEFINITIONS).sort()).toEqual(
      [...KANGUR_LESSON_ACTIVITY_IDS].sort()
    );

    const typeSet = new Set(KANGUR_LESSON_ACTIVITY_TYPES);
    Object.entries(KANGUR_LESSON_ACTIVITY_DEFINITIONS).forEach(([id, definition]) => {
      expect(definition.id).toBe(id);
      expect(typeSet.has(definition.type)).toBe(true);
    });
  });
});

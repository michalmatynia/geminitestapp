import { describe, expect, it } from 'vitest';

import { applyKangurLessonActivityDefaults } from './lesson-activities';

describe('kangur lesson activities', () => {
  it('describes the clock training activity as segmented practice', () => {
    expect(applyKangurLessonActivityDefaults('clock-training')).toEqual({
      activityId: 'clock-training',
      title: 'Ćwiczenie z zegarem',
      description:
        'Ćwicz osobno godziny, minuty i pełny czas na zegarze analogowym w sekcjach treningowych.',
    });
  });
});

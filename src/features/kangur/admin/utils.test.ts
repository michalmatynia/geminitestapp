import { describe, expect, it } from 'vitest';

import { getLessonRecipeFamily, readLessonGroupCount } from './utils';

describe('getLessonRecipeFamily', () => {
  it('maps time lesson components to the time family', () => {
    expect(getLessonRecipeFamily('clock')).toBe('time');
    expect(getLessonRecipeFamily('calendar')).toBe('time');
  });

  it('maps arithmetic and geometry lesson components to their families', () => {
    expect(getLessonRecipeFamily('multiplication')).toBe('arithmetic');
    expect(getLessonRecipeFamily('geometry_perimeter')).toBe('geometry');
  });

  it('falls back to logic for english and unknown components', () => {
    expect(getLessonRecipeFamily('english_sentence_structure')).toBe('logic');
    expect(getLessonRecipeFamily(null)).toBe('logic');
  });
});

describe('readLessonGroupCount', () => {
  it('reads finite lesson counts from nested lesson-group metadata', () => {
    expect(
      readLessonGroupCount({
        kangurLessonGroup: {
          lessonCount: 4,
        },
      })
    ).toBe(4);
  });

  it('returns null for missing, array, and non-finite lesson counts', () => {
    expect(readLessonGroupCount(null)).toBeNull();
    expect(readLessonGroupCount([])).toBeNull();
    expect(
      readLessonGroupCount({
        kangurLessonGroup: {
          lessonCount: Number.NaN,
        },
      })
    ).toBeNull();
    expect(
      readLessonGroupCount({
        kangurLessonGroup: [],
      })
    ).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import {
  applyLessonTemplateToFormData,
  getLessonRecipeFamily,
  readLessonGroupCount,
  toLessonFormData,
  toLocalizedLessonFormData,
} from './utils';

const buildLesson = (overrides: Record<string, unknown> = {}) =>
  ({
    componentId: 'clock',
    contentMode: 'document',
    subject: 'math',
    ageGroup: '7_9',
    title: 'Original title',
    description: 'Original description',
    emoji: '⏰',
    color: '#123456',
    activeBg: '#654321',
    enabled: true,
    ...overrides,
  }) as any;

const buildTemplate = (overrides: Record<string, unknown> = {}) =>
  ({
    componentId: 'calendar',
    subject: 'logic',
    ageGroup: '10_12',
    label: 'Template label',
    title: 'Template title',
    description: 'Template description',
    emoji: '📅',
    color: '#abcdef',
    activeBg: '#fedcba',
    sortOrder: 0,
    ...overrides,
  }) as any;

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

describe('lesson form helpers', () => {
  it('maps raw lesson fields into editable lesson form data', () => {
    expect(toLessonFormData(buildLesson())).toEqual({
      componentId: 'clock',
      contentMode: 'document',
      subject: 'math',
      ageGroup: '7_9',
      title: 'Original title',
      description: 'Original description',
      emoji: '⏰',
      color: '#123456',
      activeBg: '#654321',
      enabled: true,
    });
  });

  it('applies localized template overrides while preserving missing age groups', () => {
    expect(
      toLocalizedLessonFormData(buildLesson(), buildTemplate({ ageGroup: undefined }))
    ).toEqual({
      componentId: 'clock',
      contentMode: 'document',
      subject: 'logic',
      ageGroup: '7_9',
      title: 'Template title',
      description: 'Template description',
      emoji: '📅',
      color: '#abcdef',
      activeBg: '#fedcba',
      enabled: true,
    });
  });

  it('applies lesson templates to form data while switching the component id', () => {
    expect(
      applyLessonTemplateToFormData(
        {
          componentId: 'clock',
          contentMode: 'document',
          subject: 'math',
          ageGroup: '7_9',
          title: 'Draft title',
          description: 'Draft description',
          emoji: '📝',
          color: '#111111',
          activeBg: '#222222',
          enabled: false,
        },
        buildTemplate({ ageGroup: undefined })
      )
    ).toEqual({
      componentId: 'calendar',
      contentMode: 'document',
      subject: 'logic',
      ageGroup: '7_9',
      title: 'Template title',
      description: 'Template description',
      emoji: '📅',
      color: '#abcdef',
      activeBg: '#fedcba',
      enabled: false,
    });
  });
});

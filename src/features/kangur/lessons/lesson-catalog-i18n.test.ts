import { describe, expect, it } from 'vitest';

import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';

describe('lesson-catalog-i18n', () => {
  it('returns English lesson titles for non-Polish locales when the source copy is the default catalog text', () => {
    expect(getLocalizedKangurLessonTitle('clock', 'en', 'Nauka zegara')).toBe('Clock');
    expect(getLocalizedKangurLessonTitle('clock', 'de', 'Nauka zegara')).toBe('Clock');
  });

  it('keeps custom lesson titles intact instead of overwriting Mongo-edited copy', () => {
    expect(getLocalizedKangurLessonTitle('clock', 'en', 'My custom clock title')).toBe(
      'My custom clock title'
    );
  });

  it('returns English lesson descriptions for non-Polish locales and keeps Polish fallback for pl', () => {
    expect(
      getLocalizedKangurLessonDescription(
        'webdev_react_components',
        'en',
        'Poznaj podstawy komponentów i buduj interfejsy w React 19.2.'
      )
    ).toBe('Learn the basics of components and build interfaces in React 19.2.');

    expect(
      getLocalizedKangurLessonDescription(
        'webdev_react_components',
        'pl',
        'Poznaj podstawy komponentów i buduj interfejsy w React 19.2.'
      )
    ).toBe('Poznaj podstawy komponentów i buduj interfejsy w React 19.2.');
  });

  it('returns English subject labels for non-Polish locales', () => {
    expect(getLocalizedKangurSubjectLabel('maths', 'en')).toBe('Maths');
    expect(getLocalizedKangurSubjectLabel('geometry', 'en')).toBe('Shapes');
    expect(getLocalizedKangurSubjectLabel('english', 'pl')).toBe('Angielski');
  });

  it('returns English age-group labels for non-Polish locales', () => {
    expect(getLocalizedKangurAgeGroupLabel('ten_year_old', 'en')).toBe('Age 10');
    expect(getLocalizedKangurAgeGroupLabel('grown_ups', 'de')).toBe('Adults');
    expect(getLocalizedKangurAgeGroupLabel('six_year_old', 'pl')).toBe('6 lat');
  });
});

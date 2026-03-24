import { describe, expect, it } from 'vitest';

import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonSectionLabel,
  getLocalizedKangurLessonSectionTypeLabel,
  getLocalizedKangurLessonTitle,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';

describe('lesson-catalog-i18n', () => {
  it('returns locale-specific lesson titles when the source copy is the default catalog text', () => {
    expect(getLocalizedKangurLessonTitle('clock', 'en', 'Nauka zegara')).toBe('Clock');
    expect(getLocalizedKangurLessonTitle('clock', 'de', 'Nauka zegara')).toBe('Uhr');
    expect(getLocalizedKangurLessonTitle('clock', 'uk', 'Nauka zegara')).toBe('Годинник');
    expect(getLocalizedKangurLessonTitle('art_shapes_basic', 'de', 'Basic shapes')).toBe(
      'Grundformen'
    );
    expect(getLocalizedKangurLessonTitle('music_diatonic_scale', 'en', 'Skala diatoniczna')).toBe(
      'Diatonic scale'
    );
    expect(getLocalizedKangurLessonTitle('english_articles', 'uk', 'English: Articles')).toBe(
      'Англійська: артиклі'
    );
    expect(getLocalizedKangurLessonTitle('english_adjectives', 'de', 'English: Adjectives')).toBe(
      'Englisch: Adjektive'
    );
    expect(
      getLocalizedKangurLessonTitle(
        'english_adverbs_frequency',
        'en',
        'English: Adverbs of Frequency'
      )
    ).toBe('English: Adverbs of Frequency');
  });

  it('keeps custom lesson titles intact instead of overwriting Mongo-edited copy', () => {
    expect(getLocalizedKangurLessonTitle('clock', 'en', 'My custom clock title')).toBe(
      'My custom clock title'
    );
  });

  it('returns localized lesson descriptions for English, German, and Ukrainian core lessons and keeps Polish fallback for pl', () => {
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
        'de',
        'Poznaj podstawy komponentów i buduj interfejsy w React 19.2.'
      )
    ).toBe('Lerne die Grundlagen von Komponenten und baue Oberflaechen in React 19.2.');

    expect(
      getLocalizedKangurLessonDescription(
        'webdev_react_components',
        'pl',
        'Poznaj podstawy komponentów i buduj interfejsy w React 19.2.'
      )
    ).toBe('Poznaj podstawy komponentów i buduj interfejsy w React 19.2.');

    expect(
      getLocalizedKangurLessonDescription(
        'clock',
        'uk',
        'Godziny, minuty i pełny czas na zegarze analogowym'
      )
    ).toBe('Години, хвилини й точний час на аналоговому годиннику.');

    expect(
      getLocalizedKangurLessonDescription(
        'music_diatonic_scale',
        'de',
        'Poznaj siedem dźwięków skali diatonicznej, śpiewaj je po kolei i wskaż, czy melodia idzie w górę czy w dół.'
      )
    ).toContain('diatonischen Tonleiter');
    expect(
      getLocalizedKangurLessonDescription(
        'english_adjectives',
        'en',
        'Opisywanie osób, miejsc i rzeczy oraz kolejność przymiotników'
      )
    ).toContain('adjective order');
    expect(
      getLocalizedKangurLessonDescription(
        'english_adverbs_frequency',
        'de',
        'Always, usually, sometimes i never w codziennych rutynach'
      )
    ).toContain('Routinen');
  });

  it('returns Ukrainian technical lesson metadata for grown-ups lesson catalogs', () => {
    expect(getLocalizedKangurLessonTitle('webdev_react_components', 'uk', 'Component Basics')).toBe(
      'Основи компонентів'
    );

    expect(
      getLocalizedKangurLessonDescription(
        'webdev_react_components',
        'uk',
        'Poznaj podstawy komponentów i buduj interfejsy w React 19.2.'
      )
    ).toBe('Вивчіть основи компонентів і будуйте інтерфейси в React 19.2.');

    expect(
      getLocalizedKangurLessonTitle(
        'agentic_coding_codex_5_4',
        'uk',
        'Agentic Coding Foundations'
      )
    ).toBe('Основи агентного програмування');
  });

  it('returns localized subject labels for English, German, and Ukrainian locales', () => {
    expect(getLocalizedKangurSubjectLabel('maths', 'en')).toBe('Maths');
    expect(getLocalizedKangurSubjectLabel('art', 'en')).toBe('Art');
    expect(getLocalizedKangurSubjectLabel('art', 'de')).toBe('Kunst');
    expect(getLocalizedKangurSubjectLabel('art', 'uk')).toBe('Мистецтво');
    expect(getLocalizedKangurSubjectLabel('music', 'en')).toBe('Music');
    expect(getLocalizedKangurSubjectLabel('music', 'de')).toBe('Musik');
    expect(getLocalizedKangurSubjectLabel('music', 'uk')).toBe('Музика');
    expect(getLocalizedKangurSubjectLabel('geometry', 'en')).toBe('Shapes');
    expect(getLocalizedKangurSubjectLabel('geometry', 'de')).toBe('Formen');
    expect(getLocalizedKangurSubjectLabel('geometry', 'uk')).toBe('Фігури');
    expect(getLocalizedKangurSubjectLabel('english', 'pl')).toBe('Angielski');
  });

  it('returns localized age-group labels for English, German, and Ukrainian locales', () => {
    expect(getLocalizedKangurAgeGroupLabel('ten_year_old', 'en')).toBe('Age 10');
    expect(getLocalizedKangurAgeGroupLabel('grown_ups', 'de')).toBe('Erwachsene');
    expect(getLocalizedKangurAgeGroupLabel('six_year_old', 'uk')).toBe('6 років');
    expect(getLocalizedKangurAgeGroupLabel('six_year_old', 'pl')).toBe('6 lat');
  });

  it('returns localized lesson section labels while keeping Polish in pl', () => {
    expect(getLocalizedKangurLessonSectionLabel('art_colors', 'en', 'Colors')).toBe('Colors');
    expect(getLocalizedKangurLessonSectionLabel('art_shapes_basic', 'de', 'Basic shapes')).toBe(
      'Grundformen'
    );
    expect(
      getLocalizedKangurLessonSectionLabel('art_colors_harmony', 'uk', 'Harmony of colors')
    ).toBe('Гармонія кольорів');
    expect(getLocalizedKangurLessonSectionLabel('music_scale', 'en', 'Skala')).toBe('Scale');
    expect(
      getLocalizedKangurLessonSectionLabel('music_diatonic_scale', 'de', 'Skala diatoniczna')
    ).toBe('Diatonische Tonleiter');
    expect(getLocalizedKangurLessonSectionLabel('maths_geometry', 'en', 'Geometria')).toBe(
      'Geometry'
    );
    expect(
      getLocalizedKangurLessonSectionLabel(
        'english_grammar_adverbs_frequency',
        'en',
        'Przysłówki częstotliwości'
      )
    ).toBe('Adverbs of frequency');
    expect(
      getLocalizedKangurLessonSectionLabel('alphabet_matching', 'de', 'Dopasuj litery')
    ).toBe('Buchstaben zuordnen');
    expect(getLocalizedKangurLessonSectionLabel('maths_geometry', 'uk', 'Geometria')).toBe(
      'Геометрія'
    );
    expect(getLocalizedKangurLessonSectionLabel('maths_geometry', 'pl', 'Geometria')).toBe(
      'Geometria'
    );
  });

  it('returns localized section type labels for English, German, and Ukrainian routes and keeps Polish defaults in pl', () => {
    expect(getLocalizedKangurLessonSectionTypeLabel('en', 'Gra')).toBe('Game');
    expect(getLocalizedKangurLessonSectionTypeLabel('de', 'Lekcja')).toBe('Lektion');
    expect(getLocalizedKangurLessonSectionTypeLabel('uk', 'Section')).toBe('Розділ');
    expect(getLocalizedKangurLessonSectionTypeLabel('pl', 'Gra')).toBe('Gra');
  });
});

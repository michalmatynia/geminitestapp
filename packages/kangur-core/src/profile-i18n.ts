import { KANGUR_LESSON_CATALOG } from './lesson-catalog';

export type KangurCoreLocale = 'pl' | 'en' | 'de';

type KangurCoreLocalizedValue = Record<KangurCoreLocale, string>;

type KangurCoreOperationInfo = {
  emoji: string;
  label: KangurCoreLocalizedValue;
};

const KANGUR_CORE_OPERATION_INFO: Record<string, KangurCoreOperationInfo> = {
  addition: {
    emoji: '➕',
    label: {
      de: 'Addition',
      en: 'Addition',
      pl: 'Dodawanie',
    },
  },
  subtraction: {
    emoji: '➖',
    label: {
      de: 'Subtraktion',
      en: 'Subtraction',
      pl: 'Odejmowanie',
    },
  },
  multiplication: {
    emoji: '✖️',
    label: {
      de: 'Multiplikation',
      en: 'Multiplication',
      pl: 'Mnozenie',
    },
  },
  division: {
    emoji: '➗',
    label: {
      de: 'Division',
      en: 'Division',
      pl: 'Dzielenie',
    },
  },
  calendar: {
    emoji: '📅',
    label: {
      de: 'Kalender',
      en: 'Calendar',
      pl: 'Kalendarz',
    },
  },
  decimals: {
    emoji: '🔢',
    label: {
      de: 'Brueche',
      en: 'Fractions',
      pl: 'Ulamki',
    },
  },
  powers: {
    emoji: '⚡',
    label: {
      de: 'Potenzen',
      en: 'Powers',
      pl: 'Potegi',
    },
  },
  roots: {
    emoji: '√',
    label: {
      de: 'Wurzeln',
      en: 'Roots',
      pl: 'Pierwiastki',
    },
  },
  clock: {
    emoji: '🕐',
    label: {
      de: 'Uhr',
      en: 'Clock',
      pl: 'Zegar',
    },
  },
  mixed: {
    emoji: '🎲',
    label: {
      de: 'Gemischt',
      en: 'Mixed',
      pl: 'Mieszane',
    },
  },
  logical_thinking: {
    emoji: '🧠',
    label: {
      de: 'Logisches Denken',
      en: 'Logical thinking',
      pl: 'Myslenie logiczne',
    },
  },
  logical_patterns: {
    emoji: '🔢',
    label: {
      de: 'Muster',
      en: 'Patterns',
      pl: 'Wzorce i ciagi',
    },
  },
  logical_classification: {
    emoji: '📦',
    label: {
      de: 'Klassifikation',
      en: 'Classification',
      pl: 'Klasyfikacja',
    },
  },
  logical_reasoning: {
    emoji: '💡',
    label: {
      de: 'Schlussfolgern',
      en: 'Reasoning',
      pl: 'Wnioskowanie',
    },
  },
  logical_analogies: {
    emoji: '🔗',
    label: {
      de: 'Analogien',
      en: 'Analogies',
      pl: 'Analogie',
    },
  },
};

const KANGUR_CORE_LESSON_TITLES: Record<string, KangurCoreLocalizedValue> = {
  clock: {
    de: 'Uhr',
    en: 'Clock',
    pl: 'Nauka zegara',
  },
  calendar: {
    de: 'Kalender',
    en: 'Calendar',
    pl: 'Nauka kalendarza',
  },
  adding: {
    de: 'Addition',
    en: 'Addition',
    pl: 'Dodawanie',
  },
  subtracting: {
    de: 'Subtraktion',
    en: 'Subtraction',
    pl: 'Odejmowanie',
  },
  multiplication: {
    de: 'Multiplikation',
    en: 'Multiplication',
    pl: 'Mnozenie',
  },
  division: {
    de: 'Division',
    en: 'Division',
    pl: 'Dzielenie',
  },
  geometry_basics: {
    de: 'Grundlagen der Geometrie',
    en: 'Geometry basics',
    pl: 'Podstawy geometrii',
  },
  geometry_shapes: {
    de: 'Geometrische Formen',
    en: 'Geometric shapes',
    pl: 'Figury geometryczne',
  },
  geometry_symmetry: {
    de: 'Symmetrie',
    en: 'Symmetry',
    pl: 'Symetria',
  },
  geometry_perimeter: {
    de: 'Umfang',
    en: 'Perimeter',
    pl: 'Obwód figur',
  },
  logical_thinking: {
    de: 'Logisches Denken',
    en: 'Logical thinking',
    pl: 'Myslenie logiczne',
  },
  logical_patterns: {
    de: 'Muster',
    en: 'Patterns',
    pl: 'Wzorce i ciagi',
  },
  logical_classification: {
    de: 'Klassifikation',
    en: 'Classification',
    pl: 'Klasyfikacja',
  },
  logical_reasoning: {
    de: 'Schlussfolgern',
    en: 'Reasoning',
    pl: 'Wnioskowanie',
  },
  logical_analogies: {
    de: 'Analogien',
    en: 'Analogies',
    pl: 'Analogie',
  },
};

const KANGUR_CORE_LEVEL_TITLES: Record<number, KangurCoreLocalizedValue> = {
  1: {
    de: 'Anfaenger 🐣',
    en: 'Beginner 🐣',
    pl: 'Raczkujący 🐣',
  },
  2: {
    de: 'Schueler ✏️',
    en: 'Student ✏️',
    pl: 'Uczeń ✏️',
  },
  3: {
    de: 'Denker 🤔',
    en: 'Thinker 🤔',
    pl: 'Myśliciel 🤔',
  },
  4: {
    de: 'Zahlenmeister 🔢',
    en: 'Number master 🔢',
    pl: 'Liczmistrz 🔢',
  },
  5: {
    de: 'Mathematiker 📐',
    en: 'Mathematician 📐',
    pl: 'Matematyk 📐',
  },
  6: {
    de: 'Genie 🧠',
    en: 'Genius 🧠',
    pl: 'Geniusz 🧠',
  },
  7: {
    de: 'Legende 🏆',
    en: 'Legend 🏆',
    pl: 'Legenda 🏆',
  },
};

const KANGUR_CORE_WEEKDAY_LABELS: Record<KangurCoreLocale, string[]> = {
  de: ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  pl: ['niedz.', 'pon.', 'wt.', 'sr.', 'czw.', 'pt.', 'sob.'],
};

export const normalizeKangurCoreLocale = (
  locale?: string | null | undefined,
): KangurCoreLocale => {
  if (locale === 'en' || locale === 'de') {
    return locale;
  }

  return 'pl';
};

export const localizeKangurCoreText = (
  value: KangurCoreLocalizedValue,
  locale?: string | null | undefined,
): string => value[normalizeKangurCoreLocale(locale)];

export const getLocalizedKangurCoreOperationInfo = (
  operation: string,
  locale?: string | null | undefined,
): { emoji: string; label: string } => {
  const entry = KANGUR_CORE_OPERATION_INFO[operation];
  if (!entry) {
    return {
      emoji: '❓',
      label: operation,
    };
  }

  return {
    emoji: entry.emoji,
    label: localizeKangurCoreText(entry.label, locale),
  };
};

export const getLocalizedKangurCoreLessonTitle = (
  componentId: string,
  locale?: string | null | undefined,
  fallbackTitle?: string,
): string => {
  const localized = KANGUR_CORE_LESSON_TITLES[componentId];
  if (localized) {
    return localizeKangurCoreText(localized, locale);
  }

  return fallbackTitle ?? KANGUR_LESSON_CATALOG[componentId]?.title ?? componentId;
};

export const getLocalizedKangurCoreLevelTitle = (
  level: number,
  fallbackTitle: string,
  locale?: string | null | undefined,
): string => KANGUR_CORE_LEVEL_TITLES[level]?.[normalizeKangurCoreLocale(locale)] ?? fallbackTitle;

export const getLocalizedKangurCoreWeekdayLabel = (
  dayIndex: number,
  locale?: string | null | undefined,
): string => {
  const safeDayIndex = Math.min(6, Math.max(0, dayIndex));
  return KANGUR_CORE_WEEKDAY_LABELS[normalizeKangurCoreLocale(locale)][safeDayIndex] ?? '';
};

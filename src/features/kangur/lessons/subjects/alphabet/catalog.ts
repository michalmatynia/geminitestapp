import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';

export const ALPHABET_LESSON_COMPONENT_ORDER = [
  'alphabet_basics',
  'alphabet_syllables',
  'alphabet_words',
] as const satisfies readonly KangurLessonComponentId[];

type AlphabetLessonComponentId = (typeof ALPHABET_LESSON_COMPONENT_ORDER)[number];

export const ALPHABET_LESSON_TEMPLATES: Record<AlphabetLessonComponentId, KangurLessonTemplate> = {
  alphabet_basics: {
    componentId: 'alphabet_basics',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Letter Tracing',
    title: 'Letter Tracing',
    description: 'Rysuj litery po sladzie i cwicz precyzje ruchu.',
    emoji: '✍️',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  alphabet_syllables: {
    componentId: 'alphabet_syllables',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Sylaby i slowa',
    title: 'Sylaby i slowa',
    description: 'Lacz litery w sylaby i czytaj pierwsze slowa.',
    emoji: '🔤',
    color: 'kangur-gradient-accent-amber-reverse',
    activeBg: 'bg-amber-400',
  },
  alphabet_words: {
    componentId: 'alphabet_words',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Pierwsze slowa',
    title: 'Pierwsze slowa',
    description: 'Rozpoznawaj litery na poczatku prostych slow.',
    emoji: '📖',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
};

export const ALPHABET_LESSON_GROUPS = [
  {
    id: 'letter_tracing',
    label: 'Letter Tracing',
    typeLabel: 'Track',
    componentIds: ['alphabet_basics'],
  },
  {
    id: 'syllables',
    label: 'Sylaby i slowa',
    typeLabel: 'Lekcja',
    componentIds: ['alphabet_syllables'],
  },
  {
    id: 'first_words',
    label: 'Pierwsze slowa',
    typeLabel: 'Gra',
    componentIds: ['alphabet_words'],
  },
] as const;

import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';

export const ALPHABET_LESSON_COMPONENT_ORDER = [
  'alphabet_basics',
  'alphabet_copy',
  'alphabet_syllables',
  'alphabet_words',
  'alphabet_matching',
  'alphabet_sequence',
] as const satisfies readonly KangurLessonComponentId[];

type AlphabetLessonComponentId = (typeof ALPHABET_LESSON_COMPONENT_ORDER)[number];

export const ALPHABET_LESSON_TEMPLATES: Record<AlphabetLessonComponentId, KangurLessonTemplate> = {
  alphabet_basics: {
    componentId: 'alphabet_basics',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Rysuj litery po śladzie',
    title: 'Rysuj litery po śladzie',
    description: 'Rysuj litery po śladzie i ćwicz precyzję ruchu.',
    emoji: '✍️',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  alphabet_copy: {
    componentId: 'alphabet_copy',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Przepisz litery',
    title: 'Przepisz litery',
    description: 'Przepisuj litery pod wzorem i ćwicz płynność pisania.',
    emoji: '📝',
    color: 'kangur-gradient-accent-rose',
    activeBg: 'bg-rose-500',
  },
  alphabet_syllables: {
    componentId: 'alphabet_syllables',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Sylaby i słowa',
    title: 'Sylaby i słowa',
    description: 'Łącz litery w sylaby i czytaj pierwsze słowa.',
    emoji: '🔤',
    color: 'kangur-gradient-accent-amber-reverse',
    activeBg: 'bg-amber-400',
  },
  alphabet_words: {
    componentId: 'alphabet_words',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Pierwsze słowa',
    title: 'Pierwsze słowa',
    description: 'Rozpoznawaj litery na początku prostych słów.',
    emoji: '📖',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
  alphabet_matching: {
    componentId: 'alphabet_matching',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Dopasuj litery',
    title: 'Dopasuj litery',
    description: 'Łącz duże i małe litery w pary.',
    emoji: '🔤',
    color: 'kangur-gradient-accent-amber-reverse',
    activeBg: 'bg-amber-400',
  },
  alphabet_sequence: {
    componentId: 'alphabet_sequence',
    subject: 'alphabet',
    ageGroup: 'six_year_old',
    label: 'Kolejność liter',
    title: 'Kolejność liter',
    description: 'Ułóż litery w poprawnej kolejności.',
    emoji: '🧠',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
};

export const ALPHABET_LESSON_GROUPS = [
  {
    id: 'rysuj_litery',
    label: 'Rysuj Litery',
    typeLabel: 'Gra',
    componentIds: ['alphabet_basics', 'alphabet_copy'],
  },
  {
    id: 'syllables',
    label: 'Sylaby i słowa',
    typeLabel: 'Lekcja',
    componentIds: ['alphabet_syllables'],
  },
  {
    id: 'first_words',
    label: 'Pierwsze słowa',
    typeLabel: 'Gra',
    componentIds: ['alphabet_words'],
  },
  {
    id: 'matching',
    label: 'Dopasuj litery',
    typeLabel: 'Gra',
    componentIds: ['alphabet_matching'],
  },
  {
    id: 'sequence',
    label: 'Kolejność liter',
    typeLabel: 'Gra',
    componentIds: ['alphabet_sequence'],
  },
] as const;

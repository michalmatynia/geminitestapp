import type { KangurProgressState } from '@/features/kangur/ui/types';
import { vi } from 'vitest';

export const operationSelectorTranslations = {
  'KangurGameRecommendations.activityLabels.english_adverbs': {
    de: 'Adverbien',
    en: 'Adverbs',
    pl: 'Przysłówki',
  },
  'KangurGameRecommendations.activityLabels.english_adverbs_frequency': {
    de: 'Adverbien der Häufigkeit',
    en: 'Adverbs of frequency',
    pl: 'Przysłówki częstotliwości',
  },
  'KangurGameRecommendations.activityLabels.english_adjectives': {
    de: 'Adjektive',
    en: 'Adjectives',
    pl: 'Przymiotniki',
  },
  'KangurGameRecommendations.activityLabels.english_comparatives_superlatives': {
    de: 'Komparativ und Superlativ',
    en: 'Comparatives & superlatives',
    pl: 'Stopniowanie przymiotników',
  },
  'KangurGamePage.operationSelector.title': {
    de: 'Los geht\'s!',
    en: 'Let\'s play!',
    pl: 'Grajmy!',
  },
  'KangurGamePage.screens.training.label': {
    de: 'Training einrichten',
    en: 'Training setup',
    pl: 'Konfiguracja treningu',
  },
  'KangurGamePage.screens.training.wordmarkLabel': {
    de: 'Training',
    en: 'Training',
    pl: 'Trening',
  },
  'KangurProgressRuntime.activityLabels.english_adjectives': {
    de: 'Adjektive',
    en: 'Adjectives',
    pl: 'Przymiotniki',
  },
  'KangurProgressRuntime.activityLabels.english_comparatives_superlatives': {
    de: 'Komparativ und Superlativ',
    en: 'Comparatives & superlatives',
    pl: 'Stopniowanie przymiotników',
  },
  'KangurProgressRuntime.activityLabels.english_adverbs': {
    de: 'Adverbien',
    en: 'Adverbs',
    pl: 'Przysłówki',
  },
  'KangurProgressRuntime.activityLabels.english_adverbs_frequency': {
    de: 'Adverbien der Häufigkeit',
    en: 'Adverbs of frequency',
    pl: 'Przysłówki częstotliwości',
  },
} as const;

export const buildProgress = (
  overrides: Partial<KangurProgressState> = {}
): KangurProgressState => ({
  totalXp: 420,
  gamesPlayed: 8,
  perfectGames: 2,
  lessonsCompleted: 3,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: ['first_game'],
  operationsPlayed: ['division', 'clock'],
  lessonMastery: {
    division: {
      attempts: 3,
      completions: 3,
      masteryPercent: 88,
      bestScorePercent: 94,
      lastScorePercent: 90,
      lastCompletedAt: '2026-03-10T09:00:00.000Z',
    },
  },
  totalCorrectAnswers: 24,
  totalQuestionsAnswered: 30,
  currentWinStreak: 3,
  bestWinStreak: 4,
  dailyQuestsCompleted: 1,
  activityStats: {
    'game:clock': {
      sessionsPlayed: 4,
      perfectSessions: 1,
      totalXpEarned: 180,
      totalCorrectAnswers: 16,
      totalQuestionsAnswered: 20,
      bestScorePercent: 100,
      currentStreak: 2,
      bestStreak: 3,
    },
  },
  ...overrides,
});

export const buildRuntime = (
  progress: KangurProgressState,
  overrides: Record<string, unknown> = {}
) => ({
  activePracticeAssignment: null,
  basePath: '/kangur',
  handleHome: vi.fn(),
  handleSelectOperation: vi.fn(),
  practiceAssignmentsByOperation: {},
  progress,
  screen: 'operation',
  setScreen: vi.fn(),
  ...overrides,
});

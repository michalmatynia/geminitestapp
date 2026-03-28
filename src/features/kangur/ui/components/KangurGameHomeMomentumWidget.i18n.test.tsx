/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurProgressState } from '@/features/kangur/ui/types';

const { localeState } = vi.hoisted(() => ({
  localeState: {
    value: 'pl' as 'de' | 'en' | 'pl' | 'uk',
  },
}));

const { translationState } = vi.hoisted(() => ({
  translationState: {
    missing: false,
  },
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
  useTranslations:
    (namespace?: string) =>
    (key: string) => {
      if (translationState.missing) {
        return key;
      }

      const resolvedKey = `${namespace}.${key}`;
      return (
        ({
          'KangurGameRecommendations.activityLabels.english_adverbs': {
            de: 'Adverbien',
            en: 'Adverbs',
            pl: 'Przysłówki',
            uk: 'Прислівники',
          },
          'KangurGameRecommendations.activityLabels.english_adverbs_frequency': {
            de: 'Adverbien der Häufigkeit',
            en: 'Adverbs of frequency',
            pl: 'Przysłówki częstotliwości',
            uk: 'Прислівники частоти',
          },
          'KangurGameRecommendations.activityLabels.english_adjectives': {
            de: 'Adjektive',
            en: 'Adjectives',
            pl: 'Przymiotniki',
            uk: 'Прикметники',
          },
          'KangurProgressRuntime.activityLabels.english_adverbs_frequency': {
            de: 'Adverbien der Häufigkeit',
            en: 'Adverbs of frequency',
            pl: 'Przysłówki częstotliwości',
            uk: 'Прислівники частоти',
          },
          'KangurProgressRuntime.activityLabels.english_adverbs': {
            de: 'Adverbien',
            en: 'Adverbs',
            pl: 'Przysłówki',
            uk: 'Прислівники',
          },
          'KangurProgressRuntime.activityLabels.english_adjectives': {
            de: 'Adjektive',
            en: 'Adjectives',
            pl: 'Przymiotniki',
            uk: 'Прикметники',
          },
        } as const)[resolvedKey]?.[localeState.value] ?? key
      );
    },
}));

import KangurGameHomeMomentumWidget from '@/features/kangur/ui/components/KangurGameHomeMomentumWidget';

const buildProgress = (
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
      masteryPercent: 48,
      bestScorePercent: 64,
      lastScorePercent: 52,
      lastCompletedAt: '2026-03-10T09:00:00.000Z',
    },
    clock: {
      attempts: 2,
      completions: 2,
      masteryPercent: 86,
      bestScorePercent: 100,
      lastScorePercent: 90,
      lastCompletedAt: '2026-03-10T10:00:00.000Z',
    },
  },
  totalCorrectAnswers: 32,
  totalQuestionsAnswered: 40,
  currentWinStreak: 1,
  bestWinStreak: 4,
  activityStats: {
    'game:division': {
      sessionsPlayed: 4,
      perfectSessions: 1,
      totalXpEarned: 180,
      totalCorrectAnswers: 16,
      totalQuestionsAnswered: 20,
      bestScorePercent: 90,
      currentStreak: 1,
      bestStreak: 3,
    },
  },
  ...overrides,
});

describe('KangurGameHomeMomentumWidget i18n fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeState.value = 'pl';
    translationState.missing = false;
  });

  it('falls back to English weakest-lesson copy when translations are unavailable', () => {
    localeState.value = 'en';
    translationState.missing = true;

    render(<KangurGameHomeMomentumWidget basePath='/kangur' progress={buildProgress()} />);

    expect(screen.getByTestId('kangur-home-momentum-label')).toHaveTextContent('High priority');
    expect(screen.getByTestId('kangur-home-momentum-title')).toHaveTextContent(
      'Today, revisit: Division'
    );
    expect(screen.getByTestId('kangur-home-momentum-description')).toHaveTextContent(
      'Mastery 48%.'
    );
    expect(screen.getByRole('link', { name: 'Open lesson' })).toHaveAttribute(
      'href',
      '/en/kangur/lessons?focus=division'
    );
  });

  it('falls back to German guided-momentum copy when translations are unavailable', () => {
    localeState.value = 'de';
    translationState.missing = true;

    render(
      <KangurGameHomeMomentumWidget
        basePath='/kangur'
        progress={buildProgress({
          currentWinStreak: 3,
          recommendedSessionsCompleted: 2,
          lessonMastery: {
            division: {
              attempts: 3,
              completions: 3,
              masteryPercent: 92,
              bestScorePercent: 96,
              lastScorePercent: 94,
              lastCompletedAt: '2026-03-10T09:00:00.000Z',
            },
          },
        })}
      />
    );

    expect(screen.getByTestId('kangur-home-momentum-label')).toHaveTextContent(
      'Empfohlene Richtung'
    );
    expect(screen.getByTestId('kangur-home-momentum-description')).toHaveTextContent(
      'Du hast bereits 2/3'
    );
    expect(screen.getByRole('link', { name: 'Training starten' })).toHaveAttribute(
      'href',
      '/de/kangur/game?quickStart=operation&operation=division&difficulty=medium'
    );
  });

  it('localizes bare adjective activity labels inside the track recommendation copy', () => {
    localeState.value = 'en';

    render(
      <KangurGameHomeMomentumWidget
        basePath='/kangur'
        progress={buildProgress({
          currentWinStreak: 3,
          dailyQuestsCompleted: 1,
          lessonMastery: {
            division: {
              attempts: 3,
              completions: 3,
              masteryPercent: 92,
              bestScorePercent: 96,
              lastScorePercent: 94,
              lastCompletedAt: '2026-03-10T09:00:00.000Z',
            },
          },
          activityStats: {
            english_adjectives_scene_studio: {
              sessionsPlayed: 4,
              perfectSessions: 2,
              totalXpEarned: 210,
              totalCorrectAnswers: 19,
              totalQuestionsAnswered: 20,
              bestScorePercent: 100,
              currentStreak: 3,
              bestStreak: 4,
            },
          },
        })}
      />
    );

    expect(screen.getByTestId('kangur-home-momentum-description')).toHaveTextContent(
      'adjectives'
    );
  });

  it('localizes bare adverb activity labels inside the track recommendation copy', () => {
    localeState.value = 'en';

    render(
      <KangurGameHomeMomentumWidget
        basePath='/kangur'
        progress={buildProgress({
          currentWinStreak: 3,
          dailyQuestsCompleted: 1,
          lessonMastery: {
            division: {
              attempts: 3,
              completions: 3,
              masteryPercent: 92,
              bestScorePercent: 96,
              lastScorePercent: 94,
              lastCompletedAt: '2026-03-10T09:00:00.000Z',
            },
          },
          activityStats: {
            english_adverbs_action_studio: {
              sessionsPlayed: 4,
              perfectSessions: 2,
              totalXpEarned: 210,
              totalCorrectAnswers: 19,
              totalQuestionsAnswered: 20,
              bestScorePercent: 100,
              currentStreak: 3,
              bestStreak: 4,
            },
          },
        })}
      />
    );

    expect(screen.getByTestId('kangur-home-momentum-description')).toHaveTextContent('adverbs');
  });

  it('localizes bare adverbs-of-frequency activity labels inside the track recommendation copy', () => {
    localeState.value = 'en';

    render(
      <KangurGameHomeMomentumWidget
        basePath='/kangur'
        progress={buildProgress({
          currentWinStreak: 3,
          dailyQuestsCompleted: 1,
          lessonMastery: {
            division: {
              attempts: 3,
              completions: 3,
              masteryPercent: 92,
              bestScorePercent: 96,
              lastScorePercent: 94,
              lastCompletedAt: '2026-03-10T09:00:00.000Z',
            },
          },
          activityStats: {
            english_adverbs_frequency_routine_studio: {
              sessionsPlayed: 4,
              perfectSessions: 2,
              totalXpEarned: 210,
              totalCorrectAnswers: 19,
              totalQuestionsAnswered: 20,
              bestScorePercent: 100,
              currentStreak: 3,
              bestStreak: 4,
            },
          },
        })}
      />
    );

    expect(screen.getByTestId('kangur-home-momentum-description')).toHaveTextContent(
      'adverbs of frequency'
    );
  });
});

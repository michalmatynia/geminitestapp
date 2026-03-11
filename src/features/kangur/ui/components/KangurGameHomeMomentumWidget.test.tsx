/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import KangurGameHomeMomentumWidget from '@/features/kangur/ui/components/KangurGameHomeMomentumWidget';
import type { KangurProgressState } from '@/features/kangur/ui/types';

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

describe('KangurGameHomeMomentumWidget', () => {
  it('prioritizes the weakest lesson mastery recommendation when a lesson is lagging', () => {
    render(
      <KangurGameHomeMomentumWidget basePath='/kangur' progress={buildProgress()} />
    );

    expect(screen.getByTestId('kangur-home-momentum-widget')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-home-momentum-label')).toHaveTextContent('Priorytet wysoki');
    expect(screen.getByTestId('kangur-home-momentum-title')).toHaveTextContent(
      'Dzis warto: Dzielenie'
    );
    expect(screen.getByRole('link', { name: 'Otworz lekcje' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=division'
    );
  });

  it('uses theme-aware accent surfaces for recommendation cards and chips', () => {
    render(
      <KangurGameHomeMomentumWidget
        basePath='/kangur'
        progress={buildProgress({
          lessonMastery: {
            division: {
              attempts: 3,
              completions: 3,
              masteryPercent: 60,
              bestScorePercent: 72,
              lastScorePercent: 68,
              lastCompletedAt: '2026-03-10T09:00:00.000Z',
            },
          },
        })}
      />
    );

    expect(screen.getByTestId('kangur-home-momentum-widget').className).toContain(
      'var(--kangur-soft-card-background)'
    );
    expect(screen.getByTestId('kangur-home-momentum-label').className).toContain(
      'var(--kangur-soft-card-background)'
    );
  });

  it('falls back to streak building when no weak lesson remains', () => {
    render(
      <KangurGameHomeMomentumWidget
        basePath='/kangur'
        progress={buildProgress({
          lessonMastery: {
            division: {
              attempts: 3,
              completions: 3,
              masteryPercent: 86,
              bestScorePercent: 92,
              lastScorePercent: 88,
              lastCompletedAt: '2026-03-10T09:00:00.000Z',
            },
          },
          currentWinStreak: 0,
        })}
      />
    );

    expect(screen.getByTestId('kangur-home-momentum-title')).toHaveTextContent(
      'Zbuduj serie na nowo'
    );
    expect(screen.getByRole('link', { name: 'Zagraj teraz' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=training'
    );
  });

  it('prioritizes guided momentum before generic track pressure when recommendation progress exists', () => {
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
      'Polecony kierunek'
    );
    expect(screen.getByTestId('kangur-home-momentum-title')).toHaveTextContent(
      'Dopnij: Trzymam kierunek'
    );
    expect(screen.getByTestId('kangur-home-momentum-description')).toHaveTextContent(
      'Masz juz 2/3 rundy w poleconym rytmie.'
    );
    expect(screen.getByRole('link', { name: 'Uruchom trening' })).toBeInTheDocument();
  });

  it('falls back to a track push when streak and lesson recovery are already stable', () => {
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
        })}
      />
    );

    expect(screen.getByTestId('kangur-home-momentum-title')).toHaveTextContent(
      'Domknij tor:'
    );
    expect(screen.getByRole('link', { name: 'Uruchom trening' })).toBeInTheDocument();
  });
});

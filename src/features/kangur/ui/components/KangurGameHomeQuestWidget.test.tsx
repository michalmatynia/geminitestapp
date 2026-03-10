/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

import { KangurGameHomeQuestWidget } from '@/features/kangur/ui/components/KangurGameHomeQuestWidget';
import type { KangurProgressState } from '@/features/kangur/ui/types';

const progress: KangurProgressState = {
  totalXp: 540,
  gamesPlayed: 12,
  perfectGames: 3,
  lessonsCompleted: 7,
  clockPerfect: 1,
  calendarPerfect: 1,
  geometryPerfect: 0,
  badges: ['first_game'],
  operationsPlayed: ['addition', 'division'],
  currentWinStreak: 3,
  bestWinStreak: 5,
  lessonMastery: {
    division: {
      attempts: 2,
      completions: 2,
      masteryPercent: 45,
      bestScorePercent: 60,
      lastScorePercent: 40,
      lastCompletedAt: '2026-03-06T10:00:00.000Z',
    },
    adding: {
      attempts: 3,
      completions: 3,
      masteryPercent: 67,
      bestScorePercent: 80,
      lastScorePercent: 70,
      lastCompletedAt: '2026-03-06T11:00:00.000Z',
    },
    clock: {
      attempts: 4,
      completions: 4,
      masteryPercent: 92,
      bestScorePercent: 100,
      lastScorePercent: 90,
      lastCompletedAt: '2026-03-06T12:00:00.000Z',
    },
  },
};

describe('KangurGameHomeQuestWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('shows the top learner quest with reward preview on the game home screen', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress,
      screen: 'home',
    });

    render(<KangurGameHomeQuestWidget />);

    expect(screen.getByTestId('kangur-home-quest-widget')).toHaveTextContent(
      '➗ Powtorka: Dzielenie'
    );
    expect(screen.getByTestId('kangur-home-quest-label')).toHaveTextContent('Misja ratunkowa');
    expect(screen.getByTestId('kangur-home-quest-priority')).toHaveTextContent(
      'Priorytet wysoki'
    );
    expect(screen.getByTestId('kangur-home-quest-status')).toHaveTextContent('Misja w toku');
    expect(screen.getByTestId('kangur-home-quest-reward')).toHaveTextContent(
      'Nagroda +55 XP'
    );
    expect(screen.getByTestId('kangur-home-quest-expiry')).toHaveTextContent('Wygasa dzisiaj');
    expect(screen.getByTestId('kangur-home-quest-target')).toHaveTextContent(
      'Cel: 1 powtorka + wynik min. 75%'
    );
    expect(screen.getByTestId('kangur-home-quest-progress')).toHaveTextContent(
      '45% / 75% opanowania'
    );
    expect(screen.getByTestId('kangur-home-quest-momentum')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-home-quest-streak')).toHaveTextContent('Seria: 3');
    expect(screen.getByTestId('kangur-home-quest-xp-rate')).toHaveTextContent(
      'Tempo: 45 XP / gre'
    );
    expect(screen.getByTestId('kangur-home-quest-track')).toHaveTextContent(
      'Na fali: Start'
    );
    expect(screen.getByTestId('kangur-home-quest-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '60'
    );
    expect(screen.getByRole('link', { name: 'Otworz lekcje' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=division'
    );
  });

  it('stays hidden outside the home screen by default', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress,
      screen: 'operation',
    });

    const { container } = render(<KangurGameHomeQuestWidget />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows claimed reward state once the stored daily quest was already completed and paid out', () => {
    window.localStorage.setItem(
      'kangur_daily_quest_v1',
      JSON.stringify({
        version: 1,
        dateKey: '2026-03-10',
        ownerKey: null,
        createdAt: '2026-03-10T08:00:00.000Z',
        expiresAt: '2026-03-10T23:59:59.999Z',
        claimedAt: '2026-03-10T10:15:00.000Z',
        baselineGamesPlayed: 12,
        baselineLessonsCompleted: 7,
        assignment: {
          id: 'lesson-retry-division',
          title: '➗ Powtorka: Dzielenie',
          description: 'Powtorz dzielenie.',
          target: '1 powtorka + wynik min. 75%',
          priority: 'high',
          questLabel: 'Misja ratunkowa',
          rewardXp: 55,
          questMetric: {
            kind: 'lesson_mastery',
            lessonComponentId: 'division',
            targetPercent: 75,
          },
          action: {
            label: 'Otworz lekcje',
            page: 'Lessons',
            query: { focus: 'division' },
          },
        },
      })
    );

    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress: {
        ...progress,
        lessonMastery: {
          ...progress.lessonMastery,
          division: {
            ...progress.lessonMastery.division!,
            masteryPercent: 82,
          },
        },
      },
      screen: 'home',
    });

    render(<KangurGameHomeQuestWidget />);

    expect(screen.getByTestId('kangur-home-quest-status')).toHaveTextContent(
      'Misja ukonczona'
    );
    expect(screen.getByTestId('kangur-home-quest-reward')).toHaveTextContent(
      'Nagroda odebrana +55 XP'
    );
  });

  it('hides the momentum row when progress has no streak, pace, or active track yet', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      progress: {
        ...progress,
        totalXp: 0,
        gamesPlayed: 0,
        perfectGames: 0,
        lessonsCompleted: 0,
        clockPerfect: 0,
        calendarPerfect: 0,
        geometryPerfect: 0,
        currentWinStreak: 0,
        bestWinStreak: 0,
        badges: [],
        operationsPlayed: [],
        totalCorrectAnswers: 0,
        totalQuestionsAnswered: 0,
        dailyQuestsCompleted: 0,
        lessonMastery: {},
      },
      screen: 'home',
    });

    render(<KangurGameHomeQuestWidget />);

    expect(screen.queryByTestId('kangur-home-quest-momentum')).toBeNull();
  });
});

/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurProgressState } from '@/features/kangur/ui/types';

let PlayerProgressCard: typeof import('@/features/kangur/ui/components/PlayerProgressCard').default;

const { useKangurPageContentEntryMock } = vi.hoisted(() => ({
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

const progress: KangurProgressState = {
  totalXp: 480,
  gamesPlayed: 18,
  perfectGames: 5,
  lessonsCompleted: 11,
  recommendedSessionsCompleted: 2,
  clockPerfect: 2,
  calendarPerfect: 1,
  geometryPerfect: 1,
  badges: ['first_game', 'lesson_hero'],
  operationsPlayed: ['addition', 'division'],
  lessonMastery: {},
  totalCorrectAnswers: 78,
  totalQuestionsAnswered: 90,
  bestWinStreak: 4,
  activityStats: {
    'training:clock:hours': {
      sessionsPlayed: 4,
      perfectSessions: 1,
      totalCorrectAnswers: 18,
      totalQuestionsAnswered: 20,
      totalXpEarned: 112,
      bestScorePercent: 100,
      lastScorePercent: 80,
      currentStreak: 2,
      bestStreak: 2,
      lastPlayedAt: '2026-03-08T10:00:00.000Z',
    },
  },
};

describe('PlayerProgressCard', () => {
  beforeEach(async () => {
    vi.resetModules();
    useKangurPageContentEntryMock.mockImplementation(() => ({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    }));
    PlayerProgressCard = (
      await vi.importActual<typeof import('@/features/kangur/ui/components/PlayerProgressCard')>(
        '@/features/kangur/ui/components/PlayerProgressCard'
      )
    ).default;
  });

  it('uses shared metric styling and grouped badge tracks for player progress', () => {
    render(<PlayerProgressCard progress={progress} />);

    expect(screen.getByTestId('player-progress-copy')).toHaveTextContent('Postępy ucznia');
    expect(screen.getByTestId('player-progress-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('player-progress-level-bar')).toHaveAttribute('aria-valuenow', '92');
    expect(screen.getByText('Gier').parentElement).toHaveClass('soft-card', 'border');
    expect(screen.getByText('Lekcji').parentElement).toHaveClass('soft-card', 'border');
    expect(screen.getByText('Skuteczność').parentElement).toHaveClass('soft-card', 'border');
    expect(screen.getByText('Seria').parentElement).toHaveClass('soft-card', 'border');
    expect(screen.getByText('XP / grę').parentElement).toHaveClass('soft-card', 'border');
    expect(screen.getByText('XP / grę').parentElement).toHaveTextContent('27');
    expect(screen.getByTestId('player-progress-top-activity')).toHaveTextContent(
      'Trening zegara: Godziny'
    );
    expect(screen.getByTestId('player-progress-top-activity')).toHaveClass('soft-card', 'border');
    expect(screen.getByTestId('player-progress-top-activity')).toHaveTextContent('4 sesji');
    expect(screen.getByTestId('player-progress-top-activity')).toHaveTextContent('28 XP / grę');
    expect(screen.getByTestId('player-progress-top-activity')).toHaveTextContent('112 XP');
    expect(screen.getByTestId('player-progress-next-badge')).toHaveTextContent(
      '⭐ Pół tysiąca XP'
    );
    expect(screen.getByTestId('player-progress-next-badge')).toHaveTextContent(
      '480/500 XP'
    );
    expect(screen.getByTestId('player-progress-next-badge-bar')).toHaveAttribute(
      'aria-valuenow',
      '96'
    );
    expect(screen.getByTestId('player-progress-guided-momentum')).toHaveTextContent(
      '2 polecone rundy'
    );
    expect(screen.getByTestId('player-progress-guided-momentum')).toHaveTextContent(
      'Do odznaki Trzymam kierunek: 2/3 rundy'
    );
    expect(screen.getByTestId('player-progress-guided-momentum-bar')).toHaveAttribute(
      'aria-valuenow',
      '67'
    );
    expect(screen.getByTestId('player-progress-badge-track-onboarding')).toHaveTextContent(
      'Start'
    );
    expect(screen.getByTestId('player-progress-badge-track-onboarding')).toHaveTextContent(
      '2/2 odznak'
    );
    expect(screen.getByTestId('player-progress-badge-track-challenge')).toHaveTextContent(
      'Wyzwania'
    );
    expect(screen.getByTestId('player-progress-badge-track-challenge')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(screen.getByTestId('player-progress-badge-track-challenge')).toHaveTextContent(
      '2/2 odznak'
    );
    expect(screen.getByTestId('player-progress-badge-track-challenge-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
  });

  it('hides locked badges until the learner is meaningfully on the way to them', () => {
    render(<PlayerProgressCard progress={createDefaultProgress()} />);

    expect(screen.getByTestId('player-progress-badges-empty')).toHaveTextContent(
      'Kolejne odznaki pojawiają się wraz z postępem.'
    );
    expect(screen.queryByTestId('player-progress-badge-first_game')).toBeNull();
    expect(screen.queryByTestId('player-progress-badge-ten_games')).toBeNull();
  });

  it('renders Mongo-backed progress copy when page-content is available', () => {
    useKangurPageContentEntryMock.mockImplementation(() => ({
      entry: {
        id: 'game-home-progress',
        title: 'Mongo postęp',
        summary: 'Mongo opis sekcji postępu.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    }));

    render(<PlayerProgressCard progress={progress} />);

    expect(screen.getByTestId('player-progress-copy')).toHaveTextContent('Mongo postęp');
    expect(screen.getByTestId('player-progress-copy')).toHaveTextContent(
      'Mongo opis sekcji postępu.'
    );
  });
});

function createDefaultProgress(): KangurProgressState {
  return {
    totalXp: 0,
    gamesPlayed: 0,
    perfectGames: 0,
    lessonsCompleted: 0,
    clockPerfect: 0,
    calendarPerfect: 0,
    geometryPerfect: 0,
    badges: [],
    operationsPlayed: [],
    lessonMastery: {},
    totalCorrectAnswers: 0,
    totalQuestionsAnswered: 0,
    bestWinStreak: 0,
    activityStats: {},
  };
}

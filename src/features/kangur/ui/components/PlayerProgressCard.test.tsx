/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PlayerProgressCard from '@/features/kangur/ui/components/PlayerProgressCard';
import type { KangurProgressState } from '@/features/kangur/ui/types';

const progress: KangurProgressState = {
  totalXp: 480,
  gamesPlayed: 18,
  perfectGames: 5,
  lessonsCompleted: 11,
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
      bestScorePercent: 100,
      lastScorePercent: 80,
      currentStreak: 2,
      bestStreak: 2,
      lastPlayedAt: '2026-03-08T10:00:00.000Z',
    },
  },
};

describe('PlayerProgressCard', () => {
  it('uses shared metric and badge-chip styling for player progress', () => {
    render(<PlayerProgressCard progress={progress} />);

    expect(screen.getByTestId('player-progress-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('player-progress-level-bar')).toHaveAttribute('aria-valuenow', '92');
    expect(screen.getByText('Gier').parentElement).toHaveClass('soft-card', 'border-indigo-300');
    expect(screen.getByText('Lekcji').parentElement).toHaveClass('soft-card', 'border-violet-300');
    expect(screen.getByText('Skutecznosc').parentElement).toHaveClass(
      'soft-card',
      'border-emerald-300'
    );
    expect(screen.getByText('Seria').parentElement).toHaveClass('soft-card', 'border-amber-300');
    expect(screen.getByTestId('player-progress-top-activity')).toHaveTextContent(
      'Trening zegara: Godziny'
    );
    expect(screen.getByTestId('player-progress-top-activity')).toHaveTextContent('4 sesji');
    expect(screen.getByTestId('player-progress-badge-first_game')).toHaveClass(
      'border-amber-200',
      'bg-amber-100'
    );
    expect(screen.getByTestId('player-progress-badge-xp_1000')).toHaveClass(
      'border-slate-200',
      'bg-slate-100'
    );
    expect(screen.getByTestId('player-progress-badge-xp_1000')).toHaveTextContent(
      '480/1000 XP'
    );
  });
});

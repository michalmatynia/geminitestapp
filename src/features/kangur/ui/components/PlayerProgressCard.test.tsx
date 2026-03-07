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
};

describe('PlayerProgressCard', () => {
  it('uses shared metric and badge-chip styling for player progress', () => {
    render(<PlayerProgressCard progress={progress} />);

    expect(screen.getByTestId('player-progress-level-bar')).toHaveAttribute('aria-valuenow', '92');
    expect(screen.getByText('Gier').parentElement).toHaveClass('soft-card', 'border-indigo-300');
    expect(screen.getByText('Lekcji').parentElement).toHaveClass('soft-card', 'border-violet-300');
    expect(screen.getByTestId('player-progress-badge-first_game')).toHaveClass(
      'border-amber-200',
      'bg-amber-100'
    );
    expect(screen.getByTestId('player-progress-badge-perfect_10')).toHaveClass(
      'border-slate-200',
      'bg-slate-100'
    );
  });
});

/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import AssignmentPanel from '@/features/kangur/ui/components/AssignmentPanel';
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

describe('AssignmentPanel', () => {
  it('renders dynamic mastery-driven assignments with actionable links', async () => {
    render(<AssignmentPanel basePath='/kangur' progress={progress} />);

    expect(screen.getByText('Zadania')).toBeInTheDocument();
    expect(screen.getByText('Ukończono 0/3')).toBeInTheDocument();
    expect(screen.getByText('➗ Powtorka: Dzielenie')).toBeInTheDocument();
    expect(screen.getByText('➕ Powtorka: Dodawanie')).toBeInTheDocument();
    expect(screen.getByText('Trening mieszany')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Uruchom trening' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=training'
    );

    const lessonLinks = screen
      .getAllByRole('link', { name: 'Otworz lekcje' })
      .map((link) => link.getAttribute('href'));
    expect(lessonLinks).toEqual(
      expect.arrayContaining(['/kangur/lessons?focus=division', '/kangur/lessons?focus=adding'])
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Oznacz ➗ Powtorka: Dzielenie jako ukończone' })
    );
    expect(screen.getByText('Ukończono 1/3')).toBeInTheDocument();
  });
});

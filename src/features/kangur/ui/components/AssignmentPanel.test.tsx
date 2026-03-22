/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildKangurEmbeddedBasePath } from '@/features/kangur/config/routing';

const { buildKangurAssignmentsMock } = vi.hoisted(() => ({
  buildKangurAssignmentsMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/services/assignments', () => ({
  buildKangurAssignments: buildKangurAssignmentsMock,
}));
vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

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
  beforeEach(() => {
    buildKangurAssignmentsMock.mockReturnValue([
      {
        id: 'lesson-retry-division',
        title: '➗ Powtórka: Dzielenie',
        description: 'Powtórz dzielenie.',
        target: '1 powtórka',
        priority: 'high',
        action: {
          label: 'Otwórz lekcję',
          page: 'Lessons',
          query: { focus: 'division' },
        },
      },
      {
        id: 'lesson-retry-adding',
        title: '➕ Powtórka: Dodawanie',
        description: 'Powtórz dodawanie.',
        target: '1 powtórka',
        priority: 'medium',
        action: {
          label: 'Otwórz lekcję',
          page: 'Lessons',
          query: { focus: 'adding' },
        },
      },
      {
        id: 'mixed-practice',
        title: 'Trening mieszany',
        description: 'Uruchom trening mieszany.',
        target: '8 pytań',
        priority: 'low',
        action: {
          label: 'Uruchom trening',
          page: 'Game',
          query: { quickStart: 'training' },
        },
      },
    ]);
  });

  it('renders dynamic mastery-driven assignments with actionable links', async () => {
    render(<AssignmentPanel basePath='/kangur' progress={progress} />);

    expect(screen.getByTestId('assignment-panel-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-neutral'
    );
    expect(screen.getByText('Zadania')).toBeInTheDocument();
    expect(screen.getByText(/Ukonczono 0\/3/i)).toBeInTheDocument();
    expect(screen.getByText(/Ukonczono 0\/3/i)).toHaveClass(
      'inline-flex',
      'rounded-full',
      'border'
    );
    expect(screen.getByText('➗ Powtórka: Dzielenie')).toBeInTheDocument();
    expect(screen.getByText('➕ Powtórka: Dodawanie')).toBeInTheDocument();
    expect(screen.getByText('Trening mieszany')).toBeInTheDocument();
    expect(screen.getByText('Priorytet wysoki')).toBeInTheDocument();
    expect(screen.getByText('Priorytet sredni')).toBeInTheDocument();
    expect(screen.getByText('Priorytet niski')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-panel-card-lesson-retry-division')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(screen.getAllByText('Cel: 1 powtórka')[0]).toHaveClass(
      'inline-flex',
      'rounded-full',
      'border'
    );
    expect(screen.getByRole('link', { name: 'Uruchom trening' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=training'
    );

    const lessonLinks = screen
      .getAllByRole('link', { name: 'Otwórz lekcję' })
      .map((link) => link.getAttribute('href'));
    expect(lessonLinks).toEqual(
      expect.arrayContaining(['/kangur/lessons?focus=division', '/kangur/lessons?focus=adding'])
    );

    const completionToggle = screen.getAllByRole('button', {
      name: /Oznacz .* jako ukonczone/i,
    })[0];

    expect(completionToggle).toHaveClass(
      'kangur-cta-pill',
      'soft-cta',
      'h-11',
      'w-11',
      'touch-manipulation'
    );
    expect(completionToggle).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(completionToggle);

    expect(screen.getByTestId('assignment-panel-toggle-lesson-retry-division')).toHaveClass(
      'kangur-cta-pill',
      'success-cta'
    );
    expect(screen.getByTestId('assignment-panel-toggle-lesson-retry-division')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('assignment-panel-card-lesson-retry-division')).toHaveClass(
      'soft-card',
      'border',
      'transition'
    );
    expect(screen.getByText(/Ukonczono 1\/3/i)).toBeInTheDocument();
  });

  it('builds embedded cms links when rendered inside a host page route', () => {
    render(
      <AssignmentPanel
        basePath={buildKangurEmbeddedBasePath('/home?preview=1', 'cms-home-kangur')}
        progress={progress}
      />
    );

    expect(screen.getByRole('link', { name: 'Uruchom trening' })).toHaveAttribute(
      'href',
      '/home?preview=1&kangur-cms-home-kangur=game&kangur-cms-home-kangur-quickStart=training'
    );

    const lessonLinks = screen
      .getAllByRole('link', { name: 'Otwórz lekcję' })
      .map((link) => link.getAttribute('href'));
    expect(lessonLinks).toEqual(
      expect.arrayContaining([
        '/home?preview=1&kangur-cms-home-kangur=lessons&kangur-cms-home-kangur-focus=division',
        '/home?preview=1&kangur-cms-home-kangur=lessons&kangur-cms-home-kangur-focus=adding',
      ])
    );
  });

  it('uses the shared empty-state surface when there are no suggested assignments', () => {
    buildKangurAssignmentsMock.mockReturnValue([]);

    render(<AssignmentPanel basePath='/kangur' progress={progress} />);

    const emptyState = screen.getByText(
      'Brak proponowanych zadan. Zbierz najpierw troche postepu ucznia.'
    );

    expect(emptyState).toBeInTheDocument();
    expect(emptyState.parentElement).toHaveClass(
      'soft-card',
      'border-dashed',
      'border'
    );
  });
});

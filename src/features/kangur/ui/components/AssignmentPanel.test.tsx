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
        title: '➗ Powtorka: Dzielenie',
        description: 'Powtorz dzielenie.',
        target: '1 powtorka',
        priority: 'high',
        action: {
          label: 'Otworz lekcje',
          page: 'Lessons',
          query: { focus: 'division' },
        },
      },
      {
        id: 'lesson-retry-adding',
        title: '➕ Powtorka: Dodawanie',
        description: 'Powtorz dodawanie.',
        target: '1 powtorka',
        priority: 'medium',
        action: {
          label: 'Otworz lekcje',
          page: 'Lessons',
          query: { focus: 'adding' },
        },
      },
      {
        id: 'mixed-practice',
        title: 'Trening mieszany',
        description: 'Uruchom trening mieszany.',
        target: '8 pytan',
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
      'border-slate-200/70',
      'bg-white/88'
    );
    expect(screen.getByText('Zadania')).toBeInTheDocument();
    expect(screen.getByText('Ukończono 0/3')).toBeInTheDocument();
    expect(screen.getByText('Ukończono 0/3')).toHaveClass('border-slate-200', 'bg-slate-100');
    expect(screen.getByText('➗ Powtorka: Dzielenie')).toBeInTheDocument();
    expect(screen.getByText('➕ Powtorka: Dodawanie')).toBeInTheDocument();
    expect(screen.getByText('Trening mieszany')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-panel-card-lesson-retry-division')).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(screen.getAllByText('Cel: 1 powtorka')[0]).toHaveClass(
      'border-indigo-200',
      'bg-indigo-100'
    );
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

    const completionToggle = screen.getByRole('button', {
      name: 'Oznacz ➗ Powtorka: Dzielenie jako ukończone',
    });

    expect(completionToggle).toHaveClass('kangur-cta-pill', 'soft-cta');
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
      'border-emerald-300',
      'bg-emerald-50/80'
    );
    expect(screen.getByText('Ukończono 1/3')).toBeInTheDocument();
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
      .getAllByRole('link', { name: 'Otworz lekcje' })
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
      'Brak proponowanych zadań. Zbierz najpierw trochę postępu ucznia.'
    );

    expect(emptyState).toBeInTheDocument();
    expect(emptyState.parentElement).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80'
    );
  });
});

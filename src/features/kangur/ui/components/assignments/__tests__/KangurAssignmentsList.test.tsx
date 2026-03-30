/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { KangurAssignmentSnapshot } from '@kangur/platform';
import { buildKangurAssignmentListItems } from '@/features/kangur/ui/services/delegated-assignments';

import KangurAssignmentsList from '../KangurAssignmentsList';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

const regularAssignment: KangurAssignmentSnapshot = {
  id: 'assignment-regular',
  learnerKey: 'jan@example.com',
  title: 'Praktyka: Dzielenie',
  description: 'Zrób jedną sesję dzielenia.',
  priority: 'high',
  archived: false,
  timeLimitMinutes: 45,
  target: {
    type: 'practice',
    operation: 'division',
    requiredAttempts: 1,
    minAccuracyPercent: 80,
  },
  assignedByName: 'Rodzic',
  assignedByEmail: 'rodzic@example.com',
  createdAt: '2026-03-06T10:00:00.000Z',
  updatedAt: '2026-03-06T10:00:00.000Z',
  progress: {
    status: 'in_progress',
    percent: 40,
    summary: 'Sesje: 0/1',
    attemptsCompleted: 0,
    attemptsRequired: 1,
    lastActivityAt: null,
    completedAt: null,
  },
};

const compactAssignment: KangurAssignmentSnapshot = {
  id: 'assignment-compact',
  learnerKey: 'jan@example.com',
  title: 'Powtórka: Zegar',
  description: 'Ukończ dodatkową powtórkę zegara.',
  priority: 'medium',
  archived: false,
  target: {
    type: 'lesson',
    lessonComponentId: 'clock',
    requiredCompletions: 1,
    baselineCompletions: 0,
  },
  assignedByName: 'Rodzic',
  assignedByEmail: 'rodzic@example.com',
  createdAt: '2026-03-06T09:00:00.000Z',
  updatedAt: '2026-03-06T09:00:00.000Z',
  progress: {
    status: 'not_started',
    percent: 0,
    summary: 'Powtórki po przydziale: 0/1.',
    attemptsCompleted: 0,
    attemptsRequired: 1,
    lastActivityAt: null,
    completedAt: null,
  },
};

const completedAssignment: KangurAssignmentSnapshot = {
  id: 'assignment-completed',
  learnerKey: 'jan@example.com',
  title: 'Praktyka: Dodawanie',
  description: 'Ukończ jedną sesję dodawania.',
  priority: 'low',
  archived: false,
  timeLimitMinutes: null,
  target: {
    type: 'practice',
    operation: 'addition',
    requiredAttempts: 1,
    minAccuracyPercent: 70,
  },
  assignedByName: 'Rodzic',
  assignedByEmail: 'rodzic@example.com',
  createdAt: '2026-03-06T08:00:00.000Z',
  updatedAt: '2026-03-06T08:00:00.000Z',
  progress: {
    status: 'completed',
    percent: 100,
    summary: 'Sesje: 1/1',
    attemptsCompleted: 1,
    attemptsRequired: 1,
    lastActivityAt: '2026-03-06T09:00:00.000Z',
    completedAt: '2026-03-06T09:00:00.000Z',
  },
};

describe('KangurAssignmentsList', () => {
  it('uses shared info-card and button surfaces for regular assignment cards', () => {
    render(
      <KangurAssignmentsList
        items={buildKangurAssignmentListItems('/kangur', [regularAssignment])}
        emptyLabel='Brak'
        onArchive={() => undefined}
        title='Aktywne zadania'
      />
    );

    expect(screen.getByTestId('kangur-assignments-list-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-mist-strong'
    );
    expect(screen.getByTestId('kangur-assignments-list-card-assignment-regular')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(screen.getByText('Priorytet wysoki')).toHaveClass('rounded-full', 'border');
    expect(screen.getByTestId('kangur-assignments-list-progress-assignment-regular')).toHaveAttribute(
      'aria-valuenow',
      '40'
    );
    expect(screen.getByText('Czas na wykonanie: 45 min')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trenuj teraz' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta',
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(screen.getByRole('button', { name: 'Archiwizuj' })).toHaveClass(
      'border-transparent',
      'bg-transparent',
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });

  it('shows countdown label when time limit is active', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T10:30:30.000Z'));

    try {
      const assignmentWithCountdown: KangurAssignmentSnapshot = {
        ...regularAssignment,
        timeLimitMinutes: 60,
        timeLimitStartsAt: '2026-03-06T10:00:00.000Z',
      };

      render(
        <KangurAssignmentsList
          items={buildKangurAssignmentListItems('/kangur', [assignmentWithCountdown])}
          emptyLabel='Brak'
          showTimeCountdown
          title='Aktywne zadania'
        />
      );

      expect(screen.getByText('Pozostało: 29 min 30 s')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses shared info-card and CTA surfaces for compact assignment cards', () => {
    render(
      <KangurAssignmentsList
        items={buildKangurAssignmentListItems('/kangur', [compactAssignment])}
        compact
        emptyLabel='Brak'
        title='Priorytetowe zadania'
      />
    );

    expect(screen.getByTestId('kangur-assignments-list-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-mist'
    );
    expect(screen.getByTestId('kangur-assignments-list-card-assignment-compact')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(screen.getByText('Priorytet średni')).toHaveClass('rounded-full', 'border');
    expect(screen.getByTestId('kangur-assignments-list-divider-assignment-compact')).toHaveClass(
      'h-px',
      'w-full',
      'bg-slate-200'
    );
    expect(screen.getByRole('link', { name: 'Otwórz lekcję' })).toHaveClass(
      'kangur-cta-pill',
      'primary-cta',
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });

  it('shows reassign action only for completed assignments', () => {
    const onReassign = vi.fn();

    render(
      <KangurAssignmentsList
        items={buildKangurAssignmentListItems('/kangur', [completedAssignment])}
        emptyLabel='Brak'
        onArchive={() => undefined}
        onReassign={onReassign}
        title='Ukończone zadania'
      />
    );

    expect(screen.getByRole('button', { name: 'Przypisz ponownie' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });
});

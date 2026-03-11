/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { buildKangurAssignmentListItems } from '@/features/kangur/ui/services/delegated-assignments';

import KangurAssignmentsList from './KangurAssignmentsList';

const regularAssignment: KangurAssignmentSnapshot = {
  id: 'assignment-regular',
  learnerKey: 'jan@example.com',
  title: 'Praktyka: Dzielenie',
  description: 'Zrob jedna sesje dzielenia.',
  priority: 'high',
  archived: false,
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
  title: 'Powtorka: Zegar',
  description: 'Ukoncz dodatkowa powtorke zegara.',
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
    summary: 'Powtorki po przydziale: 0/1.',
    attemptsCompleted: 0,
    attemptsRequired: 1,
    lastActivityAt: null,
    completedAt: null,
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
      'border-white/78',
      'bg-white/68'
    );
    expect(screen.getByTestId('kangur-assignments-list-card-assignment-regular')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(screen.getByTestId('kangur-assignments-list-progress-assignment-regular')).toHaveAttribute(
      'aria-valuenow',
      '40'
    );
    expect(screen.getByRole('link', { name: 'Trenuj teraz' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByRole('button', { name: 'Archiwizuj' })).toHaveClass(
      'border-transparent',
      'bg-transparent'
    );
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
      'border-white/78',
      'bg-white/58'
    );
    expect(screen.getByTestId('kangur-assignments-list-card-assignment-compact')).toHaveClass(
      'soft-card',
      'border'
    );
    expect(screen.getByTestId('kangur-assignments-list-divider-assignment-compact')).toHaveClass(
      'h-px',
      'w-full',
      'bg-slate-200'
    );
    expect(screen.getByRole('link', { name: 'Otworz lekcje' })).toHaveClass(
      'kangur-cta-pill',
      'primary-cta'
    );
  });
});

/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import OperationSelector from '@/features/kangur/ui/components/OperationSelector';

describe('OperationSelector', () => {
  it('highlights parent-assigned operations and surfaces their priority context', () => {
    render(
      <OperationSelector
        onSelect={vi.fn()}
        priorityAssignmentsByOperation={{
          division: {
            id: 'assignment-division',
            learnerKey: 'jan@example.com',
            title: 'Praktyka: Dzielenie',
            description: 'Rozwiaz jedna sesje dzielenia.',
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
          },
        }}
      />
    );

    expect(screen.getByRole('list', { name: 'Wybierz swoje wyzwanie' })).toBeInTheDocument();
    expect(screen.getByTestId('operation-selector-heading')).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'text-center'
    );
    expect(screen.getByRole('heading', { name: 'Wybierz swoje wyzwanie' })).toHaveClass(
      'text-2xl',
      'text-indigo-700'
    );

    const divisionCard = screen.getByTestId('operation-card-division');
    const additionCard = screen.getByTestId('operation-card-addition');

    expect(divisionCard).toHaveClass('soft-card', 'border-amber-300');
    expect(additionCard).toHaveClass('soft-card', 'border-slate-200/80');
    expect(within(divisionCard).getByTestId('operation-icon-division')).toHaveClass(
      'bg-amber-100',
      'text-amber-700'
    );
    expect(within(additionCard).getByTestId('operation-icon-addition')).toHaveClass(
      'bg-emerald-100',
      'text-emerald-700'
    );
    expect(within(divisionCard).getByText('Zadanie od rodzica')).toBeInTheDocument();
    expect(within(divisionCard).getByText('Zadanie od rodzica')).toHaveClass(
      'border-amber-200',
      'bg-amber-100'
    );
    expect(within(divisionCard).getByText('Priorytet wysoki')).toBeInTheDocument();
    expect(within(divisionCard).getByText('Priorytet wysoki')).toHaveClass(
      'border-rose-200',
      'bg-rose-100'
    );
    expect(within(divisionCard).getByText('40% · Praktyka: Dzielenie')).toBeInTheDocument();
    expect(divisionCard).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('operation-card-status-division')
    );
    expect(within(additionCard).queryByText('Zadanie od rodzica')).not.toBeInTheDocument();
  });
});

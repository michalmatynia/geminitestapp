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

    const divisionCard = screen.getByTestId('operation-card-division');
    const additionCard = screen.getByTestId('operation-card-addition');

    expect(within(divisionCard).getByText('Zadanie od rodzica')).toBeInTheDocument();
    expect(within(divisionCard).getByText('Priorytet wysoki')).toBeInTheDocument();
    expect(within(divisionCard).getByText('40% · Praktyka: Dzielenie')).toBeInTheDocument();
    expect(within(additionCard).queryByText('Zadanie od rodzica')).not.toBeInTheDocument();
  });
});

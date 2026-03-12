/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { useKangurOperationSelectorState } from '@/features/kangur/ui/hooks/useKangurOperationSelectorState';

const createPracticeAssignment = (
  overrides: Partial<KangurAssignmentSnapshot> & {
    target: { type: 'practice'; operation: 'addition' | 'division' };
  }
): KangurAssignmentSnapshot & { target: { type: 'practice'; operation: 'addition' | 'division' } } => ({
  id: 'assignment-1',
  learnerKey: 'learner-1',
  title: 'Practice assignment',
  description: 'Practice session',
  priority: 'medium',
  archived: false,
  target: overrides.target,
  assignedByName: 'Parent',
  assignedByEmail: 'parent@example.com',
  createdAt: '2026-03-07T12:00:00.000Z',
  updatedAt: '2026-03-07T12:00:00.000Z',
  progress: {
    status: 'in_progress',
    percent: 50,
    summary: '50% ukończono',
    attemptsCompleted: 1,
    attemptsRequired: 2,
    lastActivityAt: null,
    completedAt: null,
  },
  ...overrides,
});

describe('useKangurOperationSelectorState', () => {
  it('sorts operations by assignment priority and binds selection to the active difficulty', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useKangurOperationSelectorState({
        onSelect,
        priorityAssignmentsByOperation: {
          addition: createPracticeAssignment({
            id: 'assignment-addition',
            priority: 'medium',
            target: { type: 'practice', operation: 'addition' },
          }),
          division: createPracticeAssignment({
            id: 'assignment-division',
            priority: 'high',
            target: { type: 'practice', operation: 'division' },
          }),
        },
      })
    );

    expect(result.current.operations[0]?.id).toBe('division');
    expect(result.current.operations[1]?.id).toBe('addition');
    expect(result.current.operations[0]?.priority).toBe('high');
    expect(result.current.operations[1]?.priority).toBe('medium');

    act(() => {
      result.current.setDifficulty('hard');
    });

    act(() => {
      result.current.operations[0]?.select();
    });

    expect(onSelect).toHaveBeenCalledWith('division', 'hard');
  });
});

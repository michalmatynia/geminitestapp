/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurAssignmentsMock } = vi.hoisted(() => ({
  useKangurAssignmentsMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

import KangurPriorityAssignments from '@/features/kangur/ui/components/KangurPriorityAssignments';

describe('KangurPriorityAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the shared neutral glass panel while loading', () => {
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: true,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });

    render(<KangurPriorityAssignments basePath='/kangur' enabled />);

    expect(screen.getByTestId('kangur-priority-assignments-loading')).toHaveClass(
      'glass-panel',
      'border-slate-200/70',
      'bg-white/88'
    );
  });

  it('shows only active priority tasks for the learner', () => {
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-high',
          learnerKey: 'ada@example.com',
          title: 'Powtorka dzielenia',
          description: 'Powtorz dzielenie.',
          priority: 'high',
          archived: false,
          target: {
            type: 'lesson',
            lessonComponentId: 'division',
            requiredCompletions: 1,
            baselineCompletions: 0,
          },
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:00:00.000Z',
          progress: {
            status: 'not_started',
            percent: 0,
            summary: 'Powtorki po przydziale: 0/1.',
            attemptsCompleted: 0,
            attemptsRequired: 1,
            lastActivityAt: null,
            completedAt: null,
          },
        },
        {
          id: 'assignment-completed',
          learnerKey: 'ada@example.com',
          title: 'Ukonczone zadanie',
          description: 'To zadanie juz jest zakonczone.',
          priority: 'low',
          archived: false,
          target: {
            type: 'practice',
            operation: 'mixed',
            requiredAttempts: 1,
            minAccuracyPercent: 70,
          },
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:00:00.000Z',
          progress: {
            status: 'completed',
            percent: 100,
            summary: 'Sesje po przydziale: 1/1.',
            attemptsCompleted: 1,
            attemptsRequired: 1,
            lastActivityAt: '2026-03-06T11:00:00.000Z',
            completedAt: '2026-03-06T11:00:00.000Z',
          },
        },
      ],
      isLoading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });

    render(<KangurPriorityAssignments basePath='/kangur' enabled />);

    expect(screen.getByText('Priorytetowe zadania')).toBeInTheDocument();
    expect(screen.getByText('Powtorka dzielenia')).toBeInTheDocument();
    expect(screen.queryByText('Ukonczone zadanie')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Otworz lekcje' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=division'
    );
  });

  it('uses the shared mist glass panel for the empty state', () => {
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });

    render(<KangurPriorityAssignments basePath='/kangur' enabled />);

    expect(screen.getByTestId('kangur-priority-assignments-empty')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/58'
    );
    expect(screen.getByText('Brak aktywnych zadan od rodzica.')).toBeInTheDocument();
  });
});

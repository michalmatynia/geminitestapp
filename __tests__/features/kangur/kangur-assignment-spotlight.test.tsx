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

import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';

describe('KangurAssignmentSpotlight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the highest-priority active assignment as the home spotlight', () => {
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-low',
          learnerKey: 'ada@example.com',
          title: 'Trening mieszany',
          description: 'Krotki trening mieszany.',
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
            status: 'in_progress',
            percent: 20,
            summary: 'Sesje: 0/1',
            attemptsCompleted: 0,
            attemptsRequired: 1,
            lastActivityAt: null,
            completedAt: null,
          },
        },
        {
          id: 'assignment-high',
          learnerKey: 'ada@example.com',
          title: 'Powtorka dzielenia',
          description: 'Wroc do lekcji dzielenia.',
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
          createdAt: '2026-03-06T11:00:00.000Z',
          updatedAt: '2026-03-06T11:00:00.000Z',
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
          description: 'To zadanie zostalo juz wykonane.',
          priority: 'medium',
          archived: false,
          target: {
            type: 'practice',
            operation: 'division',
            requiredAttempts: 1,
            minAccuracyPercent: 80,
          },
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
          createdAt: '2026-03-06T09:00:00.000Z',
          updatedAt: '2026-03-06T09:00:00.000Z',
          progress: {
            status: 'completed',
            percent: 100,
            summary: 'Sesje: 1/1',
            attemptsCompleted: 1,
            attemptsRequired: 1,
            lastActivityAt: '2026-03-06T09:10:00.000Z',
            completedAt: '2026-03-06T09:10:00.000Z',
          },
        },
      ],
      isLoading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });

    render(<KangurAssignmentSpotlight basePath='/kangur' />);

    expect(screen.getByText('Zadanie od rodzica')).toBeInTheDocument();
    expect(screen.getByText('Powtorka dzielenia')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-assignment-spotlight-shell')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/58'
    );
    expect(screen.getByTestId('kangur-assignment-spotlight-inner-shell')).toHaveClass(
      'soft-card',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByText('Priorytet wysoki')).toHaveClass('border-amber-200', 'bg-amber-100');
    expect(screen.getByTestId('kangur-assignment-spotlight-progress')).toHaveClass(
      'border-amber-200',
      'bg-amber-100'
    );
    expect(screen.getByTestId('kangur-assignment-spotlight-divider')).toHaveClass(
      'h-px',
      'w-full',
      'bg-slate-200'
    );
    expect(screen.queryByText('Ukonczone zadanie')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Otworz lekcje' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=division'
    );
  });
});

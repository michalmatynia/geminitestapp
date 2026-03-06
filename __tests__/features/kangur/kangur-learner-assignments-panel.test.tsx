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

import KangurLearnerAssignmentsPanel from '@/features/kangur/ui/components/KangurLearnerAssignmentsPanel';

describe('KangurLearnerAssignmentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows assignment progress summary plus active and completed history', () => {
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-active',
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
        },
        {
          id: 'assignment-completed',
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
            status: 'completed',
            percent: 100,
            summary: 'Powtorki po przydziale: 1/1.',
            attemptsCompleted: 1,
            attemptsRequired: 1,
            lastActivityAt: '2026-03-06T09:20:00.000Z',
            completedAt: '2026-03-06T09:20:00.000Z',
          },
        },
      ],
      isLoading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });

    render(<KangurLearnerAssignmentsPanel basePath='/kangur' />);

    expect(screen.getByText('Przebieg przydzielonych zadan')).toBeInTheDocument();
    expect(screen.getByText('Skutecznosc')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Ostatni sukces')).toBeInTheDocument();
    expect(screen.getAllByText('Powtorka: Zegar').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Aktywne zadania od rodzica')).toBeInTheDocument();
    expect(screen.getByText('Historia ukonczonych zadan')).toBeInTheDocument();
    expect(screen.getByText('Praktyka: Dzielenie')).toBeInTheDocument();
  });

  it('shows a local-mode message when assignments are unavailable', () => {
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });

    render(<KangurLearnerAssignmentsPanel basePath='/kangur' enabled={false} />);

    expect(screen.getByText('Przebieg przydzielonych zadan')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Po zalogowaniu zobaczysz zadania przypisane przez rodzica oraz historie ich wykonania.'
      )
    ).toBeInTheDocument();
  });
});

/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurAssignmentsMock,
  useKangurPageContentEntryMock,
  useKangurSubjectFocusMock,
} = vi.hoisted(() => ({
  useKangurAssignmentsMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

import KangurPriorityAssignments from '@/features/kangur/ui/components/KangurPriorityAssignments';

describe('KangurPriorityAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'guest',
    });
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
      'kangur-panel-soft',
      'kangur-glass-surface-neutral'
    );
  });

  it('shows only active priority tasks for the learner', () => {
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-high',
          learnerKey: 'ada@example.com',
          title: 'Powtórka dzielenia',
          description: 'Powtórz dzielenie.',
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
            summary: 'Powtórki po przydziale: 0/1.',
            attemptsCompleted: 0,
            attemptsRequired: 1,
            lastActivityAt: null,
            completedAt: null,
          },
        },
        {
          id: 'assignment-completed',
          learnerKey: 'ada@example.com',
          title: 'Ukończone zadanie',
          description: 'To zadanie już jest zakończone.',
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
    expect(screen.getByText('Powtórka dzielenia')).toBeInTheDocument();
    expect(screen.queryByText('Ukończone zadanie')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Otwórz lekcję' })).toHaveAttribute(
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
      'kangur-panel-soft',
      'kangur-glass-surface-mist'
    );
    expect(screen.getByText('Brak aktywnych zadan od rodzica.')).toBeInTheDocument();
  });
});

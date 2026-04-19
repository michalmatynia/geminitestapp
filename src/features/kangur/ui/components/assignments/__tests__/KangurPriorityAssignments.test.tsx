/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';

const { useKangurAssignmentsMock } = vi.hoisted(() => ({
  useKangurAssignmentsMock: vi.fn(),
}));

const { useKangurIdleReadyMock, useKangurPageContentEntryMock, useKangurSubjectFocusMock } =
  vi.hoisted(() => ({
    useKangurIdleReadyMock: vi.fn(),
    useKangurPageContentEntryMock: vi.fn(),
    useKangurSubjectFocusMock: vi.fn(),
  }));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurIdleReady', () => ({
  useKangurIdleReady: useKangurIdleReadyMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import type { KangurAssignmentSnapshot } from '@kangur/platform';

import { KangurPriorityAssignments } from '../KangurPriorityAssignments';

const assignment: KangurAssignmentSnapshot = {
  id: 'assignment-priority',
  learnerKey: 'jan@example.com',
  title: 'Powtórka: Dzielenie',
  description: 'Wróć do dzielenia i zakończ jedną pełną sesję.',
  priority: 'high',
  archived: false,
  target: {
    type: 'lesson',
    lessonComponentId: 'division',
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

describe('KangurPriorityAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurIdleReadyMock.mockReturnValue(true);
    useKangurPageContentEntryMock.mockReturnValue({ entry: null });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
    });
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
    });
  });

  it('renders the default compact title and count when priority assignments are available', () => {
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [assignment],
      isLoading: false,
      error: null,
    });

    render(<KangurPriorityAssignments basePath='/kangur' enabled />);

    expect(screen.getByTestId('kangur-assignments-list-shell')).toHaveTextContent(
      'Priorytetowe zadania'
    );
    expect(screen.getByTestId('kangur-assignments-list-shell')).toHaveTextContent('1 zadanie');
  });

  it('renders the default empty-state copy', () => {
    render(<KangurPriorityAssignments basePath='/kangur' enabled />);

    expect(screen.getByTestId('kangur-priority-assignments-empty')).toHaveTextContent(
      'Priorytetowe zadania'
    );
    expect(screen.getByTestId('kangur-priority-assignments-empty')).toHaveTextContent(
      'Brak aktywnych zadan od rodzica.'
    );
  });

  it('stays dormant until idle time unlocks the assignments query', () => {
    useKangurIdleReadyMock.mockReturnValue(false);

    const { container } = render(<KangurPriorityAssignments basePath='/kangur' enabled />);

    expect(useKangurIdleReadyMock).toHaveBeenCalledWith({
      minimumDelayMs: GAME_HOME_SECONDARY_DATA_IDLE_DELAY_MS,
    });

    expect(useKangurPageContentEntryMock).toHaveBeenCalledWith(
      'game-home-priority-assignments',
      undefined,
      { enabled: false }
    );
    expect(useKangurAssignmentsMock).toHaveBeenCalledWith({
      enabled: false,
      query: {
        includeArchived: false,
      },
    });
    expect(container).toBeEmptyDOMElement();
  });
});

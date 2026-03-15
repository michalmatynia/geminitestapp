/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useKangurProgressStateMock = vi.hoisted(() => vi.fn());
const useKangurAssignmentsMock = vi.hoisted(() => vi.fn());
const useSettingsStoreMock = vi.hoisted(() => vi.fn());
const delegatedAssignmentsState = vi.hoisted(() => ({
  catalog: [] as Array<{
    id: string;
    title: string;
    description: string;
    badge: string;
    group: string;
    priorityLabel: string;
    createInput: {
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      target: {
        type: 'lesson' | 'practice';
        lessonComponentId?: string;
        operation?: string;
        requiredAttempts?: number;
        minAccuracyPercent?: number | null;
        requiredCompletions?: number;
      };
    };
    keywords: string[];
  }>,
  recommended: [] as Array<unknown>,
  filtered: [] as Array<unknown>,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: useSettingsStoreMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/services/delegated-assignments', () => ({
  buildKangurAssignmentCatalog: () => delegatedAssignmentsState.catalog,
  buildKangurAssignmentListItems: (_basePath: string, assignments: Array<{ id: string }>) =>
    assignments.map((assignment) => ({ id: assignment.id })),
  buildRecommendedKangurAssignmentCatalog: () => delegatedAssignmentsState.recommended,
  filterKangurAssignmentCatalog: () => delegatedAssignmentsState.filtered,
  buildKangurAssignmentHref: () => '/kangur/game',
  formatKangurAssignmentPriorityLabel: (priority: 'high' | 'medium' | 'low') =>
    priority === 'high'
      ? 'Priorytet wysoki'
      : priority === 'medium'
        ? 'Priorytet średni'
        : 'Priorytet niski',
  getKangurAssignmentActionLabel: () => 'Otwórz zadanie',
  resolveKangurAssignmentPriorityAccent: (priority: 'high' | 'medium' | 'low') =>
    priority === 'high' ? 'rose' : priority === 'medium' ? 'amber' : 'emerald',
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentsList', () => ({
  default: ({
    title,
    items = [],
    onTimeLimitClick,
  }: {
    title: string;
    items?: Array<{ id: string }>;
    onTimeLimitClick?: (id: string) => void;
  }) => (
    <div data-testid={`assignment-list-${title}`}>
      <div>{title}</div>
      {onTimeLimitClick && items[0] ? (
        <button type='button' onClick={() => onTimeLimitClick(items[0].id)}>
          Czas na wykonanie
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
    targetPageKey: _targetPageKey,
    transitionAcknowledgeMs: _transitionAcknowledgeMs,
    transitionSourceId: _transitionSourceId,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    targetPageKey?: string;
    transitionAcknowledgeMs?: number;
    transitionSourceId?: string | null;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import KangurAssignmentManager from '@/features/kangur/ui/components/KangurAssignmentManager';

const progress = {
  totalXp: 480,
  gamesPlayed: 4,
  perfectGames: 1,
  lessonsCompleted: 2,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: [],
  operationsPlayed: [],
  totalCorrectAnswers: 20,
  totalQuestionsAnswered: 25,
  dailyQuestsCompleted: 1,
  bestWinStreak: 2,
  activityStats: {},
  lessonMastery: {
    division: {
      attempts: 2,
      completions: 2,
      masteryPercent: 82,
      bestScorePercent: 90,
      lastScorePercent: 82,
      lastCompletedAt: '2026-03-10T11:00:00.000Z',
    },
  },
};

describe('KangurAssignmentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStoreMock.mockReturnValue({
      get: vi.fn(),
    });
    useKangurProgressStateMock.mockReturnValue(progress);
    delegatedAssignmentsState.catalog = [];
    delegatedAssignmentsState.recommended = [];
    delegatedAssignmentsState.filtered = [];
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      reassignAssignment: vi.fn(),
    });
  });

  it('renders active and completed assignment lists', () => {
    render(<KangurAssignmentManager basePath='/kangur' />);

    expect(screen.getByTestId('assignment-list-Aktywne zadania')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-list-Ukończone zadania')).toBeInTheDocument();
  });

  it('toggles between active and completed lists in catalogWithLists view', () => {
    render(<KangurAssignmentManager basePath='/kangur' view='catalogWithLists' />);

    expect(screen.getByTestId('assignment-list-Aktywne zadania')).toBeInTheDocument();
    expect(screen.queryByTestId('assignment-list-Ukończone zadania')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Ukończone/ }));

    expect(screen.getByTestId('assignment-list-Ukończone zadania')).toBeInTheDocument();
    expect(screen.queryByTestId('assignment-list-Aktywne zadania')).toBeNull();
  });

  it('opens the time limit modal and saves the update', async () => {
    const updateAssignment = vi.fn().mockResolvedValue({
      id: 'assignment-1',
    });
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-1',
          learnerKey: 'jan@example.com',
          title: 'Praktyka: Dodawanie',
          description: 'Jedna sesja dodawania.',
          priority: 'high',
          archived: false,
          target: {
            type: 'practice',
            operation: 'addition',
            requiredAttempts: 1,
            minAccuracyPercent: 80,
          },
          assignedByName: 'Rodzic',
          assignedByEmail: 'rodzic@example.com',
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:00:00.000Z',
          progress: {
            status: 'not_started',
            percent: 0,
            summary: 'Sesje: 0/1',
            attemptsCompleted: 0,
            attemptsRequired: 1,
            lastActivityAt: null,
            completedAt: null,
          },
        },
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment,
      reassignAssignment: vi.fn(),
    });

    render(<KangurAssignmentManager basePath='/kangur' />);

    fireEvent.click(screen.getByRole('button', { name: 'Czas na wykonanie' }));
    expect(screen.getByTestId('assignment-time-limit-modal')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Czas na wykonanie w minutach'), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() =>
      expect(updateAssignment).toHaveBeenCalledWith('assignment-1', {
        timeLimitMinutes: 25,
      })
    );
  });

  it('marks assigned catalog items as already assigned', () => {
    delegatedAssignmentsState.catalog = [
      {
        id: 'practice-addition',
        title: 'Praktyka: Dodawanie',
        description: 'Jedna sesja dodawania.',
        badge: 'Praktyka',
        group: 'practice',
        priorityLabel: 'Priorytet wysoki',
        createInput: {
          title: 'Praktyka: Dodawanie',
          description: 'Jedna sesja dodawania.',
          priority: 'high',
          target: {
            type: 'practice',
            operation: 'addition',
            requiredAttempts: 1,
            minAccuracyPercent: 80,
          },
        },
        keywords: ['dodawanie'],
      },
    ];
    delegatedAssignmentsState.filtered = delegatedAssignmentsState.catalog;
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-1',
          learnerKey: 'jan@example.com',
          title: 'Praktyka: Dodawanie',
          description: 'Jedna sesja dodawania.',
          priority: 'high',
          archived: false,
          target: {
            type: 'practice',
            operation: 'addition',
            requiredAttempts: 1,
            minAccuracyPercent: 80,
          },
          assignedByName: 'Rodzic',
          assignedByEmail: 'rodzic@example.com',
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:00:00.000Z',
          progress: {
            status: 'not_started',
            percent: 0,
            summary: 'Sesje: 0/1',
            attemptsCompleted: 0,
            attemptsRequired: 1,
            lastActivityAt: null,
            completedAt: null,
          },
        },
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
    });

    render(<KangurAssignmentManager basePath='/kangur' view='catalog' />);

    const assignedButton = screen.getByRole('button', { name: 'Przypisane' });
    expect(assignedButton).toBeDisabled();
  });
});

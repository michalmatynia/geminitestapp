/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurAssignmentsMock,
  useKangurProgressStateMock,
  settingsStoreMock,
  lessonsState,
  createAssignmentMock,
  updateAssignmentMock,
  refreshMock,
} = vi.hoisted(() => ({
  useKangurAssignmentsMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  createAssignmentMock: vi.fn(),
  updateAssignmentMock: vi.fn(),
  refreshMock: vi.fn(),
  settingsStoreMock: {
    get: vi.fn(),
  },
  lessonsState: {
    value: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: () => ({
    data: lessonsState.value,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

import { KangurAssignmentManager } from "@/features/kangur/ui/components/assignment-manager/KangurAssignmentManager";

describe('KangurAssignmentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.get.mockReturnValue(undefined);
    lessonsState.value = [
      {
        id: 'kangur-lesson-clock',
        componentId: 'clock',
        subject: 'maths',
        title: 'Nauka zegara',
        description: 'Odczytuj godziny',
        emoji: '🕐',
        color: 'kangur-gradient-accent-indigo-reverse',
        activeBg: 'bg-indigo-500',
        sortOrder: 1000,
        enabled: true,
      },
    ];
    createAssignmentMock.mockResolvedValue({
      id: 'assignment-created',
    });
    updateAssignmentMock.mockResolvedValue({
      id: 'assignment-1',
    });
    refreshMock.mockResolvedValue(undefined);
    useKangurProgressStateMock.mockReturnValue({
      totalXp: 0,
      gamesPlayed: 0,
      perfectGames: 0,
      lessonsCompleted: 0,
      clockPerfect: 0,
      calendarPerfect: 0,
      geometryPerfect: 0,
      badges: [],
      operationsPlayed: [],
      lessonMastery: {},
    });
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-1',
          learnerKey: 'ada@example.com',
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
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
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
      ],
      isLoading: false,
      error: null,
      createAssignment: createAssignmentMock,
      updateAssignment: updateAssignmentMock,
      refresh: refreshMock,
    });
  });

  it('renders recommendations, filters catalog items, and creates assignments from the parent panel', async () => {
    render(<KangurAssignmentManager basePath='/kangur' />);

    expect(screen.getByTestId('assignment-manager-create-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-neutral'
    );
    expect(screen.getByTestId('assignment-manager-tracking-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-neutral'
    );
    const allFilter = screen.getByTestId('assignment-manager-filter-all');
    const practiceFilter = screen.getByTestId('assignment-manager-filter-practice');

    expect(allFilter).toHaveClass('kangur-segmented-control-item-active');
    expect(allFilter).toHaveAttribute('aria-pressed', 'true');
    expect(practiceFilter).not.toHaveClass('kangur-segmented-control-item-active');
    expect(practiceFilter).toHaveAttribute('aria-pressed', 'false');

    expect(screen.getByText('Przydziel nowe zadanie')).toBeInTheDocument();
    expect(screen.getByText('Sugestie od StudiQ')).toBeInTheDocument();
    expect(screen.getByText('Sugestie od StudiQ')).toHaveClass('rounded-full', 'border');
    expect(screen.getAllByTestId(/assignment-manager-recommended-card-/)[0]).toHaveClass(
      'soft-card'
    );
    expect(screen.getByText('Nauka zegara')).toBeInTheDocument();
    expect(screen.getAllByText('Trening mieszany').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Trening: Ułamki')).toBeInTheDocument();
    expect(screen.getByText('Trening: Potęgi')).toBeInTheDocument();
    expect(screen.getByText('Trening: Pierwiastki')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-manager-catalog-card-practice-clock')).toHaveClass(
      'soft-card'
    );
    expect(
      screen.getByPlaceholderText('Szukaj po temacie, typie zadania lub slowie kluczowym...')
    ).toHaveClass('soft-card');
    expect(screen.getByText('Monitorowanie zadan')).toBeInTheDocument();
    expect(screen.getByText('Aktywne').parentElement).toHaveClass('soft-card');
    expect(screen.getByText('Aktywne').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Do rozpoczecia').parentElement).toHaveClass('soft-card');
    expect(screen.getByText('Do rozpoczecia').parentElement).toHaveTextContent('0');
    expect(screen.getByText('Aktywne zadania')).toBeInTheDocument();
    expect(screen.getAllByText('Praktyka: Dzielenie').length).toBeGreaterThanOrEqual(1);

    await userEvent.click(practiceFilter);

    expect(practiceFilter).toHaveClass('kangur-segmented-control-item-active');
    expect(practiceFilter).toHaveAttribute('aria-pressed', 'true');
    expect(allFilter).not.toHaveClass('kangur-segmented-control-item-active');
    expect(allFilter).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Nauka zegara')).not.toBeInTheDocument();
    expect(screen.getAllByText('Trening mieszany').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Trening: Dzielenie')).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText('Szukaj po temacie, typie zadania lub slowie kluczowym...'),
      'dzielenie'
    );

    expect(screen.queryByText('Nauka zegara')).not.toBeInTheDocument();
    expect(screen.getByText('Trening: Dzielenie')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Przypisz sugestie' })[0]!);

    expect(createAssignmentMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Przypisano:/i)).toBeInTheDocument();
  });

  it('shows assignment tracking summary and duplicate-assignment feedback', async () => {
    createAssignmentMock.mockRejectedValueOnce({ status: 409 });
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-1',
          learnerKey: 'ada@example.com',
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
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
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
        {
          id: 'assignment-2',
          learnerKey: 'ada@example.com',
          title: 'Praktyka: Dodawanie',
          description: 'Trening dodawania.',
          priority: 'medium',
          archived: false,
          target: {
            type: 'practice',
            operation: 'addition',
            requiredAttempts: 1,
            minAccuracyPercent: 80,
          },
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
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
          id: 'assignment-3',
          learnerKey: 'ada@example.com',
          title: 'Powtórka: Zegar',
          description: 'Powtórz lekcję zegara.',
          priority: 'low',
          archived: false,
          target: {
            type: 'lesson',
            lessonComponentId: 'clock',
            requiredCompletions: 1,
            baselineCompletions: 0,
          },
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:00:00.000Z',
          progress: {
            status: 'completed',
            percent: 100,
            summary: 'Powtórki po przydziale: 1/1.',
            attemptsCompleted: 1,
            attemptsRequired: 1,
            lastActivityAt: '2026-03-06T10:10:00.000Z',
            completedAt: '2026-03-06T10:10:00.000Z',
          },
        },
      ],
      isLoading: false,
      error: null,
      createAssignment: createAssignmentMock,
      updateAssignment: updateAssignmentMock,
      refresh: refreshMock,
    });

    render(<KangurAssignmentManager basePath='/kangur' />);

    expect(screen.getByText('Monitorowanie zadan')).toBeInTheDocument();
    expect(screen.getByText('Skutecznosc wykonania')).toBeInTheDocument();
    expect(screen.getByText('Skutecznosc wykonania').parentElement).toHaveClass('soft-card');
    expect(screen.getByText('33%')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Przypisz sugestie' }));

    expect(createAssignmentMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('To zadanie jest juz aktywne.')).toBeInTheDocument();
  });

  it('uses the shared empty-state surface when no attention items are present', () => {
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-1',
          learnerKey: 'ada@example.com',
          title: 'Powtórka: Zegar',
          description: 'Powtórz lekcję zegara.',
          priority: 'low',
          archived: false,
          target: {
            type: 'lesson',
            lessonComponentId: 'clock',
            requiredCompletions: 1,
            baselineCompletions: 0,
          },
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:00:00.000Z',
          progress: {
            status: 'completed',
            percent: 100,
            summary: 'Powtórki po przydziale: 1/1.',
            attemptsCompleted: 1,
            attemptsRequired: 1,
            lastActivityAt: '2026-03-06T10:10:00.000Z',
            completedAt: '2026-03-06T10:10:00.000Z',
          },
        },
      ],
      isLoading: false,
      error: null,
      createAssignment: createAssignmentMock,
      updateAssignment: updateAssignmentMock,
      refresh: refreshMock,
    });

    render(<KangurAssignmentManager basePath='/kangur' />);

    expect(screen.getByText('Brak aktywnych zadan dla ucznia.')).toBeInTheDocument();
  });
});

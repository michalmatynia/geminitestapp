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
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

import KangurAssignmentManager from '@/features/kangur/ui/components/KangurAssignmentManager';

describe('KangurAssignmentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.get.mockReturnValue(undefined);
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
      'border-slate-200/70',
      'bg-white/88'
    );
    expect(screen.getByTestId('assignment-manager-tracking-shell')).toHaveClass(
      'glass-panel',
      'border-slate-200/70',
      'bg-white/88'
    );
    const allFilter = screen.getByTestId('assignment-manager-filter-all');
    const practiceFilter = screen.getByTestId('assignment-manager-filter-practice');

    expect(allFilter).toHaveClass('text-indigo-700', 'ring-1');
    expect(allFilter).toHaveAttribute('aria-pressed', 'true');
    expect(practiceFilter).toHaveClass('text-slate-500', 'bg-transparent');
    expect(practiceFilter).toHaveAttribute('aria-pressed', 'false');

    expect(screen.getByText('Przydziel nowe zadanie')).toBeInTheDocument();
    expect(screen.getByText('Podpowiedzi z postępu ucznia')).toBeInTheDocument();
    expect(screen.getByText('Podpowiedzi z postępu ucznia')).toHaveClass(
      'border-indigo-200',
      'bg-indigo-100'
    );
    expect(screen.getAllByTestId(/assignment-manager-recommended-card-/)[0]).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(screen.getByText('Nauka zegara')).toBeInTheDocument();
    expect(screen.getAllByText('Trening mieszany').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Trening: Ulamki')).toBeInTheDocument();
    expect(screen.getByText('Trening: Potegi')).toBeInTheDocument();
    expect(screen.getByText('Trening: Pierwiastki')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-manager-catalog-card-practice-clock')).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(
      screen.getByPlaceholderText('Szukaj po temacie, typie zadania lub słowie kluczowym...')
    ).toHaveClass('soft-card', 'focus:border-indigo-300');
    expect(screen.getByText('Monitorowanie zadań')).toBeInTheDocument();
    expect(screen.getByText('Aktywne').parentElement).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(screen.getByText('Do rozpoczecia').parentElement).toHaveClass(
      'soft-card',
      'border-amber-300'
    );
    expect(screen.getByText('Aktywne zadania')).toBeInTheDocument();
    expect(screen.getAllByText('Praktyka: Dzielenie').length).toBeGreaterThanOrEqual(1);

    await userEvent.click(practiceFilter);

    expect(practiceFilter).toHaveClass('text-indigo-700', 'ring-1');
    expect(practiceFilter).toHaveAttribute('aria-pressed', 'true');
    expect(allFilter).toHaveClass('text-slate-500', 'bg-transparent');
    expect(allFilter).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Nauka zegara')).not.toBeInTheDocument();
    expect(screen.getAllByText('Trening mieszany').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Trening: Dzielenie')).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText('Szukaj po temacie, typie zadania lub słowie kluczowym...'),
      'dzielenie'
    );

    expect(screen.queryByText('Nauka zegara')).not.toBeInTheDocument();
    expect(screen.getByText('Trening: Dzielenie')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Przypisz' })[0]!);

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
          title: 'Powtorka: Zegar',
          description: 'Powtorz lekcje zegara.',
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
            summary: 'Powtorki po przydziale: 1/1.',
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

    expect(screen.getByText('Monitorowanie zadań')).toBeInTheDocument();
    expect(screen.getByText('Do uwagi')).toBeInTheDocument();
    expect(screen.getByText('Skutecznosc wykonania')).toBeInTheDocument();
    expect(screen.getByText('Skutecznosc wykonania').parentElement).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(
      screen.getByText('Wysoki priorytet, ale uczen jeszcze nie rozpoczal tego zadania.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Postep jest ponizej polowy celu, warto przypomniec o kontynuacji.')
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Przypisz sugestię' }));

    expect(createAssignmentMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('To zadanie jest juz aktywne.')).toBeInTheDocument();
  });

  it('uses the shared empty-state surface when no attention items are present', () => {
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-1',
          learnerKey: 'ada@example.com',
          title: 'Powtorka: Zegar',
          description: 'Powtorz lekcje zegara.',
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
            summary: 'Powtorki po przydziale: 1/1.',
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

    expect(screen.getByTestId('assignment-manager-attention-empty')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80'
    );
    expect(screen.getByText('Brak zadań wymagających dodatkowej reakcji.')).toBeInTheDocument();
  });
});

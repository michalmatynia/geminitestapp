/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityTypes } from '@/shared/constants/observability';

const runtimeState = vi.hoisted(() => ({
  value: {
    activeLearner: {
      id: 'learner-1',
      displayName: 'Ada',
    },
    activeTab: 'monitoring',
    canAccessDashboard: true,
    progress: {
      totalXp: 0,
      gamesPlayed: 0,
      perfectGames: 0,
      lessonsCompleted: 0,
      clockPerfect: 0,
      calendarPerfect: 0,
      geometryPerfect: 0,
      badges: [],
      operationsPlayed: [],
      totalCorrectAnswers: 0,
      totalQuestionsAnswered: 0,
      bestWinStreak: 0,
      activityStats: {},
      lessonMastery: {},
      openedTasks: [],
      lessonPanelProgress: {},
    },
  },
}));
const useKangurPageContentEntryMock = vi.hoisted(() => vi.fn());
const learnerInteractionsListMock = vi.hoisted(() => vi.fn());
const lessonsState = vi.hoisted(() => ({
  value: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  useKangurParentDashboardRuntime: () => runtimeState.value,
  shouldRenderKangurParentDashboardPanel: () => true,
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    learnerInteractions: {
      list: learnerInteractionsListMock,
    },
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: () => ({
    data: lessonsState.value,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => null,
  }),
}));

import { KangurParentDashboardAssignmentsMonitoringWidget } from './KangurParentDashboardAssignmentsMonitoringWidget';

describe('KangurParentDashboardAssignmentsMonitoringWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lessonsState.value = [];
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: null,
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });
  });

  it('shows empty state when no interactions are available', async () => {
    learnerInteractionsListMock.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });

    render(<KangurParentDashboardAssignmentsMonitoringWidget />);

    await waitFor(() =>
      expect(
        screen.getByTestId('parent-monitoring-interactions-empty')
      ).toBeInTheDocument()
    );
  });

  it('shows error state when interactions fail to load', async () => {
    learnerInteractionsListMock.mockRejectedValue(new Error('network error'));

    render(<KangurParentDashboardAssignmentsMonitoringWidget />);

    await waitFor(() =>
      expect(
        screen.getByTestId('parent-monitoring-interactions-error')
      ).toBeInTheDocument()
    );
  });

  it('loads more interactions when requested', async () => {
    learnerInteractionsListMock
      .mockResolvedValueOnce({
        items: [
          {
            id: 'activity-1',
            type: ActivityTypes.KANGUR.LEARNER_SESSION,
            description: 'Sesja logowania ucznia.',
            userId: 'parent-1',
            entityId: 'learner-1',
            entityType: 'kangur_learner',
            metadata: {
              startedAt: '2026-03-15T10:00:00.000Z',
              endedAt: '2026-03-15T10:30:00.000Z',
              durationSeconds: 1800,
            },
            createdAt: '2026-03-15T10:30:00.000Z',
            updatedAt: '2026-03-15T10:30:00.000Z',
          },
          {
            id: 'activity-2',
            type: ActivityTypes.KANGUR.LEARNER_SESSION,
            description: 'Sesja logowania ucznia.',
            userId: 'parent-1',
            entityId: 'learner-1',
            entityType: 'kangur_learner',
            metadata: {
              startedAt: '2026-03-15T11:00:00.000Z',
              endedAt: '2026-03-15T11:20:00.000Z',
              durationSeconds: 1200,
            },
            createdAt: '2026-03-15T11:20:00.000Z',
            updatedAt: '2026-03-15T11:20:00.000Z',
          },
        ],
        total: 3,
        limit: 20,
        offset: 0,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 'activity-3',
            type: ActivityTypes.KANGUR.LEARNER_SESSION,
            description: 'Sesja logowania ucznia.',
            userId: 'parent-1',
            entityId: 'learner-1',
            entityType: 'kangur_learner',
            metadata: {
              startedAt: '2026-03-15T12:00:00.000Z',
              endedAt: null,
              durationSeconds: null,
            },
            createdAt: '2026-03-15T12:00:00.000Z',
            updatedAt: '2026-03-15T12:00:00.000Z',
          },
        ],
        total: 3,
        limit: 20,
        offset: 2,
      });

    render(<KangurParentDashboardAssignmentsMonitoringWidget />);

    await waitFor(() =>
      expect(
        screen.getByTestId('parent-monitoring-interaction-activity-1')
      ).toBeInTheDocument()
    );

    const loadMoreButton = screen.getByRole('button', { name: 'Pokaż starsze' });
    fireEvent.click(loadMoreButton);

    await waitFor(() => expect(learnerInteractionsListMock).toHaveBeenCalledTimes(2));
    expect(learnerInteractionsListMock).toHaveBeenLastCalledWith('learner-1', {
      limit: 20,
      offset: 2,
    });
    expect(
      screen.getByTestId('parent-monitoring-interaction-activity-3')
    ).toBeInTheDocument();
  });

  it('filters interactions by type', async () => {
    learnerInteractionsListMock.mockResolvedValue({
      items: [
        {
          id: 'activity-opened',
          type: ActivityTypes.KANGUR.OPENED_TASK,
          description: 'Otwarte zadanie: Powtórka',
          userId: 'parent-1',
          entityId: 'learner-1',
          entityType: 'kangur_learner',
          metadata: {
            kind: 'lesson',
            title: 'Powtórka',
            openedAt: '2026-03-15T09:00:00.000Z',
          },
          createdAt: '2026-03-15T09:00:00.000Z',
          updatedAt: '2026-03-15T09:00:00.000Z',
        },
        {
          id: 'activity-panel',
          type: ActivityTypes.KANGUR.LESSON_PANEL_ACTIVITY,
          description: 'Aktywność w panelach lekcji',
          userId: 'parent-1',
          entityId: 'learner-1',
          entityType: 'kangur_learner',
          metadata: {
            lessonKey: 'clock',
            sectionId: 'section-1',
            sessionUpdatedAt: '2026-03-15T10:00:00.000Z',
            totalSeconds: 120,
          },
          createdAt: '2026-03-15T10:00:00.000Z',
          updatedAt: '2026-03-15T10:00:00.000Z',
        },
        {
          id: 'activity-session',
          type: ActivityTypes.KANGUR.LEARNER_SESSION,
          description: 'Sesja logowania ucznia.',
          userId: 'parent-1',
          entityId: 'learner-1',
          entityType: 'kangur_learner',
          metadata: {
            startedAt: '2026-03-15T11:00:00.000Z',
            endedAt: '2026-03-15T11:30:00.000Z',
            durationSeconds: 1800,
          },
          createdAt: '2026-03-15T11:30:00.000Z',
          updatedAt: '2026-03-15T11:30:00.000Z',
        },
      ],
      total: 3,
      limit: 20,
      offset: 0,
    });

    render(<KangurParentDashboardAssignmentsMonitoringWidget />);

    await waitFor(() =>
      expect(
        screen.getByTestId('parent-monitoring-interaction-activity-opened')
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Zadania' }));

    await waitFor(() =>
      expect(
        screen.getByTestId('parent-monitoring-interaction-activity-opened')
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByTestId('parent-monitoring-interaction-activity-panel')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('parent-monitoring-interaction-activity-session')
    ).not.toBeInTheDocument();
  });

  it('filters interactions by date range', async () => {
    learnerInteractionsListMock.mockResolvedValue({
      items: [
        {
          id: 'activity-early',
          type: ActivityTypes.KANGUR.OPENED_TASK,
          description: 'Otwarte zadanie: Powtórka',
          userId: 'parent-1',
          entityId: 'learner-1',
          entityType: 'kangur_learner',
          metadata: {
            kind: 'lesson',
            title: 'Powtórka',
            openedAt: '2026-03-13T09:00:00.000Z',
          },
          createdAt: '2026-03-13T09:00:00.000Z',
          updatedAt: '2026-03-13T09:00:00.000Z',
        },
        {
          id: 'activity-late',
          type: ActivityTypes.KANGUR.OPENED_TASK,
          description: 'Otwarte zadanie: Kolejne',
          userId: 'parent-1',
          entityId: 'learner-1',
          entityType: 'kangur_learner',
          metadata: {
            kind: 'lesson',
            title: 'Kolejne',
            openedAt: '2026-03-16T09:00:00.000Z',
          },
          createdAt: '2026-03-16T09:00:00.000Z',
          updatedAt: '2026-03-16T09:00:00.000Z',
        },
      ],
      total: 2,
      limit: 20,
      offset: 0,
    });

    render(<KangurParentDashboardAssignmentsMonitoringWidget />);

    await waitFor(() =>
      expect(
        screen.getByTestId('parent-monitoring-interaction-activity-early')
      ).toBeInTheDocument()
    );

    fireEvent.change(screen.getByLabelText('Data od'), {
      target: { value: '2026-03-15' },
    });

    await waitFor(() =>
      expect(
        screen.queryByTestId('parent-monitoring-interaction-activity-early')
      ).not.toBeInTheDocument()
    );
    expect(
      screen.getByTestId('parent-monitoring-interaction-activity-late')
    ).toBeInTheDocument();
  });
});

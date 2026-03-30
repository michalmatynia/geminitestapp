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
    lessons: [],
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

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  useKangurParentDashboardRuntime: () => runtimeState.value,
  shouldRenderKangurParentDashboardPanel: (displayMode: string, activeTab: string, targetTab: string) =>
    displayMode === 'always' || activeTab === targetTab,
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

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => null,
  }),
}));

import { KangurParentDashboardAssignmentsMonitoringWidget } from '../../KangurParentDashboardAssignmentsMonitoringWidget';

describe('KangurParentDashboardAssignmentsMonitoringWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.value = {
      activeLearner: {
        id: 'learner-1',
        displayName: 'Ada',
      },
      activeTab: 'monitoring',
      canAccessDashboard: true,
      lessons: [],
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
    };
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

  it('shows a loading shell before the deferred interaction fetch starts', async () => {
    learnerInteractionsListMock.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });

    render(<KangurParentDashboardAssignmentsMonitoringWidget />);

    expect(screen.getByTestId('parent-monitoring-interactions-loading')).toBeInTheDocument();
    expect(learnerInteractionsListMock).not.toHaveBeenCalled();

    await waitFor(() => expect(learnerInteractionsListMock).toHaveBeenCalledTimes(1), {
      timeout: 2_000,
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
    , { timeout: 2_000 });
  });

  it('does not fetch interactions when another parent tab is active', () => {
    runtimeState.value = {
      ...runtimeState.value,
      activeTab: 'progress',
    };

    render(<KangurParentDashboardAssignmentsMonitoringWidget displayMode='active-tab' />);

    expect(screen.queryByTestId('parent-monitoring-overview')).toBeNull();
    expect(learnerInteractionsListMock).not.toHaveBeenCalled();
  });

  it('shows error state when interactions fail to load', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    learnerInteractionsListMock.mockRejectedValue(new Error('network error'));

    render(<KangurParentDashboardAssignmentsMonitoringWidget />);

    await waitFor(() =>
      expect(
        screen.getByTestId('parent-monitoring-interactions-error')
      ).toBeInTheDocument()
    , { timeout: 2_000 });
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('renders overview cards, activity mix, and lesson time leaders for readable monitoring', async () => {
    runtimeState.value = {
      ...runtimeState.value,
      lessons: [
        {
          componentId: 'clock',
          title: 'Zegar',
        },
      ],
      progress: {
        ...runtimeState.value.progress,
        lessonPanelProgress: {
          clock: {
            intro: {
              label: 'Wprowadzenie',
              totalCount: 3,
              viewedCount: 2,
              sessionUpdatedAt: '2026-03-15T10:15:00.000Z',
              lastViewedAt: '2026-03-15T10:15:00.000Z',
              panelTimes: {
                panel_1: { seconds: 90, title: 'Panel 1' },
                panel_2: { seconds: 150, title: 'Panel 2' },
              },
            },
          },
        },
      },
    };
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
            label: 'Wprowadzenie',
            sessionUpdatedAt: '2026-03-15T10:00:00.000Z',
            totalSeconds: 240,
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
      expect(screen.getByTestId('parent-monitoring-overview-total')).toHaveTextContent('3')
    , { timeout: 2_000 });

    expect(screen.getByTestId('parent-monitoring-overview-sessions')).toHaveTextContent('1');
    expect(screen.getByTestId('parent-monitoring-overview-opened-tasks')).toHaveTextContent('1');
    expect(screen.getByTestId('parent-monitoring-overview-lesson-panels')).toHaveTextContent('1');
    expect(screen.getByTestId('parent-monitoring-activity-mix-session')).toBeInTheDocument();
    expect(screen.getByTestId('parent-monitoring-lesson-focus')).toHaveTextContent('Zegar');
    expect(screen.getByTestId('parent-monitoring-lesson-focus')).toHaveTextContent('4m 00s');
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
    , { timeout: 2_000 });

    const loadMoreButton = screen.getByRole('button', {
      name: 'Pokaż starsze',
    });
    expect(loadMoreButton).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');
    fireEvent.click(loadMoreButton);

    await waitFor(() => expect(learnerInteractionsListMock).toHaveBeenCalledTimes(2), {
      timeout: 2_000,
    });
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
    , { timeout: 2_000 });

    const taskFilterTab = screen.getByRole('tab', { name: 'Zadania' });
    expect(taskFilterTab).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');
    fireEvent.click(taskFilterTab);

    await waitFor(() =>
      expect(
        screen.getByTestId('parent-monitoring-interaction-activity-opened')
      ).toBeInTheDocument()
    , { timeout: 2_000 });
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
    , { timeout: 2_000 });

    fireEvent.change(screen.getByLabelText('Data od'), {
      target: { value: '2026-03-15' },
    });

    expect(screen.getByRole('button', { name: 'Wyczyść filtry' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );

    await waitFor(() =>
      expect(
        screen.queryByTestId('parent-monitoring-interaction-activity-early')
      ).not.toBeInTheDocument()
    , { timeout: 2_000 });
    expect(
      screen.getByTestId('parent-monitoring-interaction-activity-late')
    ).toBeInTheDocument();
  });
});

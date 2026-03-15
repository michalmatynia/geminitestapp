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

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: () => null,
  }),
}));

import { KangurParentDashboardAssignmentsMonitoringWidget } from './KangurParentDashboardAssignmentsMonitoringWidget';

describe('KangurParentDashboardAssignmentsMonitoringWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeState = vi.hoisted(() => ({
  value: {
    activeLearner: { id: 'learner-1', displayName: 'Maja' },
    activeTab: 'progress',
    canAccessDashboard: true,
    progress: {
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
      bestWinStreak: 2,
      activityStats: {},
      lessonMastery: {},
    },
  },
}));

const progressOverviewMock = vi.hoisted(() => vi.fn());
const getCurrentKangurDailyQuestMock = vi.hoisted(() => vi.fn());
const useKangurPageContentEntryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  shouldRenderKangurParentDashboardPanel: (displayMode: string, activeTab: string, targetTab: string) =>
    displayMode === 'always' || activeTab === targetTab,
  useKangurParentDashboardRuntime: () => runtimeState.value,
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/components/ProgressOverview', () => ({
  default: (props: unknown) => {
    progressOverviewMock(props);
    return <div data-testid='progress-overview-stub' />;
  },
}));

import { KangurParentDashboardProgressWidget } from './KangurParentDashboardProgressWidget';

describe('KangurParentDashboardProgressWidget', () => {
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
    runtimeState.value = {
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
      activeTab: 'progress',
      canAccessDashboard: true,
      progress: {
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
        bestWinStreak: 2,
        activityStats: {},
        lessonMastery: {},
      },
    };
  });

  it('passes the resolved daily quest into the shared progress overview', () => {
    const dailyQuest = {
      assignment: { title: 'Trening mieszany' },
      progress: { percent: 100, summary: '1/1 runda dzisiaj', status: 'completed' },
      reward: { label: 'Nagroda gotowa +36 XP', status: 'ready' },
    };

    getCurrentKangurDailyQuestMock.mockReturnValue(dailyQuest);

    render(<KangurParentDashboardProgressWidget />);

    expect(screen.getByTestId('progress-overview-stub')).toBeInTheDocument();
    expect(getCurrentKangurDailyQuestMock).toHaveBeenCalledWith(runtimeState.value.progress);
    expect(progressOverviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        progress: runtimeState.value.progress,
        dailyQuest,
      })
    );
  });

  it('does not render when the dashboard is inaccessible', () => {
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
    };

    render(<KangurParentDashboardProgressWidget />);

    expect(screen.queryByTestId('progress-overview-stub')).toBeNull();
    expect(getCurrentKangurDailyQuestMock).not.toHaveBeenCalled();
  });

  it('does not render when no active learner is selected', () => {
    runtimeState.value = {
      ...runtimeState.value,
      activeLearner: null,
    };

    render(<KangurParentDashboardProgressWidget />);

    expect(screen.queryByTestId('progress-overview-stub')).toBeNull();
    expect(getCurrentKangurDailyQuestMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Postęp ucznia')).toBeNull();
  });

  it('renders Mongo-backed section intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: {
        id: 'parent-dashboard-progress',
        title: 'Postęp ucznia',
        summary: 'Sprawdź rytm nauki i główny kierunek dalszej pracy.',
      },
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

    render(<KangurParentDashboardProgressWidget />);

    expect(screen.getByText('Postęp ucznia')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(
      screen.getByText('Sprawdź rytm nauki i główny kierunek dalszej pracy.')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
  });
});

/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeState = vi.hoisted(() => ({
  value: {
    activeTab: 'assign',
    basePath: '/kangur',
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

const assignmentManagerMock = vi.hoisted(() => vi.fn());
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

vi.mock('@/features/kangur/ui/components/KangurAssignmentManager', () => ({
  default: (props: unknown) => {
    assignmentManagerMock(props);
    return <div data-testid='assignment-manager-stub' />;
  },
}));

import { KangurParentDashboardAssignmentsWidget } from './KangurParentDashboardAssignmentsWidget';

describe('KangurParentDashboardAssignmentsWidget', () => {
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
      activeTab: 'assign',
      basePath: '/kangur',
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

  it('passes the resolved daily quest into the assignment manager', () => {
    const dailyQuest = {
      assignment: { id: 'mixed-practice', title: 'Trening mieszany' },
      progress: { percent: 100, summary: '1/1 runda dzisiaj', status: 'completed' },
      reward: { label: 'Nagroda gotowa +36 XP', status: 'ready' },
    };
    getCurrentKangurDailyQuestMock.mockReturnValue(dailyQuest);

    render(<KangurParentDashboardAssignmentsWidget />);

    expect(screen.getByTestId('assignment-manager-stub')).toBeInTheDocument();
    expect(getCurrentKangurDailyQuestMock).toHaveBeenCalledWith(runtimeState.value.progress);
    expect(assignmentManagerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: '/kangur',
        featuredDailyQuest: dailyQuest,
      })
    );
  });

  it('does not render when the dashboard is inaccessible', () => {
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
    };

    render(<KangurParentDashboardAssignmentsWidget />);

    expect(screen.queryByTestId('assignment-manager-stub')).toBeNull();
    expect(assignmentManagerMock).not.toHaveBeenCalled();
  });

  it('renders Mongo-backed section intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: {
        id: 'parent-dashboard-assignments',
        title: 'Zadania ucznia',
        summary: 'Nadaj priorytet pracy i sprawdź, co wymaga przypomnienia.',
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

    render(<KangurParentDashboardAssignmentsWidget />);

    expect(screen.getByText('Zadania ucznia')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(
      screen.getByText('Nadaj priorytet pracy i sprawdź, co wymaga przypomnienia.')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
  });
});

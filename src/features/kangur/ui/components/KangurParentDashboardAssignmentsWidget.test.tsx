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

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  shouldRenderKangurParentDashboardPanel: (displayMode: string, activeTab: string, targetTab: string) =>
    displayMode === 'always' || activeTab === targetTab,
  useKangurParentDashboardRuntime: () => runtimeState.value,
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
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
});

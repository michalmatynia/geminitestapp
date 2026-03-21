/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeState = vi.hoisted(() => ({
  value: {
    activeLearner: { id: 'learner-1', displayName: 'Maja' },
    activeTab: 'assign',
    basePath: '/kangur',
    canAccessDashboard: true,
    learners: [
      { id: 'learner-1', displayName: 'Maja', loginName: 'maja', status: 'active' },
      { id: 'learner-2', displayName: 'Tomek', loginName: 'tomek', status: 'active' },
    ],
    selectLearner: vi.fn(),
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
const useKangurPageContentEntryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  shouldRenderKangurParentDashboardPanel: (displayMode: string, activeTab: string, targetTab: string) =>
    displayMode === 'always' || activeTab === targetTab,
  useKangurParentDashboardRuntime: () => runtimeState.value,
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
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
      activeTab: 'assign',
      basePath: '/kangur',
      canAccessDashboard: true,
      learners: [
        { id: 'learner-1', displayName: 'Maja', loginName: 'maja', status: 'active' },
        { id: 'learner-2', displayName: 'Tomek', loginName: 'tomek', status: 'active' },
      ],
      selectLearner: vi.fn(),
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

  it('renders the assignment manager for the active learner', () => {
    render(<KangurParentDashboardAssignmentsWidget />);

    expect(screen.getByTestId('assignment-manager-stub')).toBeInTheDocument();
    expect(assignmentManagerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: '/kangur',
        view: 'catalogWithLists',
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

  it('does not render when no active learner is selected', () => {
    runtimeState.value = {
      ...runtimeState.value,
      activeLearner: null,
    };

    render(<KangurParentDashboardAssignmentsWidget />);

    expect(screen.queryByTestId('assignment-manager-stub')).toBeNull();
    expect(screen.queryByText('widgets.assignments.title')).toBeNull();
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

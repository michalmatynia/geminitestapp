/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeState = vi.hoisted(() => ({
  value: {
    activeLearner: { id: 'learner-1', displayName: 'Maja' },
    activeTab: 'progress',
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

const getCurrentKangurDailyQuestMock = vi.hoisted(() => vi.fn());
const useKangurPageContentEntryMock = vi.hoisted(() => vi.fn());
const useKangurAssignmentsMock = vi.hoisted(() => vi.fn());
const useKangurParentDashboardScoresMock = vi.hoisted(() => vi.fn());
const assignmentsListMock = vi.hoisted(() => vi.fn());
const assignmentManagerMock = vi.hoisted(() => vi.fn());
const useKangurSubjectFocusMock = vi.hoisted(() => vi.fn());
const lessonsState = vi.hoisted(() => ({
  value: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  shouldRenderKangurParentDashboardPanel: (displayMode: string, activeTab: string, targetTab: string) =>
    displayMode === 'always' || activeTab === targetTab,
  useKangurParentDashboardRuntime: () => runtimeState.value,
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurParentDashboardScores', () => ({
  useKangurParentDashboardScores: () => useKangurParentDashboardScoresMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: () => ({
    data: lessonsState.value,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentsList', () => ({
  default: (props: unknown) => {
    assignmentsListMock(props);
    return <div data-testid='assignments-list-stub' />;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurAssignmentManager', () => ({
  default: (props: unknown) => {
    assignmentManagerMock(props);
    return <div data-testid='assignment-manager-stub' />;
  },
}));

import { KangurParentDashboardProgressWidget } from './KangurParentDashboardProgressWidget';

describe('KangurParentDashboardProgressWidget', () => {
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
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
    });
    useKangurParentDashboardScoresMock.mockReturnValue({
      isLoadingScores: false,
      scores: [],
      scoresError: null,
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    runtimeState.value = {
      activeLearner: { id: 'learner-1', displayName: 'Maja' },
      activeTab: 'progress',
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
        activityStats: {
          'operation:addition': {
            sessionsPlayed: 3,
            totalCorrectAnswers: 18,
            totalQuestionsAnswered: 24,
            bestScorePercent: 92,
            totalXpEarned: 45,
          },
        },
        lessonMastery: {
          clock: {
            attempts: 3,
            bestScorePercent: 91,
            lastCompletedAt: '2026-03-15T10:00:00.000Z',
            lastScorePercent: 88,
            masteryPercent: 84,
          },
        },
      },
    };
  });

  it('renders the daily quest summary when available', () => {
    const dailyQuest = {
      assignment: {
        title: 'Trening mieszany',
        action: { label: 'Uruchom', page: 'Game' },
      },
      progress: { percent: 100, summary: '1/1 runda dzisiaj', status: 'completed' },
      reward: { label: 'Nagroda gotowa +36 XP', status: 'ready' },
    };

    getCurrentKangurDailyQuestMock.mockReturnValue(dailyQuest);

    render(<KangurParentDashboardProgressWidget />);

    expect(screen.getByTestId('parent-dashboard-daily-quest')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Uruchom' })).toHaveClass('min-h-11', 'px-4');
    expect(getCurrentKangurDailyQuestMock).toHaveBeenCalledWith(
      runtimeState.value.progress,
      expect.objectContaining({
        subject: 'maths',
        translate: expect.any(Function),
      })
    );
    expect(screen.getAllByTestId('assignments-list-stub')).toHaveLength(2);
    expect(assignmentsListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ostatnie aktywne zadania',
      })
    );
    expect(assignmentsListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Aktywne zadania',
      })
    );
    expect(screen.getByTestId('assignment-manager-stub')).toBeInTheDocument();
    expect(assignmentManagerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: '/kangur',
        view: 'metrics',
      })
    );
  });

  it('does not render when the dashboard is inaccessible', () => {
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
    };

    render(<KangurParentDashboardProgressWidget />);

    expect(screen.queryByTestId('parent-dashboard-daily-quest')).toBeNull();
    expect(getCurrentKangurDailyQuestMock).not.toHaveBeenCalled();
    expect(assignmentsListMock).not.toHaveBeenCalled();
    expect(assignmentManagerMock).not.toHaveBeenCalled();
  });

  it('does not render when no active learner is selected', () => {
    runtimeState.value = {
      ...runtimeState.value,
      activeLearner: null,
    };

    render(<KangurParentDashboardProgressWidget />);

    expect(screen.queryByTestId('parent-dashboard-daily-quest')).toBeNull();
    expect(getCurrentKangurDailyQuestMock).not.toHaveBeenCalled();
    expect(screen.queryByText('widgets.progress.title')).toBeNull();
    expect(assignmentsListMock).not.toHaveBeenCalled();
    expect(assignmentManagerMock).not.toHaveBeenCalled();
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
    expect(assignmentsListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ostatnie aktywne zadania',
      })
    );
    expect(assignmentsListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Aktywne zadania',
      })
    );
    expect(assignmentManagerMock).toHaveBeenCalled();
  });

  it('renders analytics, weekly activity, and mastery summaries above the assignment sections', () => {
    render(<KangurParentDashboardProgressWidget />);

    expect(screen.getByTestId('parent-dashboard-progress-analytics')).toBeInTheDocument();
    expect(
      screen.getByTestId('parent-dashboard-progress-analytics-average-accuracy')
    ).toHaveTextContent('80%');
    expect(screen.getByTestId('parent-dashboard-progress-weekly-activity')).toBeInTheDocument();
    expect(screen.getByTestId('parent-dashboard-progress-operation-focus')).toHaveTextContent(
      'Dodawanie'
    );
    expect(screen.getByTestId('parent-dashboard-progress-mastery-summary')).toBeInTheDocument();
    expect(screen.getByTestId('parent-dashboard-progress-mastery-tracked')).toHaveTextContent('1');
  });

  it('shows a loading chip while weekly activity scores are being fetched', () => {
    useKangurParentDashboardScoresMock.mockReturnValue({
      isLoadingScores: true,
      scores: [],
      scoresError: null,
    });

    render(<KangurParentDashboardProgressWidget />);

    expect(screen.getByTestId('parent-dashboard-progress-weekly-activity')).toHaveTextContent(
      'Ładujemy historię sesji'
    );
  });

  it('shows an error chip when weekly activity scores fail to load', () => {
    useKangurParentDashboardScoresMock.mockReturnValue({
      isLoadingScores: false,
      scores: [],
      scoresError: new Error('load failed'),
    });

    render(<KangurParentDashboardProgressWidget />);

    expect(screen.getByTestId('parent-dashboard-progress-weekly-activity')).toHaveTextContent(
      'Nie udało się wczytać pełnej historii wyników'
    );
  });
});

/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runtimeState, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  runtimeState: {
    value: {
      activeLearner: {
        id: 'learner-1',
      },
      activeTab: 'scores',
      basePath: '/kangur',
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
      },
      scoreViewerEmail: 'parent@example.com',
      scoreViewerName: 'Ada',
    },
  },
  useKangurPageContentEntryMock: vi.fn(),
}));

const scoreHistoryMock = vi.hoisted(() => vi.fn());
const progressOverviewMock = vi.hoisted(() => vi.fn());
const getCurrentKangurDailyQuestMock = vi.hoisted(() => vi.fn());
const useKangurSubjectFocusMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  shouldRenderKangurParentDashboardPanel: (displayMode: string, activeTab: string, targetTab: string) =>
    displayMode === 'always' || activeTab === targetTab,
  useKangurParentDashboardRuntime: () => runtimeState.value,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/services/daily-quests', () => ({
  getCurrentKangurDailyQuest: getCurrentKangurDailyQuestMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/components/ProgressOverview', () => ({
  default: (props: unknown) => {
    progressOverviewMock(props);
    return <div data-testid='progress-overview-stub' />;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurBadgeTrackHighlights', () => ({
  default: () => <div data-testid='badge-track-highlights-stub' />,
}));

vi.mock('@/features/kangur/ui/components/ScoreHistory', () => ({
  default: (props: unknown) => {
    scoreHistoryMock(props);
    return <div data-testid='score-history-stub' />;
  },
}));

import { KangurParentDashboardScoresWidget } from './KangurParentDashboardScoresWidget';

describe('KangurParentDashboardScoresWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.value = {
      activeLearner: {
        id: 'learner-1',
      },
      activeTab: 'scores',
      basePath: '/kangur',
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
      },
      scoreViewerEmail: 'parent@example.com',
      scoreViewerName: 'Ada',
    };
    getCurrentKangurDailyQuestMock.mockReturnValue(null);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
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

  it('passes the learner-scoped filters into shared score history', () => {
    render(<KangurParentDashboardScoresWidget />);

    expect(screen.getByTestId('score-history-stub')).toBeInTheDocument();
    expect(screen.getByTestId('progress-overview-stub')).toBeInTheDocument();
    expect(getCurrentKangurDailyQuestMock).toHaveBeenCalledWith(
      runtimeState.value.progress,
      expect.objectContaining({
        subject: 'maths',
        translate: expect.any(Function),
      })
    );
    expect(scoreHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: '/kangur',
        createdBy: 'parent@example.com',
        learnerId: 'learner-1',
        playerName: 'Ada',
      })
    );
    expect(progressOverviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        progress: runtimeState.value.progress,
        dailyQuest: null,
      })
    );
  });

  it('renders Mongo-backed section intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: {
        id: 'parent-dashboard-scores',
        title: 'Wyniki ucznia',
        summary: 'Sprawdź ostatnie gry i obszary, które warto teraz powtórzyć.',
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

    render(<KangurParentDashboardScoresWidget />);

    expect(screen.getByText('Wyniki ucznia')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(
      screen.getByText('Sprawdź ostatnie gry i obszary, które warto teraz powtórzyć.')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
  });

  it('does not render when the dashboard is inaccessible', () => {
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
    };

    render(<KangurParentDashboardScoresWidget />);

    expect(screen.queryByTestId('score-history-stub')).toBeNull();
    expect(scoreHistoryMock).not.toHaveBeenCalled();
    expect(progressOverviewMock).not.toHaveBeenCalled();
  });

  it('does not render when no active learner is selected', () => {
    runtimeState.value = {
      ...runtimeState.value,
      activeLearner: null,
    };

    render(<KangurParentDashboardScoresWidget />);

    expect(screen.queryByTestId('score-history-stub')).toBeNull();
    expect(scoreHistoryMock).not.toHaveBeenCalled();
    expect(progressOverviewMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Wyniki ucznia')).toBeNull();
  });
});

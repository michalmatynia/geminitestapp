/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
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

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  shouldRenderKangurParentDashboardPanel: (displayMode: string, activeTab: string, targetTab: string) =>
    displayMode === 'always' || activeTab === targetTab,
  useKangurParentDashboardRuntimeShellState: () => runtimeState.value,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
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

  it('renders a compatibility notice instead of score content', () => {
    render(<KangurParentDashboardScoresWidget />);

    expect(screen.getByText('Learner results moved')).toBeInTheDocument();
    expect(screen.getByText('This widget moved to the Learner Profile screen.')).toBeInTheDocument();
  });

  it('renders Mongo-backed section intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: {
        id: 'parent-dashboard-scores',
        title: 'Wyniki przeniesiono do Profilu Ucznia',
        summary: 'Otwórz Profil Ucznia, aby zobaczyć wyniki, skuteczność i historię gier.',
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

    expect(screen.getByText('Wyniki przeniesiono do Profilu Ucznia')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(
      screen.getByText('Otwórz Profil Ucznia, aby zobaczyć wyniki, skuteczność i historię gier.')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
  });

  it('does not render when the dashboard is inaccessible', () => {
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
    };

    render(<KangurParentDashboardScoresWidget />);

    expect(screen.queryByText('Learner results moved')).toBeNull();
  });

  it('still renders the move notice when no active learner is selected', () => {
    runtimeState.value = {
      ...runtimeState.value,
      activeLearner: null,
    };

    render(<KangurParentDashboardScoresWidget />);

    expect(screen.getByText('Learner results moved')).toBeInTheDocument();
  });
});

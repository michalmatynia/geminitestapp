/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurLearnerProfileRuntimeMock,
  useKangurPageContentEntryMock,
} = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

const scoreHistoryMock = vi.hoisted(() => vi.fn());
const progressOverviewMock = vi.hoisted(() => vi.fn());
const getCurrentKangurDailyQuestMock = vi.hoisted(() => vi.fn());
const useKangurSubjectFocusMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
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

import { KangurLearnerProfileResultsWidget } from './KangurLearnerProfileResultsWidget';

const runtimeValue = {
  basePath: '/kangur',
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
  scores: [
    {
      id: 'score-1',
      created_date: '2026-03-26T10:00:00.000Z',
      player_name: 'Ada',
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      operation: 'addition',
      subject: 'maths',
      score: 8,
      total_questions: 10,
      correct_answers: 8,
      time_taken: 42,
      xp_earned: 24,
    },
  ],
  isLoadingScores: false,
  user: {
    full_name: 'Ada Parent',
    email: 'ada@example.com',
    activeLearner: {
      id: 'learner-1',
      displayName: 'Ada',
    },
  },
};

describe('KangurLearnerProfileResultsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurLearnerProfileRuntimeMock.mockReturnValue(runtimeValue);
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
    render(<KangurLearnerProfileResultsWidget />);

    expect(screen.getByTestId('score-history-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('progress-overview-stub')).toBeNull();
    expect(getCurrentKangurDailyQuestMock).not.toHaveBeenCalled();
    expect(scoreHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: '/kangur',
        createdBy: 'ada@example.com',
        learnerId: 'learner-1',
        playerName: 'Ada',
        prefetchedLoading: false,
        prefetchedScores: runtimeValue.scores,
      })
    );
    expect(progressOverviewMock).not.toHaveBeenCalled();
  });

  it('renders learner-profile intro copy when a page-content entry exists', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: {
        id: 'learner-profile-results',
        title: 'Wyniki ucznia',
        summary: 'Przeglądaj ostatnie gry i sprawdź, co warto powtórzyć.',
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

    render(<KangurLearnerProfileResultsWidget />);

    expect(screen.getByTestId('learner-profile-results-intro')).toHaveTextContent(
      'Wyniki ucznia'
    );
    expect(screen.getByTestId('learner-profile-results-intro')).toHaveTextContent(
      'Przeglądaj ostatnie gry i sprawdź, co warto powtórzyć.'
    );
  });

  it('does not render when no active learner is selected', () => {
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      ...runtimeValue,
      user: {
        ...runtimeValue.user,
        activeLearner: null,
      },
    });

    render(<KangurLearnerProfileResultsWidget />);

    expect(screen.queryByTestId('score-history-stub')).toBeNull();
    expect(scoreHistoryMock).not.toHaveBeenCalled();
    expect(progressOverviewMock).not.toHaveBeenCalled();
  });
});

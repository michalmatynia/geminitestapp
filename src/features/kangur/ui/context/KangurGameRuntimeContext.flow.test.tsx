/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  buildKangurCompletedGameOutcomeMock,
  generateQuestionsMock,
  scoreCreateMock,
  trackKangurClientEventMock,
  useKangurAssignmentsMock,
  useKangurAuthMock,
  useKangurDeferredStandaloneHomeReadyMock,
  useKangurProgressStateMock,
  useKangurRoutingMock,
  useKangurSubjectFocusMock,
} = vi.hoisted(() => ({
  buildKangurCompletedGameOutcomeMock: vi.fn(),
  generateQuestionsMock: vi.fn(),
  scoreCreateMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  useKangurAssignmentsMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurDeferredStandaloneHomeReadyMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  useKangurRoutingMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
}));

vi.mock('@kangur/core', () => ({
  DIFFICULTY_CONFIG: {
    easy: { timeLimit: 10 },
    medium: { timeLimit: 15 },
    hard: { timeLimit: 20 },
  },
  generateQuestions: generateQuestionsMock,
  generateTrainingQuestions: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      create: scoreCreateMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
  useKangurAuthSessionState: () => {
    const auth = useKangurAuthMock();
    return {
      user: auth.user ?? null,
      isAuthenticated: auth.isAuthenticated ?? false,
      hasResolvedAuth: auth.hasResolvedAuth ?? true,
      canAccessParentAssignments: auth.canAccessParentAssignments ?? false,
    };
  },
  useKangurAuthStatusState: () => {
    const auth = useKangurAuthMock();
    return {
      isLoadingAuth: auth.isLoadingAuth ?? false,
      isLoadingPublicSettings: auth.isLoadingPublicSettings ?? false,
      isLoggingOut: auth.isLoggingOut ?? false,
      authError: auth.authError ?? null,
      appPublicSettings: auth.appPublicSettings ?? null,
    };
  },
  useKangurAuthActions: () => {
    const auth = useKangurAuthMock();
    return {
      logout: auth.logout ?? vi.fn(),
      navigateToLogin: auth.navigateToLogin ?? vi.fn(),
      checkAppState: auth.checkAppState ?? vi.fn(),
      selectLearner: auth.selectLearner ?? vi.fn(),
    };
  },
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
  useOptionalKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: useKangurSubjectFocusMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady', () => ({
  useKangurDeferredStandaloneHomeReady: useKangurDeferredStandaloneHomeReadyMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext.helpers', async () => {
  const actual =
    await vi.importActual<typeof import('./KangurGameRuntimeContext.helpers')>(
      './KangurGameRuntimeContext.helpers'
    );

  return {
    ...actual,
    buildKangurCompletedGameOutcome: buildKangurCompletedGameOutcomeMock,
  };
});

import {
  KangurGameRuntimeProvider,
  useKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';

const RuntimeFlowProbe = (): React.JSX.Element => {
  const {
    currentQuestionIndex,
    handleAnswer,
    handleSelectOperation,
    playerName,
    questionTimeLimit,
    score,
    screen: currentScreen,
    totalQuestions,
  } = useKangurGameRuntime();

  return (
    <div>
      <div data-testid='kangur-game-screen'>{currentScreen}</div>
      <div data-testid='kangur-game-score'>{score}</div>
      <div data-testid='kangur-game-player-name'>{playerName}</div>
      <div data-testid='kangur-game-current-question-index'>{currentQuestionIndex}</div>
      <div data-testid='kangur-game-total-questions'>{totalQuestions}</div>
      <div data-testid='kangur-game-question-time-limit'>{questionTimeLimit}</div>
      <button
        onClick={() => handleSelectOperation('addition', 'medium')}
        type='button'
      >
        Start addition
      </button>
      <button onClick={() => handleAnswer(true)} type='button'>
        Answer correct
      </button>
    </div>
  );
};

describe('KangurGameRuntimeContext flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T10:00:00.000Z'));

    generateQuestionsMock.mockReturnValue([{ id: 'q1' }, { id: 'q2' }]);
    scoreCreateMock.mockResolvedValue(null);
    buildKangurCompletedGameOutcomeMock.mockReturnValue({
      awardedXp: 40,
      awardedBadges: ['perfect_game'],
      awardedBreakdown: [{ kind: 'base', label: 'Round completed', xp: 40 }],
      dailyQuestToastHint: null,
      isGreat: true,
      isPerfect: true,
      nextBadgeToastHint: null,
      recommendationToastHint: null,
      selectedOperation: 'addition',
    });

    useKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
    });
    useKangurDeferredStandaloneHomeReadyMock.mockReturnValue(true);
    useKangurSubjectFocusMock.mockReturnValue({
      setSubject: vi.fn(),
      subject: 'maths',
      subjectKey: 'learner-1',
    });
    useKangurAuthMock.mockReturnValue({
      canAccessParentAssignments: false,
      isAuthenticated: false,
      isLoadingAuth: false,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
      user: null,
    });
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      refresh: vi.fn(),
    });
    useKangurProgressStateMock.mockReturnValue({
      activityStreak: 0,
      badges: [],
      currentLevel: 1,
      gamesPlayed: 0,
      lastActivityDate: null,
      lessonMastery: {},
      lessonsCompleted: 0,
      operationsPlayed: [],
      perfectGames: 0,
      totalXp: 0,
      xpToNextLevel: 100,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the anonymous addition flow from launch to result using the reducer-backed runtime state', async () => {
    render(
      <KangurGuestPlayerProvider>
        <KangurGameRuntimeProvider>
          <RuntimeFlowProbe />
        </KangurGameRuntimeProvider>
      </KangurGuestPlayerProvider>
    );

    expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent('home');

    fireEvent.click(screen.getByRole('button', { name: 'Start addition' }));

    expect(generateQuestionsMock).toHaveBeenCalledWith('addition', 'medium', 10);
    expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent('playing');
    expect(screen.getByTestId('kangur-game-player-name')).toHaveTextContent('Gracz');
    expect(screen.getByTestId('kangur-game-total-questions')).toHaveTextContent('2');
    expect(screen.getByTestId('kangur-game-question-time-limit')).toHaveTextContent('15');

    fireEvent.click(screen.getByRole('button', { name: 'Answer correct' }));

    expect(screen.getByTestId('kangur-game-score')).toHaveTextContent('1');
    expect(screen.getByTestId('kangur-game-current-question-index')).toHaveTextContent('0');

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByTestId('kangur-game-current-question-index')).toHaveTextContent('1');
    expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent('playing');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Answer correct' }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('kangur-game-score')).toHaveTextContent('2');
    expect(buildKangurCompletedGameOutcomeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nextScore: 2,
        taken: 1,
        totalQuestions: 2,
      })
    );
    expect(scoreCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        correct_answers: 2,
        player_name: 'Gracz',
        score: 2,
        time_taken: 1,
        total_questions: 2,
        xp_earned: 40,
      })
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_game_completed',
      expect.objectContaining({
        accuracyPercent: 100,
        correctAnswers: 2,
        operation: 'addition',
        screen: 'playing',
        totalQuestions: 2,
        xpAwarded: 40,
      })
    );

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByTestId('kangur-game-screen')).toHaveTextContent('result');
  });
});

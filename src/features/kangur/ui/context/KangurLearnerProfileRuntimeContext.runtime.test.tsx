/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadLearnerProfileScoresMock = vi.hoisted(() => vi.fn());
const peekCachedScopedKangurScoresMock = vi.hoisted(() => vi.fn());
const intlMessagesMock = vi.hoisted(() => ({}));
const intlTranslateMock = vi.hoisted(() => vi.fn((key: string) => key));
const authState = vi.hoisted(() => ({
  value: {
    user: {
      activeLearner: { id: 'learner-1', displayName: 'Ada' },
      full_name: 'Ada Parent',
      email: 'ada@example.com',
    },
    navigateToLogin: vi.fn(),
  },
}));
const progressState = vi.hoisted(() => ({
  value: {
    totalXp: 0,
    gamesPlayed: 0,
    perfectGames: 0,
    lessonsCompleted: 0,
    clockPerfect: 0,
    calendarPerfect: 0,
    geometryPerfect: 0,
    badges: [] as Array<unknown>,
    operationsPlayed: [] as Array<unknown>,
    totalCorrectAnswers: 0,
    totalQuestionsAnswered: 0,
    bestWinStreak: 0,
    dailyQuestsCompleted: 0,
    activityStats: {} as Record<string, unknown>,
    lessonMastery: {} as Record<string, unknown>,
  },
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'pl',
  useMessages: () => intlMessagesMock,
  useTranslations: () => intlTranslateMock,
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {},
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => authState.value,
  useKangurAuthActions: () => authState.value,
  useKangurAuthSessionState: () => authState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur' }),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => ({ subject: 'maths' }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: () => progressState.value,
}));

vi.mock('@/features/kangur/ui/services/learner-profile-scores', () => ({
  LEARNER_PROFILE_SCORE_FETCH_LIMIT: 120,
  loadLearnerProfileScores: loadLearnerProfileScoresMock,
  peekCachedScopedKangurScores: peekCachedScopedKangurScoresMock,
}));

vi.mock('@/features/kangur/ui/services/profile', () => ({
  buildKangurLearnerProfileSnapshot: vi.fn(() => ({
    weeklyActivity: [{ dateKey: '2026-03-26', label: 'Thu', games: 0, averageAccuracy: 0 }],
    nextLevel: null,
    totalXp: 0,
    recentSessions: [],
    recommendedSessionsCompleted: 0,
    recommendedSessionNextBadgeName: null,
    recommendedSessionSummary: '',
    todayXpEarned: 0,
    weeklyXpEarned: 0,
    averageXpPerSession: 0,
    operationPerformance: [],
  })),
  translateKangurLearnerProfileWithFallback: vi.fn(
    (_translate: unknown, _key: string, fallback: string) => fallback
  ),
}));

import {
  KangurLearnerProfileRuntimeBoundary,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';

function RuntimeProbe(): React.JSX.Element {
  const { isLoadingScores, scores } = useKangurLearnerProfileRuntime();
  return (
    <div data-testid='learner-profile-runtime-probe'>
      {isLoadingScores ? 'loading' : 'ready'}:{scores.length}
    </div>
  );
}

describe('KangurLearnerProfileRuntimeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    intlTranslateMock.mockImplementation((key: string) => key);
    peekCachedScopedKangurScoresMock.mockReturnValue(null);
    authState.value = {
      user: {
        activeLearner: { id: 'learner-1', displayName: 'Ada' },
        full_name: 'Ada Parent',
        email: 'ada@example.com',
      },
      navigateToLogin: vi.fn(),
    };
    loadLearnerProfileScoresMock.mockResolvedValue([
      {
        id: 'score-1',
        created_date: '2026-03-26T10:00:00.000Z',
      },
    ]);
  });

  it('defers learner score loading until after the first mount turn', async () => {
    render(
      <KangurLearnerProfileRuntimeBoundary enabled>
        <RuntimeProbe />
      </KangurLearnerProfileRuntimeBoundary>
    );

    expect(screen.getByTestId('learner-profile-runtime-probe')).toHaveTextContent('loading:0');
    expect(loadLearnerProfileScoresMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(loadLearnerProfileScoresMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByTestId('learner-profile-runtime-probe')).toHaveTextContent('ready:1');
    });
  });

  it('reuses cached learner scores immediately without triggering another load', async () => {
    peekCachedScopedKangurScoresMock.mockReturnValue([
      {
        id: 'score-cached',
        created_date: '2026-03-26T09:00:00.000Z',
      },
    ]);

    render(
      <KangurLearnerProfileRuntimeBoundary enabled>
        <RuntimeProbe />
      </KangurLearnerProfileRuntimeBoundary>
    );

    expect(screen.getByTestId('learner-profile-runtime-probe')).toHaveTextContent('ready:1');
    expect(loadLearnerProfileScoresMock).not.toHaveBeenCalled();
  });
});

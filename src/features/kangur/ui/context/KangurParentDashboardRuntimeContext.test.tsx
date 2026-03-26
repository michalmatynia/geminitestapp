/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { memo } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createLearnerMock = vi.hoisted(() => vi.fn());
const selectLearnerMock = vi.hoisted(() => vi.fn());
const checkAppStateMock = vi.hoisted(() => vi.fn());
const useKangurAssignmentsMock = vi.hoisted(() => vi.fn());
const useKangurLessonsMock = vi.hoisted(() => vi.fn());
const useKangurParentDashboardScoresMock = vi.hoisted(() => vi.fn());
const lessonsState = vi.hoisted(() => ({
  value: [] as Array<Record<string, unknown>>,
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
const authState = vi.hoisted(() => ({
  value: {
    isAuthenticated: true,
    user: {
      id: 'parent-1',
      full_name: 'Ada Parent',
      email: 'ada@example.com',
      role: 'user' as const,
      actorType: 'parent' as const,
      canManageLearners: true,
      ownerUserId: 'parent-1',
      ownerEmailVerified: true,
      activeLearner: null,
      learners: [
        {
          id: 'learner-1',
          ownerUserId: 'parent-1',
          displayName: 'Ada',
          loginName: 'ada01',
          status: 'active' as const,
          legacyUserKey: null,
          createdAt: '2026-03-10T08:00:00.000Z',
          updatedAt: '2026-03-12T09:15:00.000Z',
        },
      ],
    },
    navigateToLogin: vi.fn(),
    logout: vi.fn(),
    selectLearner: selectLearnerMock,
    checkAppState: checkAppStateMock,
    canAccessParentAssignments: false,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: null,
  },
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    learners: {
      create: createLearnerMock,
      update: vi.fn(),
      delete: vi.fn(),
    },
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => authState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur', requestedPath: '/kangur/parent' }),
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => ({
    ageGroup: '7-8',
    setAgeGroup: vi.fn(),
    ageGroupKey: 'learner-1',
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => ({
    subject: 'maths',
    setSubject: vi.fn(),
    subjectKey: 'learner-1',
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: () => progressState.value,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: useKangurLessonsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurParentDashboardScores', () => ({
  useKangurParentDashboardScores: useKangurParentDashboardScoresMock,
}));

import {
  KangurParentDashboardRuntimeProvider,
  useKangurParentDashboardRuntimeHeroState,
  useKangurParentDashboardRuntime,
  useKangurParentDashboardRuntimeActions,
  useKangurParentDashboardRuntimeOverviewState,
  useKangurParentDashboardRuntimeShellActions,
  useKangurParentDashboardRuntimeShellState,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';

const RuntimeProbe = ({ loginName = 'Ada01' }: { loginName?: string }): React.JSX.Element => {
  const { lessons, updateCreateField, handleCreateLearner, feedback } =
    useKangurParentDashboardRuntime();
  return (
    <div>
      <button type='button' onClick={() => updateCreateField('displayName', 'Ala')}>
        set-name
      </button>
      <button type='button' onClick={() => updateCreateField('loginName', loginName)}>
        set-login
      </button>
      <button type='button' onClick={() => updateCreateField('password', 'password123')}>
        set-pass
      </button>
      <button type='button' onClick={() => void handleCreateLearner()}>
        create
      </button>
      <div data-testid='lessons-count'>{lessons.length}</div>
      <div data-testid='feedback'>{feedback ?? ''}</div>
    </div>
  );
};

const shellRenderProbeSpy = vi.fn();
const heroRenderProbeSpy = vi.fn();
const overviewRenderProbeSpy = vi.fn();
const fullRenderProbeSpy = vi.fn();

const RuntimeShellRenderProbe = memo(function RuntimeShellRenderProbe(): React.JSX.Element {
  const { activeTab, canAccessDashboard } = useKangurParentDashboardRuntimeShellState();
  shellRenderProbeSpy({ activeTab, canAccessDashboard });
  return <div data-testid='runtime-shell-probe'>{activeTab}</div>;
});

const RuntimeHeroShellRenderProbe = memo(function RuntimeHeroShellRenderProbe(): React.JSX.Element {
  const { activeLearner, canManageLearners } = useKangurParentDashboardRuntimeHeroState();
  const { setCreateLearnerModalOpen } = useKangurParentDashboardRuntimeShellActions();
  heroRenderProbeSpy({
    activeLearnerId: activeLearner?.id ?? null,
    canManageLearners,
    canOpenLearnerModal: typeof setCreateLearnerModalOpen === 'function',
  });
  return <div data-testid='runtime-hero-probe'>{activeLearner?.id ?? 'none'}</div>;
});

const RuntimeOverviewRenderProbe = memo(function RuntimeOverviewRenderProbe(): React.JSX.Element {
  const { activeLearner, canManageLearners } = useKangurParentDashboardRuntimeOverviewState();
  overviewRenderProbeSpy({
    activeLearnerId: activeLearner?.id ?? null,
    canManageLearners,
  });
  return <div data-testid='runtime-overview-probe'>{activeLearner?.id ?? 'none'}</div>;
});

const RuntimeFullRenderProbe = memo(function RuntimeFullRenderProbe(): React.JSX.Element {
  const { isLoadingScores } = useKangurParentDashboardRuntime();
  fullRenderProbeSpy(isLoadingScores);
  return <div data-testid='runtime-full-probe'>{isLoadingScores ? 'loading' : 'ready'}</div>;
});

function RuntimeTabChangeControl(): React.JSX.Element {
  const { setActiveTab } = useKangurParentDashboardRuntimeShellActions();
  return (
    <button type='button' onClick={() => setActiveTab('assign')}>
      switch-tab
    </button>
  );
}

function RuntimeCreateFieldChangeControl(): React.JSX.Element {
  const { updateCreateField } = useKangurParentDashboardRuntimeActions();
  return (
    <button type='button' onClick={() => updateCreateField('displayName', 'Ala')}>
      update-create-form
    </button>
  );
}

describe('KangurParentDashboardRuntimeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createLearnerMock.mockReset();
    shellRenderProbeSpy.mockReset();
    heroRenderProbeSpy.mockReset();
    overviewRenderProbeSpy.mockReset();
    fullRenderProbeSpy.mockReset();
    lessonsState.value = [];
    progressState.value = {
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
      dailyQuestsCompleted: 0,
      activityStats: {},
      lessonMastery: {},
    };
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      reassignAssignment: vi.fn(),
    });
    useKangurParentDashboardScoresMock.mockReturnValue({
      isLoadingScores: false,
      scores: [],
      scoresError: null,
    });
    useKangurLessonsMock.mockReturnValue({
      data: lessonsState.value,
      isLoading: false,
      error: null,
    });
    authState.value = {
      isAuthenticated: true,
      user: {
        id: 'parent-1',
        full_name: 'Ada Parent',
        email: 'ada@example.com',
        role: 'user',
        actorType: 'parent',
        canManageLearners: true,
        ownerUserId: 'parent-1',
        ownerEmailVerified: true,
        activeLearner: null,
        learners: [
          {
            id: 'learner-1',
            ownerUserId: 'parent-1',
            displayName: 'Ada',
            loginName: 'ada01',
            status: 'active' as const,
            legacyUserKey: null,
            createdAt: '2026-03-10T08:00:00.000Z',
            updatedAt: '2026-03-12T09:15:00.000Z',
          },
        ],
      },
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
      selectLearner: selectLearnerMock,
      checkAppState: checkAppStateMock,
      canAccessParentAssignments: false,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
    };
  });

  it('loads shared lessons once for an accessible dashboard with an active learner', () => {
    vi.useFakeTimers();
    lessonsState.value = [
      {
        componentId: 'clock',
        enabled: true,
        title: 'Zegar',
      },
    ];
    useKangurLessonsMock.mockReturnValue({
      data: lessonsState.value,
      isLoading: false,
      error: null,
    });
    authState.value = {
      ...authState.value,
      user: {
        ...authState.value.user,
        activeLearner: authState.value.user.learners[0],
      },
    };

    try {
      render(
        <KangurParentDashboardRuntimeProvider>
          <RuntimeProbe />
        </KangurParentDashboardRuntimeProvider>
      );

      expect(useKangurLessonsMock).toHaveBeenCalledWith({
        ageGroup: '7-8',
        enabled: false,
        enabledOnly: true,
      });
      expect(useKangurAssignmentsMock).toHaveBeenCalledWith({
        enabled: false,
        query: {
          includeArchived: false,
        },
      });

      act(() => {
        vi.runOnlyPendingTimers();
      });

      expect(screen.getByTestId('lessons-count')).toHaveTextContent('1');
      expect(useKangurLessonsMock).toHaveBeenLastCalledWith({
        ageGroup: '7-8',
        enabled: true,
        enabledOnly: true,
      });
      expect(useKangurAssignmentsMock).toHaveBeenLastCalledWith({
        enabled: true,
        query: {
          includeArchived: false,
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('defers shared score loading until the dashboard settles', () => {
    vi.useFakeTimers();
    authState.value = {
      ...authState.value,
      user: {
        ...authState.value.user,
        activeLearner: authState.value.user.learners[0],
      },
    };

    try {
      render(
        <KangurParentDashboardRuntimeProvider>
          <RuntimeProbe />
        </KangurParentDashboardRuntimeProvider>
      );

      expect(useKangurParentDashboardScoresMock).toHaveBeenLastCalledWith({
        createdBy: 'ada@example.com',
        enabled: false,
        learnerId: 'learner-1',
        playerName: 'Ada',
        subject: 'maths',
      });

      act(() => {
        vi.advanceTimersByTime(900);
      });

      expect(useKangurParentDashboardScoresMock).toHaveBeenLastCalledWith({
        createdBy: 'ada@example.com',
        enabled: true,
        learnerId: 'learner-1',
        playerName: 'Ada',
        subject: 'maths',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps shell-only runtime consumers stable while deferred score state changes', () => {
    vi.useFakeTimers();
    authState.value = {
      ...authState.value,
      user: {
        ...authState.value.user,
        activeLearner: authState.value.user.learners[0],
      },
    };

    try {
      render(
        <KangurParentDashboardRuntimeProvider>
          <RuntimeShellRenderProbe />
          <RuntimeFullRenderProbe />
        </KangurParentDashboardRuntimeProvider>
      );

      expect(screen.getByTestId('runtime-shell-probe')).toHaveTextContent('progress');
      expect(screen.getByTestId('runtime-full-probe')).toHaveTextContent('loading');
      const shellRenderCountBeforeScoresReady = shellRenderProbeSpy.mock.calls.length;
      const fullRenderCountBeforeScoresReady = fullRenderProbeSpy.mock.calls.length;

      expect(shellRenderCountBeforeScoresReady).toBeGreaterThan(0);
      expect(fullRenderCountBeforeScoresReady).toBeGreaterThan(0);

      act(() => {
        vi.advanceTimersByTime(900);
      });

      expect(screen.getByTestId('runtime-full-probe')).toHaveTextContent('ready');
      expect(shellRenderProbeSpy).toHaveBeenCalledTimes(shellRenderCountBeforeScoresReady);
      expect(fullRenderProbeSpy.mock.calls.length).toBeGreaterThan(fullRenderCountBeforeScoresReady);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps overview runtime consumers stable while only the active tab changes', () => {
    authState.value = {
      ...authState.value,
      user: {
        ...authState.value.user,
        activeLearner: authState.value.user.learners[0],
      },
    };

    render(
      <KangurParentDashboardRuntimeProvider>
        <RuntimeShellRenderProbe />
        <RuntimeOverviewRenderProbe />
        <RuntimeTabChangeControl />
      </KangurParentDashboardRuntimeProvider>
    );

    expect(screen.getByTestId('runtime-shell-probe')).toHaveTextContent('progress');
    expect(screen.getByTestId('runtime-overview-probe')).toHaveTextContent('learner-1');
    const shellRenderCountBeforeTabChange = shellRenderProbeSpy.mock.calls.length;
    const overviewRenderCountBeforeTabChange = overviewRenderProbeSpy.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'switch-tab' }));

    expect(screen.getByTestId('runtime-shell-probe')).toHaveTextContent('assign');
    expect(screen.getByTestId('runtime-overview-probe')).toHaveTextContent('learner-1');
    expect(shellRenderProbeSpy.mock.calls.length).toBeGreaterThan(shellRenderCountBeforeTabChange);
    expect(overviewRenderProbeSpy).toHaveBeenCalledTimes(overviewRenderCountBeforeTabChange);
  });

  it('disables score analytics when the dashboard leaves the progress tab', () => {
    vi.useFakeTimers();
    authState.value = {
      ...authState.value,
      user: {
        ...authState.value.user,
        activeLearner: authState.value.user.learners[0],
      },
    };

    try {
      render(
        <KangurParentDashboardRuntimeProvider>
          <RuntimeFullRenderProbe />
          <RuntimeTabChangeControl />
        </KangurParentDashboardRuntimeProvider>
      );

      act(() => {
        vi.advanceTimersByTime(900);
      });

      expect(useKangurParentDashboardScoresMock).toHaveBeenLastCalledWith({
        createdBy: 'ada@example.com',
        enabled: true,
        learnerId: 'learner-1',
        playerName: 'Ada',
        subject: 'maths',
      });
      expect(screen.getByTestId('runtime-full-probe')).toHaveTextContent('ready');

      fireEvent.click(screen.getByRole('button', { name: 'switch-tab' }));

      expect(useKangurParentDashboardScoresMock).toHaveBeenLastCalledWith({
        createdBy: 'ada@example.com',
        enabled: false,
        learnerId: 'learner-1',
        playerName: 'Ada',
        subject: 'maths',
      });
      expect(screen.getByTestId('runtime-full-probe')).toHaveTextContent('ready');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps hero runtime consumers stable while create-form state changes', () => {
    authState.value = {
      ...authState.value,
      user: {
        ...authState.value.user,
        activeLearner: authState.value.user.learners[0],
      },
    };

    render(
      <KangurParentDashboardRuntimeProvider>
        <RuntimeHeroShellRenderProbe />
        <RuntimeCreateFieldChangeControl />
      </KangurParentDashboardRuntimeProvider>
    );

    expect(screen.getByTestId('runtime-hero-probe')).toHaveTextContent('learner-1');
    const heroRenderCountBeforeCreateUpdate = heroRenderProbeSpy.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'update-create-form' }));

    expect(screen.getByTestId('runtime-hero-probe')).toHaveTextContent('learner-1');
    expect(heroRenderProbeSpy).toHaveBeenCalledTimes(heroRenderCountBeforeCreateUpdate);
  });

  it('keeps shared lessons disabled until the dashboard can actually load learner data', () => {
    authState.value = {
      ...authState.value,
      user: {
        ...authState.value.user,
        canManageLearners: false,
        activeLearner: null,
      },
    };

    render(
      <KangurParentDashboardRuntimeProvider>
        <RuntimeProbe />
      </KangurParentDashboardRuntimeProvider>
    );

    expect(screen.getByTestId('lessons-count')).toHaveTextContent('0');
    expect(useKangurLessonsMock).toHaveBeenCalledWith({
      ageGroup: '7-8',
      enabled: false,
      enabledOnly: true,
    });
    expect(useKangurParentDashboardScoresMock).toHaveBeenCalledWith({
      createdBy: 'ada@example.com',
      enabled: false,
      learnerId: null,
      playerName: 'Ada Parent',
      subject: 'maths',
    });
    expect(useKangurAssignmentsMock).toHaveBeenCalledWith({
      enabled: false,
      query: {
        includeArchived: false,
      },
    });
  });

  it('blocks duplicate login names during learner creation', async () => {
    render(
      <KangurParentDashboardRuntimeProvider>
        <RuntimeProbe />
      </KangurParentDashboardRuntimeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-name' }));
    fireEvent.click(screen.getByRole('button', { name: 'set-login' }));
    fireEvent.click(screen.getByRole('button', { name: 'set-pass' }));
    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => {
      expect(screen.getByTestId('feedback')).toHaveTextContent('Ten nick jest juz zajety.');
    });
    expect(createLearnerMock).not.toHaveBeenCalled();
  });

  it('maps conflict responses to the duplicate nick message', async () => {
    createLearnerMock.mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), { status: 409 })
    );

    render(
      <KangurParentDashboardRuntimeProvider>
        <RuntimeProbe loginName='ola02' />
      </KangurParentDashboardRuntimeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set-name' }));
    fireEvent.click(screen.getByRole('button', { name: 'set-login' }));
    fireEvent.click(screen.getByRole('button', { name: 'set-pass' }));
    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => {
      expect(createLearnerMock).toHaveBeenCalled();
      expect(screen.getByTestId('feedback')).toHaveTextContent('Ten nick jest juz zajety.');
    });
  });
});

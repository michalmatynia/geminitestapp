/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createLearnerMock = vi.hoisted(() => vi.fn());
const selectLearnerMock = vi.hoisted(() => vi.fn());
const checkAppStateMock = vi.hoisted(() => vi.fn());
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

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: () => ({
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
  }),
}));

import {
  KangurParentDashboardRuntimeProvider,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';

const RuntimeProbe = ({ loginName = 'Ada01' }: { loginName?: string }): React.JSX.Element => {
  const { updateCreateField, handleCreateLearner, feedback } =
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
      <div data-testid='feedback'>{feedback ?? ''}</div>
    </div>
  );
};

describe('KangurParentDashboardRuntimeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createLearnerMock.mockReset();
    authState.value = {
      ...authState.value,
      user: {
        ...authState.value.user,
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
    };
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

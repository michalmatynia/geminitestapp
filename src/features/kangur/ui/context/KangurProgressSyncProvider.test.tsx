/**
 * @vitest-environment jsdom
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/features/kangur/shared/contracts/kangur';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  KANGUR_PROGRESS_OWNER_STORAGE_KEY,
  saveProgress,
  setProgressPersistenceEnabled,
} from '@/features/kangur/ui/services/progress';

const {
  useKangurAuthMock,
  progressGetMock,
  progressUpdateMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  useKangurAuthMock: vi.fn(),
  progressGetMock: vi.fn(),
  progressUpdateMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    progress: {
      get: progressGetMock,
      update: progressUpdateMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  trackKangurClientEvent: trackKangurClientEventMock,
}));

import { KangurProgressSyncProvider } from './KangurProgressSyncProvider';

const createProgress = (
  overrides: Partial<ReturnType<typeof createDefaultKangurProgressState>> = {}
) => ({
  ...createDefaultKangurProgressState(),
  ...overrides,
});

const baseAuthState = {
  isAuthenticated: true,
  isLoadingAuth: false,
  user: {
    id: 'parent-1',
    full_name: 'Ada',
    email: 'ada@example.com',
    role: 'user' as const,
    actorType: 'learner' as const,
    canManageLearners: false,
    ownerUserId: 'parent-1',
    activeLearner: {
      id: 'learner-1',
      ownerUserId: 'parent-1',
      displayName: 'Ada',
      loginName: 'ada-child',
      status: 'active' as const,
      legacyUserKey: 'ada@example.com',
      createdAt: '2026-03-06T10:00:00.000Z',
      updatedAt: '2026-03-06T10:00:00.000Z',
    },
    learners: [],
  },
};

const buildAuthState = (
  overrides: Partial<typeof baseAuthState> & {
    user?: Partial<typeof baseAuthState.user>;
  } = {}
) => ({
  ...baseAuthState,
  ...overrides,
  user: {
    ...baseAuthState.user,
    ...overrides.user,
  },
});

const ProgressProbe = (): React.JSX.Element => {
  const progress = useKangurProgressState();
  return <div data-testid='kangur-progress-total-xp'>{progress.totalXp}</div>;
};

describe('KangurProgressSyncProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setProgressPersistenceEnabled(true);

    useKangurAuthMock.mockReturnValue(buildAuthState());
    progressGetMock.mockResolvedValue(createProgress());
    progressUpdateMock.mockImplementation(
      async (progress: ReturnType<typeof createProgress>) => progress
    );
  });

  it('hydrates authenticated progress by merging local progress and syncing the merged snapshot', async () => {
    act(() => {
      saveProgress(
        createProgress({
          totalXp: 120,
          gamesPlayed: 5,
          badges: ['first_game'],
        })
      );
    });
    progressGetMock.mockResolvedValue(
      createProgress({
        totalXp: 80,
        gamesPlayed: 3,
      })
    );

    render(
      <KangurProgressSyncProvider>
        <ProgressProbe />
      </KangurProgressSyncProvider>
    );

    await waitFor(() => expect(progressGetMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(progressUpdateMock).toHaveBeenCalledWith(
        createProgress({
          totalXp: 120,
          gamesPlayed: 5,
          badges: ['first_game'],
        })
      )
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_progress_hydrated',
      expect.objectContaining({
        userKey: 'learner-1',
        updatedLocal: true,
        updatedRemote: true,
      })
    );
    expect(screen.getByTestId('kangur-progress-total-xp')).toHaveTextContent('120');
    expect(localStorage.getItem(KANGUR_PROGRESS_OWNER_STORAGE_KEY)).toBe('learner-1');
  });

  it('pushes later local progress changes back to the server after hydration', async () => {
    progressGetMock.mockResolvedValue(createProgress());

    render(
      <KangurProgressSyncProvider>
        <ProgressProbe />
      </KangurProgressSyncProvider>
    );

    await waitFor(() => expect(progressGetMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('kangur-progress-total-xp')).toHaveTextContent('0')
    );

    progressUpdateMock.mockClear();

    act(() => {
      saveProgress(
        createProgress({
          totalXp: 45,
          gamesPlayed: 2,
        })
      );
    });

    await waitFor(() =>
      expect(progressUpdateMock).toHaveBeenCalledWith(
        createProgress({
          totalXp: 45,
          gamesPlayed: 2,
        })
      )
    );
    expect(screen.getByTestId('kangur-progress-total-xp')).toHaveTextContent('45');
  });

  it('does not hydrate progress for parent accounts without an active learner', async () => {
    useKangurAuthMock.mockReturnValue(
      buildAuthState({
        user: {
          actorType: 'parent',
          canManageLearners: true,
          activeLearner: null,
          learners: [],
        },
      })
    );

    render(
      <KangurProgressSyncProvider>
        <ProgressProbe />
      </KangurProgressSyncProvider>
    );

    await waitFor(() => expect(progressGetMock).not.toHaveBeenCalled());
    expect(screen.getByTestId('kangur-progress-total-xp')).toHaveTextContent('0');
    expect(localStorage.getItem(KANGUR_PROGRESS_OWNER_STORAGE_KEY)).toBeNull();
  });
});

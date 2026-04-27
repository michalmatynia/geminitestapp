/**
 * @vitest-environment jsdom
 */

import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGuestKangurScore,
  loadGuestKangurScores,
} from '@/features/kangur/services/guest-kangur-scores';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';

const {
  logKangurClientErrorMock,
  reportKangurClientErrorMock,
  trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
  isRecoverableKangurClientFetchError,
  useKangurAuthMock,
  scoreCreateMock,
} = vi.hoisted(() => ({
  logKangurClientErrorMock: globalThis.__kangurClientErrorMocks().logKangurClientErrorMock,
  reportKangurClientErrorMock: globalThis.__kangurClientErrorMocks().reportKangurClientErrorMock,
  trackKangurClientEventMock: globalThis.__kangurClientErrorMocks().trackKangurClientEventMock,
  withKangurClientError: globalThis.__kangurClientErrorMocks().withKangurClientError,
  withKangurClientErrorSync: globalThis.__kangurClientErrorMocks().withKangurClientErrorSync,
  isRecoverableKangurClientFetchError: globalThis.__kangurClientErrorMocks().isRecoverableKangurClientFetchError,
  useKangurAuthMock: vi.fn(),
  scoreCreateMock: vi.fn(),
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
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      create: scoreCreateMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  reportKangurClientError: reportKangurClientErrorMock,
  trackKangurClientEvent: trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
  isRecoverableKangurClientFetchError,
}));

import { KangurScoreSyncProvider } from './KangurScoreSyncProvider';

describe('KangurScoreSyncProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('uploads pending guest scores when auth resolves an active learner', async () => {
    const localScore = createGuestKangurScore({
      player_name: 'Gracz',
      score: 8,
      operation: 'addition',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 8,
      time_taken: 27,
    });

    useKangurAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoadingAuth: false,
      user: {
        id: 'parent-1',
        activeLearner: {
          id: 'learner-1',
        },
      },
    });
    scoreCreateMock.mockResolvedValue({
      ...localScore,
      id: 'db-score-1',
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
    });

    render(
      <KangurScoreSyncProvider>
        <div>child</div>
      </KangurScoreSyncProvider>
    );

    await waitFor(() => {
      expect(scoreCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          player_name: 'Gracz',
          client_mutation_id: localScore.client_mutation_id,
        })
      );
    });
    await waitFor(() => {
      expect(loadGuestKangurScores()).toEqual([]);
    });
  });

  it('does nothing while auth is anonymous', () => {
    createGuestKangurScore({
      player_name: 'Gracz',
      score: 5,
      operation: 'division',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 5,
      time_taken: 41,
    });

    useKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoadingAuth: false,
      user: null,
    });

    render(
      <KangurScoreSyncProvider>
        <div>child</div>
      </KangurScoreSyncProvider>
    );

    expect(scoreCreateMock).not.toHaveBeenCalled();
    expect(loadGuestKangurScores()).toHaveLength(1);
  });

  it('delays guest score sync on the standalone home route', async () => {
    vi.useFakeTimers();

    const localScore = createGuestKangurScore({
      player_name: 'Gracz',
      score: 8,
      operation: 'addition',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 8,
      time_taken: 27,
    });

    useKangurAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoadingAuth: false,
      user: {
        id: 'parent-1',
        activeLearner: {
          id: 'learner-1',
        },
      },
    });
    scoreCreateMock.mockResolvedValue({
      ...localScore,
      id: 'db-score-1',
      created_by: 'ada@example.com',
      learner_id: 'learner-1',
      owner_user_id: 'parent-1',
    });

    render(
      <KangurRoutingProvider basePath='/kangur' pageKey='Game' requestedPath='/kangur'>
        <KangurScoreSyncProvider>
          <div>child</div>
        </KangurScoreSyncProvider>
      </KangurRoutingProvider>
    );

    expect(scoreCreateMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_999);
    });

    expect(scoreCreateMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(scoreCreateMock).toHaveBeenCalledTimes(1);
    expect(scoreCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        player_name: 'Gracz',
        client_mutation_id: localScore.client_mutation_id,
      })
    );
  });
});

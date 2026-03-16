/**
 * @vitest-environment jsdom
 */

import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createGuestKangurScore,
  loadGuestKangurScores,
} from '@/features/kangur/services/guest-kangur-scores';

const {
  useKangurAuthMock,
  scoreCreateMock,
  logKangurClientErrorMock,
  reportKangurClientErrorMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  useKangurAuthMock: vi.fn(),
  scoreCreateMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  reportKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      create: scoreCreateMock,
    },
  }),
}));

const withKangurClientError = async <T,>(
  report: unknown,
  task: () => Promise<T>,
  options: {
    fallback: T | (() => T);
    onError?: (error: unknown) => void;
    shouldReport?: (error: unknown) => boolean;
    shouldRethrow?: (error: unknown) => boolean;
  }
): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    const shouldReport = options.shouldReport?.(error) ?? true;
    if (shouldReport) {
      reportKangurClientErrorMock(error, report);
      logKangurClientErrorMock(error);
    }
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

const withKangurClientErrorSync = <T,>(
  report: unknown,
  task: () => T,
  options: {
    fallback: T | (() => T);
    onError?: (error: unknown) => void;
    shouldReport?: (error: unknown) => boolean;
    shouldRethrow?: (error: unknown) => boolean;
  }
): T => {
  try {
    return task();
  } catch (error) {
    const shouldReport = options.shouldReport?.(error) ?? true;
    if (shouldReport) {
      reportKangurClientErrorMock(error, report);
      logKangurClientErrorMock(error);
    }
    options.onError?.(error);
    if (options.shouldRethrow?.(error)) {
      throw error;
    }
    return typeof options.fallback === 'function'
      ? (options.fallback as () => T)()
      : options.fallback;
  }
};

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  reportKangurClientError: reportKangurClientErrorMock,
  trackKangurClientEvent: trackKangurClientEventMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

import { KangurScoreSyncProvider } from './KangurScoreSyncProvider';

describe('KangurScoreSyncProvider', () => {
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
});

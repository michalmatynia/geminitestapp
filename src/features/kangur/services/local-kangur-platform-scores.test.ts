/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  hasGuestKangurScoresMock,
  listGuestKangurScoresMock,
  resetGuestKangurScoreSessionMock,
  syncGuestKangurScoresMock,
  resolveSessionUserMock,
  createActorAwareHeadersMock,
  trackReadFailureMock,
  trackWriteFailureMock,
  trackWriteSuccessMock,
  reportKangurClientErrorMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  hasGuestKangurScoresMock: vi.fn(),
  listGuestKangurScoresMock: vi.fn(),
  resetGuestKangurScoreSessionMock: vi.fn(),
  syncGuestKangurScoresMock: vi.fn(),
  resolveSessionUserMock: vi.fn(),
  createActorAwareHeadersMock: vi.fn(),
  trackReadFailureMock: vi.fn(),
  trackWriteFailureMock: vi.fn(),
  trackWriteSuccessMock: vi.fn(),
  reportKangurClientErrorMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/guest-kangur-scores', () => ({
  hasGuestKangurScores: hasGuestKangurScoresMock,
  listGuestKangurScores: listGuestKangurScoresMock,
  resetGuestKangurScoreSession: resetGuestKangurScoreSessionMock,
  syncGuestKangurScores: syncGuestKangurScoresMock,
}));

vi.mock('@/features/kangur/services/local-kangur-platform-auth', () => ({
  resolveSessionUser: resolveSessionUserMock,
}));

vi.mock('@/features/kangur/services/local-kangur-platform-shared', () => ({
  createActorAwareHeaders: createActorAwareHeadersMock,
  trackReadFailure: trackReadFailureMock,
  trackWriteFailure: trackWriteFailureMock,
  trackWriteSuccess: trackWriteSuccessMock,
  createKangurClientFallback: (action: string) => () => {
    throw new Error(`Kangur client fallback invoked for ${action}.`);
  },
}));

vi.mock('@/features/kangur/observability/client', () => ({
  isRecoverableKangurClientFetchError: (error: unknown) =>
    error instanceof Error &&
    error.name === 'TypeError' &&
    (error.message.trim().toLowerCase() === 'failed to fetch' ||
      error.message.trim().toLowerCase().includes('load failed')),
  reportKangurClientError: reportKangurClientErrorMock,
  withKangurClientError: async (
    _report: unknown,
    task: () => Promise<unknown>,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    },
  ) => {
    try {
      return await task();
    } catch (error) {
      options.onError?.(error);
      if (options.shouldRethrow?.(error)) {
        throw error;
      }
      return typeof options.fallback === 'function'
        ? (options.fallback as () => unknown)()
        : options.fallback;
    }
  },
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system-client', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

const REMOTE_SCORE = {
  id: 'score-1',
  player_name: 'Ada',
  score: 8,
  operation: 'addition' as const,
  subject: 'maths' as const,
  total_questions: 10,
  correct_answers: 8,
  time_taken: 27,
  xp_earned: 24,
  created_date: '2026-03-20T08:00:00.000Z',
  client_mutation_id: null,
  created_by: 'ada@example.com',
  learner_id: 'learner-1',
  owner_user_id: 'parent-1',
};

describe('local-kangur-platform scores shared API client integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    createActorAwareHeadersMock.mockReturnValue(new Headers());
    hasGuestKangurScoresMock.mockReturnValue(false);
    listGuestKangurScoresMock.mockReturnValue([]);
    syncGuestKangurScoresMock.mockResolvedValue({ syncedCount: 0, remainingCount: 0 });
  });

  it('loads remote scores through the shared API client path builder', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => [REMOTE_SCORE],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { requestMergedScores } = await import(
      '@/features/kangur/services/local-kangur-platform-scores'
    );

    await expect(
      requestMergedScores({
        sort: '-score',
        limit: 5,
        player_name: 'Ada',
        subject: 'maths',
        learner_id: 'learner-1',
      }),
    ).resolves.toEqual([REMOTE_SCORE]);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/scores?sort=-score&limit=5&player_name=Ada&subject=maths&learner_id=learner-1',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
      }),
    );
    expect(hasGuestKangurScoresMock).toHaveBeenCalled();
    expect(syncGuestKangurScoresMock).not.toHaveBeenCalled();
  });

  it('reuses the score query cache between identical shared client reads', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => [REMOTE_SCORE],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { requestMergedScores } = await import(
      '@/features/kangur/services/local-kangur-platform-scores'
    );

    await expect(
      requestMergedScores({
        sort: '-created_date',
        limit: 10,
      }),
    ).resolves.toEqual([REMOTE_SCORE]);
    await expect(
      requestMergedScores({
        sort: '-created_date',
        limit: 10,
      }),
    ).resolves.toEqual([REMOTE_SCORE]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('creates scores through the shared API client and clears cached queries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      statusText: 'Created',
      json: async () => REMOTE_SCORE,
    });
    vi.stubGlobal('fetch', fetchMock);

    const cacheModule = await import('@/features/kangur/services/local-kangur-platform-score-cache');
    cacheModule.scoreQueryCache.set('/api/kangur/scores?sort=-score', {
      rows: [REMOTE_SCORE],
      expiresAt: Date.now() + 10_000,
    });
    cacheModule.scoreQueryInFlight.set('/api/kangur/scores?sort=-score', Promise.resolve([REMOTE_SCORE]));

    const { createScoreViaApi } = await import(
      '@/features/kangur/services/local-kangur-platform-scores'
    );

    await expect(
      createScoreViaApi({
        player_name: 'Ada',
        score: 8,
        operation: 'addition',
        subject: 'maths',
        total_questions: 10,
        correct_answers: 8,
        time_taken: 27,
        xp_earned: 24,
      }),
    ).resolves.toEqual(REMOTE_SCORE);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/scores',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: expect.stringContaining('"operation":"addition"'),
      }),
    );
    expect(cacheModule.scoreQueryCache.size).toBe(0);
    expect(cacheModule.scoreQueryInFlight.size).toBe(0);
    expect(trackWriteSuccessMock).toHaveBeenCalledWith(
      'score.create',
      expect.objectContaining({
        endpoint: '/api/kangur/scores',
        method: 'POST',
        operation: 'addition',
        score: 8,
      }),
    );
  });

  it('does not report recoverable fetch misses while listing scores', async () => {
    const fetchError = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchError));

    const { requestMergedScores } = await import(
      '@/features/kangur/services/local-kangur-platform-scores'
    );

    await expect(requestMergedScores({ sort: '-created_date', limit: 10 })).rejects.toBe(fetchError);
    expect(trackReadFailureMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(reportKangurClientErrorMock).not.toHaveBeenCalled();
  });
});

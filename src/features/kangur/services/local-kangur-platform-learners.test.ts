/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  clearStoredActiveLearnerIdMock,
  setStoredActiveLearnerIdMock,
  clearSessionUserCacheMock,
  resolveSessionUserMock,
  clearScoreQueryCacheMock,
  createActorAwareHeadersMock,
  trackReadFailureMock,
  trackWriteFailureMock,
  trackWriteSuccessMock,
} = vi.hoisted(() => ({
  clearStoredActiveLearnerIdMock: vi.fn(),
  setStoredActiveLearnerIdMock: vi.fn(),
  clearSessionUserCacheMock: vi.fn(),
  resolveSessionUserMock: vi.fn(),
  clearScoreQueryCacheMock: vi.fn(),
  createActorAwareHeadersMock: vi.fn(),
  trackReadFailureMock: vi.fn(),
  trackWriteFailureMock: vi.fn(),
  trackWriteSuccessMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-active-learner', () => ({
  clearStoredActiveLearnerId: clearStoredActiveLearnerIdMock,
  setStoredActiveLearnerId: setStoredActiveLearnerIdMock,
}));

vi.mock('@/features/kangur/services/local-kangur-platform-auth', () => ({
  clearSessionUserCache: clearSessionUserCacheMock,
  resolveSessionUser: resolveSessionUserMock,
}));

vi.mock('@/features/kangur/services/local-kangur-platform-score-cache', () => ({
  clearScoreQueryCache: clearScoreQueryCacheMock,
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

const LEARNER_PROFILE = {
  id: 'learner-1',
  ownerUserId: 'parent-1',
  displayName: 'Ada',
  age: 8,
  avatarId: 'fox',
  loginName: 'ada-child',
  status: 'active' as const,
  legacyUserKey: null,
  aiTutor: {
    currentMoodId: 'encouraging' as const,
    baselineMoodId: 'neutral' as const,
    confidence: 0.6,
    lastComputedAt: null,
    lastReasonCode: null,
  },
  createdAt: '2026-03-20T08:00:00.000Z',
  updatedAt: '2026-03-20T08:00:00.000Z',
};

const SESSION_HISTORY = {
  sessions: [
    {
      id: 'session-1',
      startedAt: '2026-03-20T08:00:00.000Z',
      endedAt: '2026-03-20T08:05:00.000Z',
      durationSeconds: 300,
    },
  ],
  totalSessions: 1,
  nextOffset: null,
  hasMore: false,
};

const INTERACTION_HISTORY = {
  items: [],
  total: 0,
  limit: 5,
  offset: 2,
};

describe('local-kangur-platform learners shared API client integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    createActorAwareHeadersMock.mockReturnValue(new Headers());
  });

  it('creates, updates, and deletes learners through the shared API client', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        json: async () => LEARNER_PROFILE,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          ...LEARNER_PROFILE,
          displayName: 'Ada Updated',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => LEARNER_PROFILE,
      });
    vi.stubGlobal('fetch', fetchMock);

    const {
      createLearnerViaApi,
      updateLearnerViaApi,
      deleteLearnerViaApi,
    } = await import('@/features/kangur/services/local-kangur-platform-learners');

    await expect(
      createLearnerViaApi({
        displayName: 'Ada',
        age: 8,
        loginName: 'ada-child',
        password: 'Secure12',
      }),
    ).resolves.toEqual(LEARNER_PROFILE);

    await expect(
      updateLearnerViaApi('learner with space', { displayName: 'Ada Updated' }),
    ).resolves.toEqual({
      ...LEARNER_PROFILE,
      displayName: 'Ada Updated',
    });

    await expect(deleteLearnerViaApi('learner-1')).resolves.toEqual(LEARNER_PROFILE);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/kangur/learners',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: expect.stringContaining('"displayName":"Ada"'),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/kangur/learners/learner%20with%20space',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'same-origin',
        body: JSON.stringify({ displayName: 'Ada Updated' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/kangur/learners/learner-1',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'same-origin',
      }),
    );
    expect(clearSessionUserCacheMock).toHaveBeenCalledTimes(3);
    expect(clearScoreQueryCacheMock).toHaveBeenCalledTimes(1);
    expect(clearStoredActiveLearnerIdMock).toHaveBeenCalledTimes(1);
  });

  it('loads learner sessions and interactions through shared path builders', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => SESSION_HISTORY,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => INTERACTION_HISTORY,
      });
    vi.stubGlobal('fetch', fetchMock);

    const {
      requestLearnerSessions,
      requestLearnerInteractions,
    } = await import('@/features/kangur/services/local-kangur-platform-learners');

    await expect(
      requestLearnerSessions('learner 1', { limit: 5, offset: 1 }),
    ).resolves.toEqual(SESSION_HISTORY);
    await expect(
      requestLearnerInteractions('learner 1', { limit: 5, offset: 2 }),
    ).resolves.toEqual(INTERACTION_HISTORY);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/kangur/learners/learner%201/sessions?limit=5&offset=1',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/kangur/learners/learner%201/interactions?limit=5&offset=2',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
      }),
    );
  });

  it('preserves learner create error details and error id from the shared client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      headers: new Headers({
        'x-error-id': 'kangur-error-1',
      }),
      text: async () =>
        JSON.stringify({
          error: 'Login name is already taken.',
          details: {
            field: 'loginName',
          },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLearnerViaApi } = await import(
      '@/features/kangur/services/local-kangur-platform-learners'
    );

    await expect(
      createLearnerViaApi({
        displayName: 'Ada',
        age: 8,
        loginName: 'ada-child',
        password: 'Secure12',
      }),
    ).rejects.toMatchObject({
      message: 'Login name is already taken.',
      status: 409,
      details: {
        field: 'loginName',
      },
      errorId: 'kangur-error-1',
    });
    expect(trackWriteFailureMock).toHaveBeenCalledWith(
      'learners.create',
      expect.objectContaining({
        status: 409,
        errorId: 'kangur-error-1',
      }),
      expect.objectContaining({
        endpoint: '/api/kangur/learners',
        method: 'POST',
      }),
    );
  });

  it('does not track recoverable fetch misses while loading learner history', async () => {
    const fetchError = new TypeError('Failed to fetch');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(fetchError).mockRejectedValueOnce(fetchError)
    );

    const {
      requestLearnerSessions,
      requestLearnerInteractions,
    } = await import('@/features/kangur/services/local-kangur-platform-learners');

    await expect(requestLearnerSessions('learner-1')).rejects.toBe(fetchError);
    await expect(requestLearnerInteractions('learner-1')).rejects.toBe(fetchError);
    expect(trackReadFailureMock).not.toHaveBeenCalled();
  });
});

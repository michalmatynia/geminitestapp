/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createActorAwareHeadersMock,
  trackReadFailureMock,
  trackWriteFailureMock,
  trackWriteSuccessMock,
} = vi.hoisted(() => ({
  createActorAwareHeadersMock: vi.fn(),
  trackReadFailureMock: vi.fn(),
  trackWriteFailureMock: vi.fn(),
  trackWriteSuccessMock: vi.fn(),
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
  withKangurClientErrorSync: (
    _report: unknown,
    task: () => unknown,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    },
  ) => {
    try {
      return task();
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

const ACTIVITY_SNAPSHOT = {
  learnerId: 'learner-1',
  kind: 'lesson' as const,
  title: 'Fraction warmup',
  href: '/kangur/lessons/fractions',
  startedAt: '2026-03-20T08:00:00.000Z',
  updatedAt: '2026-03-20T08:01:00.000Z',
};

describe('local-kangur-platform learner activity shared API client integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    createActorAwareHeadersMock.mockReturnValue(new Headers());
  });

  it('loads learner activity through the shared API client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        snapshot: ACTIVITY_SNAPSHOT,
        isOnline: true,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } = await import(
      '@/features/kangur/services/local-kangur-platform'
    );
    const platform = createLocalKangurPlatform();

    await expect(platform.learnerActivity.get()).resolves.toEqual({
      snapshot: ACTIVITY_SNAPSHOT,
      isOnline: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/kangur-api/learner-activity',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      }),
    );
  });

  it('updates learner activity through the shared API client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ACTIVITY_SNAPSHOT,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } = await import(
      '@/features/kangur/services/local-kangur-platform'
    );
    const platform = createLocalKangurPlatform();

    await expect(
      platform.learnerActivity.update({
        kind: 'lesson',
        title: 'Fraction warmup',
        href: '/kangur/lessons/fractions',
      }),
    ).resolves.toEqual(ACTIVITY_SNAPSHOT);

    expect(fetchMock).toHaveBeenCalledWith(
      '/kangur-api/learner-activity',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({
          kind: 'lesson',
          title: 'Fraction warmup',
          href: '/kangur/lessons/fractions',
        }),
      }),
    );
    expect(trackWriteSuccessMock).toHaveBeenCalledWith(
      'learnerActivity.update',
      expect.objectContaining({
        endpoint: '/api/kangur/learner-activity',
        method: 'POST',
        kind: 'lesson',
      }),
    );
  });

  it('does not track recoverable fetch misses while loading learner activity', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const { createLocalKangurPlatform } = await import(
      '@/features/kangur/services/local-kangur-platform'
    );
    const platform = createLocalKangurPlatform();

    await expect(platform.learnerActivity.get()).rejects.toThrow('Failed to fetch');
    expect(trackReadFailureMock).not.toHaveBeenCalled();
  });
});

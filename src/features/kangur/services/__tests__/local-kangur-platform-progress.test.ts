/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@kangur/contracts';

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

const PROGRESS_STATE = {
  ...createDefaultKangurProgressState(),
  totalXp: 120,
  gamesPlayed: 5,
  lessonsCompleted: 2,
};

describe('local-kangur-platform progress shared API client integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    createActorAwareHeadersMock.mockReturnValue(
      new Headers({
        'x-kangur-actor': 'parent-1',
      }),
    );
  });

  it('loads progress through the shared API client path builder with subject filters', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => PROGRESS_STATE,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } = await import(
      '@/features/kangur/services/local-kangur-platform'
    );
    const platform = createLocalKangurPlatform();

    await expect(platform.progress.get({ subject: 'maths' })).resolves.toEqual(PROGRESS_STATE);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/progress?subject=maths',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
      }),
    );
  });

  it('updates progress through the shared API client and forwards CTA headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => PROGRESS_STATE,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } = await import(
      '@/features/kangur/services/local-kangur-platform'
    );
    const platform = createLocalKangurPlatform();

    await expect(
      platform.progress.update(PROGRESS_STATE, {
        subject: 'maths',
        source: 'lesson_panel_navigation',
        cta: ' Lesson CTA ',
      }),
    ).resolves.toEqual(PROGRESS_STATE);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/progress?subject=maths',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'same-origin',
        body: JSON.stringify(PROGRESS_STATE),
      }),
    );

    const requestInit = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(requestInit?.headers);

    expect(headers.get('x-kangur-progress-source')).toBe('lesson_panel_navigation');
    expect(headers.get('x-kangur-progress-cta')).toBe('Lesson CTA');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('x-kangur-actor')).toBe('parent-1');
    expect(trackWriteSuccessMock).toHaveBeenCalledWith(
      'progress.update',
      expect.objectContaining({
        endpoint: '/api/kangur/progress?subject=maths',
        method: 'PATCH',
        totalXp: 120,
        gamesPlayed: 5,
        lessonsCompleted: 2,
      }),
    );
  });

  it('does not track recoverable fetch misses while loading progress', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const { createLocalKangurPlatform } = await import(
      '@/features/kangur/services/local-kangur-platform'
    );
    const platform = createLocalKangurPlatform();

    await expect(platform.progress.get({ subject: 'maths' })).rejects.toThrow('Failed to fetch');
    expect(trackReadFailureMock).not.toHaveBeenCalled();
  });
});

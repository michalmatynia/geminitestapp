/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createActorAwareHeadersMock,
  trackReadFailureMock,
  trackWriteFailureMock,
  logKangurClientErrorMock,
} = vi.hoisted(() => ({
  createActorAwareHeadersMock: vi.fn(),
  trackReadFailureMock: vi.fn(),
  trackWriteFailureMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/local-kangur-platform-shared', () => ({
  createActorAwareHeaders: createActorAwareHeadersMock,
  trackReadFailure: trackReadFailureMock,
  trackWriteFailure: trackWriteFailureMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
  withKangurClientError: async (
    _report: unknown,
    task: () => Promise<unknown>,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
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

describe('subject-focus remote API client integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    createActorAwareHeadersMock.mockReturnValue(new Headers());
  });

  it('loads remote subject focus via the shared API client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ subject: 'maths' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { loadRemoteSubjectFocus } = await import(
      '@/features/kangur/ui/services/subject-focus'
    );

    await expect(loadRemoteSubjectFocus()).resolves.toBe('maths');
    expect(createActorAwareHeadersMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/subject-focus',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
      }),
    );
  });

  it('ignores aborted subject focus hydration requests', async () => {
    const fetchMock = vi.fn().mockRejectedValue(
      Object.assign(new Error('Operation was aborted'), { name: 'AbortError' })
    );
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    controller.abort();

    const { loadRemoteSubjectFocus } = await import(
      '@/features/kangur/ui/services/subject-focus'
    );

    await expect(loadRemoteSubjectFocus(controller.signal)).resolves.toBeNull();
    expect(trackReadFailureMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/subject-focus',
      expect.objectContaining({
        method: 'GET',
        credentials: 'same-origin',
        signal: controller.signal,
      }),
    );
  });

  it('ignores transient browser fetch failures during subject focus hydration', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const { loadRemoteSubjectFocus } = await import(
      '@/features/kangur/ui/services/subject-focus'
    );

    await expect(loadRemoteSubjectFocus()).resolves.toBeNull();
    expect(trackReadFailureMock).not.toHaveBeenCalled();
  });

  it('updates remote subject focus via the shared API client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ subject: 'english' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { persistRemoteSubjectFocus } = await import(
      '@/features/kangur/ui/services/subject-focus'
    );

    await expect(persistRemoteSubjectFocus('english')).resolves.toBe('english');
    expect(createActorAwareHeadersMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/subject-focus',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'same-origin',
        body: JSON.stringify({ subject: 'english' }),
      }),
    );
  });

  it('ignores invalid runtime subject values without calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { persistRemoteSubjectFocus } = await import(
      '@/features/kangur/ui/services/subject-focus'
    );

    await expect(
      persistRemoteSubjectFocus(undefined as unknown as 'maths')
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(trackWriteFailureMock).not.toHaveBeenCalled();
  });
});

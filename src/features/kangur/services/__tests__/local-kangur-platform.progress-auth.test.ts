/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getSessionMock,
  signInMock,
  signOutMock,
  withCsrfHeadersMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
  withCsrfHeadersMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  getSession: getSessionMock,
  signIn: signInMock,
  signOut: signOutMock,
}));

vi.mock('@/shared/lib/security/csrf-client', () => ({
  withCsrfHeaders: withCsrfHeadersMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  isRecoverableKangurClientFetchError: (error: unknown) =>
    error instanceof Error &&
    error.name === 'TypeError' &&
    (error.message.trim().toLowerCase() === 'failed to fetch' ||
      error.message.trim().toLowerCase().includes('load failed')),
  logKangurClientError: logKangurClientErrorMock,
  trackKangurClientEvent: trackKangurClientEventMock,
  reportKangurClientError: (
    error: unknown,
    report: { context?: Record<string, unknown> }
  ) => {
    logKangurClientErrorMock(error, { ...report, ...(report.context ?? {}) });
  },
  withKangurClientError: async (
    report: { context?: Record<string, unknown> } | ((error: unknown) => { context?: Record<string, unknown> }),
    task: () => Promise<unknown>,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    }
  ) => {
    try {
      return await task();
    } catch (error) {
      const resolvedReport = typeof report === 'function' ? report(error) : report;
      const shouldReport = options.shouldReport?.(error) ?? true;
      if (shouldReport) {
        logKangurClientErrorMock(error, {
          ...resolvedReport,
          ...(resolvedReport.context ?? {}),
        });
      }
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
    report: { context?: Record<string, unknown> } | ((error: unknown) => { context?: Record<string, unknown> }),
    task: () => unknown,
    options: {
      fallback: unknown | (() => unknown);
      onError?: (error: unknown) => void;
      shouldReport?: (error: unknown) => boolean;
      shouldRethrow?: (error: unknown) => boolean;
    }
  ) => {
    try {
      return task();
    } catch (error) {
      const resolvedReport = typeof report === 'function' ? report(error) : report;
      const shouldReport = options.shouldReport?.(error) ?? true;
      if (shouldReport) {
        logKangurClientErrorMock(error, {
          ...resolvedReport,
          ...(resolvedReport.context ?? {}),
        });
      }
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

describe('createLocalKangurPlatform progress auth logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    withCsrfHeadersMock.mockImplementation((headers?: Record<string, string>) => headers ?? {});
  });

  it('does not report expected 401 progress fetch errors to client error telemetry', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
    const platform = createLocalKangurPlatform();

    await expect(platform.progress.get()).rejects.toMatchObject({ status: 401 });
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
    expect(trackKangurClientEventMock).not.toHaveBeenCalled();
  });

  it('still reports unexpected progress fetch failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
    const platform = createLocalKangurPlatform();

    await expect(platform.progress.get()).rejects.toMatchObject({ status: 500 });
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_api_read_failed',
      expect.objectContaining({
        action: 'progress.get',
        endpoint: '/api/kangur/progress',
        method: 'GET',
        statusCode: 500,
      })
    );
    expect(logKangurClientErrorMock).toHaveBeenCalledTimes(1);
    expect(logKangurClientErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500 }),
      expect.objectContaining({
        source: 'kangur.local-platform',
        action: 'progress.get',
        endpoint: '/api/kangur/progress',
        statusCode: 500,
      })
    );
  });
});

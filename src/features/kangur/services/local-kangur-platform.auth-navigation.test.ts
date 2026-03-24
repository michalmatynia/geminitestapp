/**
 * @vitest-environment jsdom
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createGuestKangurScore,
  getGuestKangurScoreSessionKey,
  hasGuestKangurScores,
} from '@/features/kangur/services/guest-kangur-scores';
import { KANGUR_PROGRESS_OWNER_STORAGE_KEY } from '@/features/kangur/ui/services/progress.contracts';

const {
  withCsrfHeadersMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  withCsrfHeadersMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
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

const loadLocalKangurPlatformModule = () =>
  vi.importActual<typeof import('@/features/kangur/services/local-kangur-platform')>(
    '@/features/kangur/services/local-kangur-platform'
  );

const loadProgressModule = () =>
  vi.importActual<typeof import('@/features/kangur/ui/services/progress')>(
    '@/features/kangur/ui/services/progress'
  );

const loadActiveLearnerModule = () =>
  vi.importActual<typeof import('@/features/kangur/services/kangur-active-learner')>(
    '@/features/kangur/services/kangur-active-learner'
  );

describe('createLocalKangurPlatform auth navigation', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    localStorage.clear();
    withCsrfHeadersMock.mockImplementation((headers?: HeadersInit) => new Headers(headers));
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        assign: vi.fn(),
        href: `${originalLocation.origin}/kangur/lessons?focus=division`,
        origin: originalLocation.origin,
      },
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
  });

  it('prepares a relative Kangur login href that preserves the full return URL', async () => {
    const { createLocalKangurPlatform } = await loadLocalKangurPlatformModule();
    const platform = createLocalKangurPlatform();

    expect(platform.auth.prepareLoginHref(window.location.href)).toBe(
      `/kangur/login?callbackUrl=${encodeURIComponent(window.location.href)}`
    );
  });

  it('prepares a root login href when Kangur owns the public frontend at /', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        assign: vi.fn(),
        href: `${originalLocation.origin}/tests?focus=division`,
        origin: originalLocation.origin,
      },
      configurable: true,
      writable: true,
    });

    const { createLocalKangurPlatform } = await loadLocalKangurPlatformModule();
    const platform = createLocalKangurPlatform();

    expect(platform.auth.prepareLoginHref(window.location.href)).toBe(
      `/login?callbackUrl=${encodeURIComponent(window.location.href)}`
    );
  });

  it('reuses the prepared href when redirecting to the Kangur login page', async () => {
    const { createLocalKangurPlatform } = await loadLocalKangurPlatformModule();
    const platform = createLocalKangurPlatform();

    platform.auth.redirectToLogin(window.location.href);

    expect(window.location.assign).toHaveBeenCalledWith(
      `/kangur/login?callbackUrl=${encodeURIComponent(window.location.href)}`
    );
  });

  it('clears the stored active learner when auth resolves anonymous', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { KANGUR_ACTIVE_LEARNER_STORAGE_KEY } = await loadActiveLearnerModule();
    window.localStorage.setItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY, 'learner-stale');

    const { createLocalKangurPlatform } = await loadLocalKangurPlatformModule();
    const platform = createLocalKangurPlatform();

    await expect(platform.auth.me()).rejects.toMatchObject({ status: 401 });
    expect(window.localStorage.getItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
  });

  it('clears the stored progress owner when auth resolves anonymous', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getProgressOwnerKey, saveProgressOwnerKey } = await loadProgressModule();
    saveProgressOwnerKey('learner-stale');

    const { createLocalKangurPlatform } = await loadLocalKangurPlatformModule();
    const platform = createLocalKangurPlatform();

    await expect(platform.auth.me()).rejects.toMatchObject({ status: 401 });
    expect(window.localStorage.getItem(KANGUR_PROGRESS_OWNER_STORAGE_KEY)).toBeNull();
    expect(getProgressOwnerKey()).toBeNull();
  });

  it('requests auth state with no-store caching so logout cannot reuse a stale session response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } = await loadLocalKangurPlatformModule();
    const platform = createLocalKangurPlatform();

    await expect(platform.auth.me()).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/me',
      expect.objectContaining({
        cache: 'no-store',
        method: 'GET',
        credentials: 'same-origin',
      })
    );
  });

  it('starts a fresh guest score session on logout', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', fetchMock);

    createGuestKangurScore({
      player_name: 'Gracz',
      score: 8,
      operation: 'addition',
      subject: 'maths',
      total_questions: 10,
      correct_answers: 8,
      time_taken: 27,
    });
    const previousSessionKey = getGuestKangurScoreSessionKey();

    const { createLocalKangurPlatform } = await loadLocalKangurPlatformModule();
    const platform = createLocalKangurPlatform();

    await platform.auth.logout();

    expect(hasGuestKangurScores()).toBe(false);
    expect(getGuestKangurScoreSessionKey()).not.toBe(previousSessionKey);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
      })
    );
  });

  it('clears the stored progress owner on logout', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getProgressOwnerKey, saveProgressOwnerKey } = await loadProgressModule();
    saveProgressOwnerKey('learner-stale');

    const { createLocalKangurPlatform } = await loadLocalKangurPlatformModule();
    const platform = createLocalKangurPlatform();

    await platform.auth.logout();

    expect(window.localStorage.getItem(KANGUR_PROGRESS_OWNER_STORAGE_KEY)).toBeNull();
    expect(getProgressOwnerKey()).toBeNull();
  });

  it('reloads the current Kangur page after server logout when a return URL is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } = await loadLocalKangurPlatformModule();
    const platform = createLocalKangurPlatform();

    await platform.auth.logout(window.location.href);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kangur/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
      })
    );
    expect(window.location.assign).toHaveBeenCalledWith(window.location.href);
  });
});

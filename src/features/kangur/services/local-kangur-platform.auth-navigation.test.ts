/**
 * @vitest-environment jsdom
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createGuestKangurScore,
  getGuestKangurScoreSessionKey,
  hasGuestKangurScores,
} from '@/features/kangur/services/guest-kangur-scores';

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
  logKangurClientError: logKangurClientErrorMock,
  trackKangurClientEvent: trackKangurClientEventMock,
}));

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
    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
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

    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
    const platform = createLocalKangurPlatform();

    expect(platform.auth.prepareLoginHref(window.location.href)).toBe(
      `/login?callbackUrl=${encodeURIComponent(window.location.href)}`
    );
  });

  it('reuses the prepared href when redirecting to the Kangur login page', async () => {
    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
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

    const { KANGUR_ACTIVE_LEARNER_STORAGE_KEY } = await import(
      '@/features/kangur/services/kangur-active-learner'
    );
    window.localStorage.setItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY, 'learner-stale');

    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
    const platform = createLocalKangurPlatform();

    await expect(platform.auth.me()).rejects.toMatchObject({ status: 401 });
    expect(window.localStorage.getItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY)).toBeNull();
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
      total_questions: 10,
      correct_answers: 8,
      time_taken: 27,
    });
    const previousSessionKey = getGuestKangurScoreSessionKey();

    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
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

  it('reloads the current Kangur page after server logout when a return URL is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { createLocalKangurPlatform } =
      await import('@/features/kangur/services/local-kangur-platform');
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

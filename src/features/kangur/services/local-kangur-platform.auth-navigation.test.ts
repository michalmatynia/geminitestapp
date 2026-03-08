/**
 * @vitest-environment jsdom
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  signOutMock,
  withCsrfHeadersMock,
  logKangurClientErrorMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  withCsrfHeadersMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  signOut: signOutMock,
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
    withCsrfHeadersMock.mockImplementation((headers?: HeadersInit) => new Headers(headers));
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        assign: vi.fn(),
        href: `${originalLocation.origin}/kangur/tests?focus=division`,
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
});

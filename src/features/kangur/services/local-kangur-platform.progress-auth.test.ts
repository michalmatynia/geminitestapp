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
  logKangurClientError: logKangurClientErrorMock,
  trackKangurClientEvent: trackKangurClientEventMock,
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

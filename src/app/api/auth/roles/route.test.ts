import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, logSystemEventMock, getErrorFingerprintMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  getErrorFingerprintMock: vi.fn(),
}));

const loadRoute = async () => {
  vi.resetModules();
  vi.unmock('@/shared/lib/api/api-handler');
  vi.doMock('@/features/auth/auth', () => ({
    auth: authMock,
  }));
  vi.doMock('@/features/auth/server', () => ({
    auth: authMock,
  }));
  vi.doMock('@/shared/lib/observability/system-logger', () => ({
    logSystemEvent: logSystemEventMock,
    getErrorFingerprint: getErrorFingerprintMock,
  }));
  const { PATCH } = await import('./route');
  return { PATCH };
};

describe('auth roles route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: true,
        permissions: ['auth.users.write'],
      },
    });
    logSystemEventMock.mockResolvedValue(undefined);
    getErrorFingerprintMock.mockResolvedValue('fingerprint-1');
  });

  it('returns validation error when payload schema is invalid', async () => {
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new NextRequest('http://localhost/api/auth/roles', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userRoles: 'invalid' }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Please review the highlighted fields and try again.',
      code: 'VALIDATION_ERROR',
    });
  });

  it('returns bad request for invalid JSON payloads', async () => {
    const { PATCH } = await loadRoute();
    const response = await PATCH(
      new NextRequest('http://localhost/api/auth/roles', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid JSON payload',
      code: 'BAD_REQUEST',
    });
  });
});

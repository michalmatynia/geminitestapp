import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, logSystemEventMock, getErrorFingerprintMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  getErrorFingerprintMock: vi.fn(),
}));

vi.mock('@/features/auth/auth', () => ({
  auth: authMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
  getErrorFingerprint: getErrorFingerprintMock,
}));

import { PATCH } from './route';

describe('auth roles route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(null);
    logSystemEventMock.mockResolvedValue(undefined);
    getErrorFingerprintMock.mockResolvedValue('fingerprint-1');
  });

  it('returns validation error when payload schema is invalid', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/auth/roles', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userRoles: 'invalid' }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
    });
  });

  it('returns bad request for invalid JSON payloads', async () => {
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

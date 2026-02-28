import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { POST } from '@/app/api/auth/verify-credentials/route';
import type { AuthSecurityProfile } from '@/features/auth/services/auth-security-profile';
import type { AuthUserRecord } from '@/features/auth/services/auth-user-repository';
import type { LoginChallengeDto } from '@/shared/contracts/auth';

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
  default: {
    compare: vi.fn(),
  },
}));

vi.mock('@/features/auth/server', () => ({
  findAuthUserByEmail: vi.fn(),
  getAuthSecurityProfile: vi.fn(),
  checkLoginAllowed: vi.fn().mockResolvedValue({ allowed: true, reason: null, lockedUntil: null }),
  extractClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  recordLoginFailure: vi.fn(),
  getAuthUserPageSettings: vi.fn().mockResolvedValue({ requireEmailVerification: false }),
  createLoginChallenge: vi.fn(),
  logAuthEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('Auth Verify Credentials API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies credentials successfully and returns challenge', async () => {
    const authServer = await import('@/features/auth/server');
    const mockUser: AuthUserRecord = { id: 'u1', email: 'test@example.com', passwordHash: 'hashed' };
    vi.mocked(authServer.findAuthUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(authServer.getAuthSecurityProfile).mockResolvedValue({
      mfaEnabled: false,
      allowedIps: [],
    } as unknown as AuthSecurityProfile);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(authServer.createLoginChallenge).mockResolvedValue({
      id: 'ch1',
      expiresAt: new Date(Date.now() + 60000),
      mfaRequired: false,
    } as unknown as Awaited<ReturnType<typeof authServer.createLoginChallenge>>);

    const req = new NextRequest('http://localhost/api/auth/verify-credentials', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.challengeId).toBe('ch1');
  });

  it('returns invalid credentials for wrong password', async () => {
    const authServer = await import('@/features/auth/server');
    const mockUser: AuthUserRecord = { id: 'u1', email: 'test@example.com', passwordHash: 'hashed' };
    vi.mocked(authServer.findAuthUserByEmail).mockResolvedValue(mockUser);
    vi.mocked(authServer.getAuthSecurityProfile).mockResolvedValue({
      allowedIps: [],
    } as unknown as AuthSecurityProfile);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const req = new NextRequest('http://localhost/api/auth/verify-credentials', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.ok).toBe(false);
    expect(data.code).toBe('INVALID_CREDENTIALS');
  });
});

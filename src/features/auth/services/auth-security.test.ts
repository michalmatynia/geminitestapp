import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_AUTH_SECURITY_POLICY } from '@/features/auth/utils/auth-security';

const originalMongoUri = process.env['MONGODB_URI'];

const loadAuthSecurityModule = async (options?: {
  securityPolicy?: Partial<typeof DEFAULT_AUTH_SECURITY_POLICY>;
}) => {
  vi.resetModules();

  const attempts = new Map<string, Record<string, unknown>>();
  const securityPolicy = options?.securityPolicy
    ? JSON.stringify({
        ...DEFAULT_AUTH_SECURITY_POLICY,
        ...options.securityPolicy,
      })
    : null;
  const logSystemEventMock = vi.fn().mockResolvedValue(undefined);

  vi.doMock('@/shared/lib/auth/services/auth-provider', () => ({
    getAuthDataProvider: vi.fn().mockResolvedValue('mongodb'),
    requireAuthProvider: vi.fn((provider: string) => provider),
  }));
  vi.doMock('@/shared/lib/observability/system-logger', () => ({
    logSystemEvent: logSystemEventMock,
  }));
  vi.doMock('@/shared/lib/db/mongo-client', () => ({
    getMongoDb: vi.fn().mockResolvedValue({
      collection: (name: string) => {
        if (name === 'settings') {
          return {
            findOne: vi.fn(async () =>
              securityPolicy ? { _id: 'auth_security_policy', value: securityPolicy } : null
            ),
          };
        }
        return {
          createIndex: vi.fn().mockResolvedValue(undefined),
          findOne: vi.fn(async (filter: { _id: string }) => attempts.get(filter._id) ?? null),
          updateOne: vi.fn(
            async (
              filter: { _id: string },
              update: { $set: Record<string, unknown> }
            ) => {
              attempts.set(filter._id, update.$set);
              return { acknowledged: true };
            }
          ),
          deleteOne: vi.fn(async (filter: { _id: string }) => {
            attempts.delete(filter._id);
            return { acknowledged: true, deletedCount: 1 };
          }),
        };
      },
    }),
  }));

  const module = await import('./auth-security');
  return {
    ...module,
    attempts,
    logSystemEventMock,
  };
};

describe('auth security service', () => {
  beforeEach(() => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/auth-security-test';
  });

  afterEach(() => {
    if (typeof originalMongoUri === 'string') {
      process.env['MONGODB_URI'] = originalMongoUri;
    } else {
      delete process.env['MONGODB_URI'];
    }
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('locks email login attempts after the configured threshold', async () => {
    const { recordLoginFailure, checkLoginAllowed, logSystemEventMock } =
      await loadAuthSecurityModule({
        securityPolicy: {
          lockoutMaxAttempts: 2,
        },
      });

    await recordLoginFailure({ email: 'Parent@Example.com' });
    await recordLoginFailure({ email: 'Parent@Example.com' });

    await expect(checkLoginAllowed({ email: 'parent@example.com' })).resolves.toMatchObject({
      allowed: false,
      reason: 'EMAIL_LOCKED',
    });
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: 'Auth email lockout triggered',
        source: 'auth.security',
        context: expect.objectContaining({
          email: 'parent@example.com',
          attempts: 2,
        }),
      })
    );
  });

  it('clears expired attempts when checking login eligibility', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T10:00:00.000Z'));

    const { recordLoginFailure, checkLoginAllowed, attempts } = await loadAuthSecurityModule({
      securityPolicy: {
        lockoutMaxAttempts: 1,
        lockoutWindowMinutes: 1,
        lockoutDurationMinutes: 1,
      },
    });

    await recordLoginFailure({ email: 'learner@example.com' });
    expect(attempts.size).toBe(1);

    vi.setSystemTime(new Date('2026-03-29T10:02:01.000Z'));

    await expect(checkLoginAllowed({ email: 'learner@example.com' })).resolves.toEqual({
      allowed: true,
      reason: null,
      lockedUntil: null,
    });
    expect(attempts.size).toBe(0);
  });

  it('reports password policy violations when strong-password rules are enabled', async () => {
    const { validatePasswordStrength } = await loadAuthSecurityModule();

    expect(
      validatePasswordStrength('weak', {
        ...DEFAULT_AUTH_SECURITY_POLICY,
        requireStrongPassword: true,
      })
    ).toEqual({
      ok: false,
      errors: [
        'Password must be at least 10 characters.',
        'Password must include at least one uppercase letter.',
        'Password must include at least one number.',
        'Password must include at least one symbol.',
      ],
    });
  });
});

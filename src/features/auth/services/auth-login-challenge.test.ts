import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalMongoUri = process.env['MONGODB_URI'];

const loadChallengeModule = async () => {
  vi.resetModules();

  vi.doMock('@/shared/lib/auth/services/auth-provider', () => ({
    getAuthDataProvider: vi.fn().mockResolvedValue('memory'),
    requireAuthProvider: vi.fn((provider: string) => provider),
  }));
  vi.doMock('@/shared/lib/db/mongo-client', () => ({
    getMongoDb: vi.fn(),
  }));
  vi.doMock('@/shared/lib/db/prisma', () => ({
    default: {
      authLoginChallenge: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
      },
    },
  }));

  return import('./auth-login-challenge');
};

describe('auth login challenge service', () => {
  beforeEach(() => {
    delete process.env['MONGODB_URI'];
  });

  afterEach(() => {
    if (typeof originalMongoUri === 'string') {
      process.env['MONGODB_URI'] = originalMongoUri;
    } else {
      delete process.env['MONGODB_URI'];
    }
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('replaces older email verification tokens for the same email', async () => {
    const {
      createEmailVerificationChallenge,
      consumeEmailVerificationChallenge,
      findActiveEmailVerificationChallengeByEmail,
    } =
      await loadChallengeModule();

    const first = await createEmailVerificationChallenge({
      email: 'parent@example.com',
      callbackUrl: '/kangur',
      pendingRegistration: {
        source: 'kangur_parent',
        name: 'Parent',
        passwordHash: 'hashed-password-1',
      },
    });
    const second = await createEmailVerificationChallenge({
      email: 'parent@example.com',
      callbackUrl: '/tests?focus=division',
      pendingRegistration: {
        source: 'kangur_parent',
        name: 'Parent',
        passwordHash: 'hashed-password-2',
      },
    });

    await expect(findActiveEmailVerificationChallengeByEmail('parent@example.com')).resolves.toMatchObject({
      userId: 'pending:kangur_parent:parent%40example.com',
      email: 'parent@example.com',
      callbackUrl: '/tests?focus=division',
      pendingRegistration: {
        source: 'kangur_parent',
        name: 'Parent',
        passwordHash: 'hashed-password-2',
      },
    });
    await expect(consumeEmailVerificationChallenge(first.id)).resolves.toBeNull();
    await expect(consumeEmailVerificationChallenge(second.id)).resolves.toMatchObject({
      userId: 'pending:kangur_parent:parent%40example.com',
      email: 'parent@example.com',
      callbackUrl: '/tests?focus=division',
      pendingRegistration: {
        source: 'kangur_parent',
        name: 'Parent',
        passwordHash: 'hashed-password-2',
      },
    });
    await expect(consumeEmailVerificationChallenge(second.id)).resolves.toBeNull();
  });

  it('keeps legacy verification challenges compatible when a user already exists', async () => {
    const { createEmailVerificationChallenge, consumeEmailVerificationChallenge } =
      await loadChallengeModule();

    const token = await createEmailVerificationChallenge({
      userId: 'parent-1',
      email: 'parent@example.com',
      callbackUrl: '/kangur/lessons',
    });

    await expect(consumeEmailVerificationChallenge(token.id)).resolves.toMatchObject({
      userId: 'parent-1',
      email: 'parent@example.com',
      callbackUrl: '/kangur/lessons',
      pendingRegistration: null,
    });
  });
});

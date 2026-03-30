import { ObjectId } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import {
  syncAccounts,
  syncAccountsPrismaToMongo,
  syncAuthSecurityProfiles,
  syncAuthSecurityProfilesPrismaToMongo,
  syncSessions,
  syncSessionsPrismaToMongo,
  syncUsers,
  syncUsersPrismaToMongo,
  syncVerificationTokens,
  syncVerificationTokensPrismaToMongo,
} from '@/shared/lib/db/services/sync/auth-sync';

const createMongo = (docsByCollection: Record<string, unknown[]>) => {
  const collections = new Map<
    string,
    {
      find: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      insertMany: ReturnType<typeof vi.fn>;
    }
  >();

  const collection = vi.fn((name: string) => {
    if (!collections.has(name)) {
      collections.set(name, {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(docsByCollection[name] ?? []),
        }),
        deleteMany: vi.fn().mockResolvedValue({ deletedCount: 5 }),
        insertMany: vi.fn().mockResolvedValue({ insertedCount: (docsByCollection[name] ?? []).length }),
      });
    }
    return collections.get(name)!;
  });

  return {
    mongo: { collection } as unknown as Parameters<typeof syncUsers>[0]['mongo'],
    collections,
  };
};

const baseContext = {
  normalizeId: (doc: Record<string, unknown>): string => {
    const rawId = doc._id;
    if (rawId instanceof ObjectId) return rawId.toString();
    if (typeof rawId === 'string') return rawId;
    if (typeof doc.id === 'string') return doc.id;
    return '';
  },
  toDate: (value: unknown): Date | null => (value ? new Date(value as string | Date) : null),
  toObjectIdMaybe: (value: string) => `oid:${value}`,
  toJsonValue: (value: unknown) => value,
  currencyCodes: new Set<string>(),
  countryCodes: new Set<string>(),
};

describe('auth-sync', () => {
  it('syncs auth collections from Mongo to Prisma with filtering and defaults', async () => {
    const userObjectId = new ObjectId('65f00123456789abcdef0001');
    const expiresAt = '2026-03-25T16:00:00.000Z';
    const { mongo } = createMongo({
      users: [
        {
          _id: 'user-1',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          emailVerified: expiresAt,
          image: 'avatar.png',
          passwordHash: 'hash-1',
        },
        {
          name: 'missing id',
        },
      ],
      accounts: [
        {
          _id: 'account-1',
          userId: userObjectId,
          provider: 'google',
          providerAccountId: 'google-1',
          scope: 'profile email',
        },
        {
          _id: 'account-2',
          userId: '',
        },
      ],
      sessions: [
        {
          _id: 'session-1',
          userId: userObjectId,
          sessionToken: 'token-1',
          expires: expiresAt,
        },
        {
          _id: 'session-2',
          userId: null,
          sessionToken: '',
        },
      ],
      verification_tokens: [
        {
          identifier: 'ada@example.com',
          token: 'verify-1',
          expires: expiresAt,
        },
        {
          identifier: 'broken@example.com',
          token: '',
        },
      ],
      auth_security_profiles: [
        {
          _id: 'profile-1',
          userId: 'user-1',
          mfaEnabled: 1,
          mfaSecret: 'secret',
          recoveryCodes: ['recover-1'],
          allowedIps: ['127.0.0.1'],
          disabledAt: expiresAt,
          bannedAt: null,
          createdAt: expiresAt,
          updatedAt: expiresAt,
        },
        {
          _id: 'profile-2',
          mfaEnabled: false,
          recoveryCodes: ['fallback'],
          allowedIps: [],
          createdAt: null,
          updatedAt: null,
        },
      ],
    });

    const prisma = {
      user: {
        deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      account: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      session: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      verificationToken: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      authSecurityProfile: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    } as unknown as Parameters<typeof syncUsers>[0]['prisma'];

    const usersResult = await syncUsers({
      mongo,
      prisma,
      ...baseContext,
    });
    const accountsResult = await syncAccounts({
      mongo,
      prisma,
      ...baseContext,
    });
    const sessionsResult = await syncSessions({
      mongo,
      prisma,
      ...baseContext,
    });
    const verificationTokensResult = await syncVerificationTokens({
      mongo,
      prisma,
      ...baseContext,
    });
    const profilesResult = await syncAuthSecurityProfiles({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(usersResult).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });
    expect(accountsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 3,
      targetInserted: 1,
    });
    expect(sessionsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
    });
    expect(verificationTokensResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(profilesResult).toEqual({
      sourceCount: 2,
      targetDeleted: 1,
      targetInserted: 2,
    });

    expect(prisma.user.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'user-1',
          emailVerified: new Date(expiresAt),
          passwordHash: 'hash-1',
        }),
      ],
    });
    expect(prisma.account.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'account-1',
          userId: userObjectId.toString(),
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'google-1',
        }),
      ],
    });
    expect(prisma.session.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'session-1',
          userId: userObjectId.toString(),
          sessionToken: 'token-1',
          expires: new Date(expiresAt),
        }),
      ],
    });
    expect(prisma.verificationToken.createMany).toHaveBeenCalledWith({
      data: [
        {
          identifier: 'ada@example.com',
          token: 'verify-1',
          expires: new Date(expiresAt),
        },
      ],
    });
    expect(prisma.authSecurityProfile.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'profile-1',
          userId: 'user-1',
          mfaEnabled: true,
          disabledAt: new Date(expiresAt),
        }),
        expect.objectContaining({
          id: 'profile-2',
          userId: 'profile-2',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      ],
    });
  });

  it('syncs auth collections from Prisma back to Mongo', async () => {
    const createdAt = new Date('2026-03-25T17:00:00.000Z');
    const { mongo, collections } = createMongo({});

    const prisma = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'user-1',
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            emailVerified: createdAt,
            image: 'avatar.png',
            passwordHash: 'hash-1',
          },
        ]),
      },
      account: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'account-1',
            userId: 'user-1',
            type: 'oauth',
            provider: 'google',
            providerAccountId: 'google-1',
            refresh_token: 'refresh',
            access_token: 'access',
            expires_at: 3600,
            token_type: 'Bearer',
            scope: 'profile',
            id_token: 'id-token',
            session_state: 'state',
          },
        ]),
      },
      session: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'session-1',
            sessionToken: 'token-1',
            userId: 'user-1',
            expires: createdAt,
          },
        ]),
      },
      verificationToken: {
        findMany: vi.fn().mockResolvedValue([
          {
            identifier: 'ada@example.com',
            token: 'verify-1',
            expires: createdAt,
          },
        ]),
      },
      authSecurityProfile: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'profile-1',
            userId: 'user-1',
            mfaEnabled: true,
            mfaSecret: 'secret',
            recoveryCodes: ['recover-1'],
            allowedIps: ['127.0.0.1'],
            disabledAt: null,
            bannedAt: createdAt,
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
    } as unknown as Parameters<typeof syncUsersPrismaToMongo>[0]['prisma'];

    const usersResult = await syncUsersPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const accountsResult = await syncAccountsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const sessionsResult = await syncSessionsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const verificationTokensResult = await syncVerificationTokensPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const profilesResult = await syncAuthSecurityProfilesPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(usersResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });
    expect(accountsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });
    expect(sessionsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });
    expect(verificationTokensResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });
    expect(profilesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });

    expect(collections.get('users')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'oid:user-1',
        id: 'user-1',
        passwordHash: 'hash-1',
      }),
    ]);
    expect(collections.get('accounts')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'oid:account-1',
        userId: 'oid:user-1',
        providerAccountId: 'google-1',
      }),
    ]);
    expect(collections.get('sessions')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'oid:session-1',
        sessionToken: 'token-1',
        userId: 'oid:user-1',
      }),
    ]);
    expect(collections.get('verification_tokens')?.insertMany).toHaveBeenCalledWith([
      {
        identifier: 'ada@example.com',
        token: 'verify-1',
        expires: createdAt,
      },
    ]);
    expect(collections.get('auth_security_profiles')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'profile-1',
        userId: 'user-1',
        recoveryCodes: ['recover-1'],
        bannedAt: createdAt,
      }),
    ]);
  });
});

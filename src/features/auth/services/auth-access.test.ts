import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalMongoUri = process.env['MONGODB_URI'];

const loadAuthAccessModule = async () => {
  vi.resetModules();

  const settingsDocs = [
    {
      _id: 'auth_roles',
      key: 'auth_roles',
      value: JSON.stringify([
        {
          id: 'editor',
          name: 'Editor',
          permissions: ['products.manage'],
          level: 50,
        },
      ]),
      updatedAt: new Date('2026-04-09T00:00:00.000Z').toISOString(),
    },
    {
      _id: 'auth_user_roles',
      key: 'auth_user_roles',
      value: JSON.stringify({
        'user-1': 'editor',
      }),
      updatedAt: new Date('2026-04-09T00:00:00.000Z').toISOString(),
    },
    {
      _id: 'auth_default_role',
      key: 'auth_default_role',
      value: 'viewer',
      updatedAt: new Date('2026-04-09T00:00:00.000Z').toISOString(),
    },
  ];

  const settingsFindMock = vi.fn(() => ({
    toArray: vi.fn(async () => settingsDocs),
  }));

  vi.doMock('@/shared/lib/db/mongo-client', () => ({
    getMongoDb: vi.fn().mockResolvedValue({
      collection: vi.fn(() => ({
        find: settingsFindMock,
      })),
    }),
  }));
  vi.doMock('@/shared/lib/observability/system-logger', () => ({
    logSystemEvent: vi.fn().mockResolvedValue(undefined),
  }));

  const module = await import('./auth-access');
  return {
    ...module,
    settingsFindMock,
  };
};

describe('auth access service', () => {
  beforeEach(() => {
    process.env['MONGODB_URI'] = 'mongodb://127.0.0.1:27017/auth-access-test';
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

  it('reads role settings in a single query when computing access', async () => {
    const { getAuthAccessForUser, settingsFindMock } = await loadAuthAccessModule();

    await expect(getAuthAccessForUser('user-1')).resolves.toMatchObject({
      roleId: 'editor',
      permissions: expect.arrayContaining(['products.manage']),
      roleAssigned: true,
    });

    expect(settingsFindMock).toHaveBeenCalledTimes(1);
  });
});

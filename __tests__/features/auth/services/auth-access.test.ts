import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAuthAccessForUser,
  invalidateAuthAccessCache,
} from '@/features/auth/services/auth-access';
import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Db } from 'mongodb';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

const mockFindOne = vi.fn();
const mockCollection = vi.fn(() => ({
  findOne: mockFindOne,
}));
const mockDb = {
  collection: mockCollection,
};

const setSettings = (settings: Record<string, string | null>): void => {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'string') {
      map.set(key, value);
    }
  }

  mockFindOne.mockImplementation((query: { $or?: Array<{ _id?: string; key?: string }> }) => {
    const key = query?.$or?.[0]?._id ?? query?.$or?.[1]?.key;
    if (!key) return null;
    const value = map.get(key);
    return value ? { value } : null;
  });
};

describe('Auth Access', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://test';
    vi.mocked(getMongoDb).mockResolvedValue(mockDb as unknown as Db);
    invalidateAuthAccessCache();
  });

  afterEach(() => {
    delete process.env['MONGODB_URI'];
  });

  it('marks unassigned users as roleAssigned=false even with a default role', async () => {
    setSettings({
      [AUTH_SETTINGS_KEYS.userRoles]: JSON.stringify({}),
      [AUTH_SETTINGS_KEYS.defaultRole]: 'viewer',
    });

    const access = await getAuthAccessForUser('user-1');

    expect(access.roleAssigned).toBe(false);
    expect(access.roleId).toBe('viewer');
  });

  it('marks assigned users as roleAssigned=true', async () => {
    setSettings({
      [AUTH_SETTINGS_KEYS.userRoles]: JSON.stringify({ 'user-1': 'admin' }),
    });

    const access = await getAuthAccessForUser('user-1');

    expect(access.roleAssigned).toBe(true);
    expect(access.roleId).toBe('admin');
  });
});

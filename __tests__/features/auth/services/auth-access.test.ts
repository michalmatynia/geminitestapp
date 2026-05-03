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

const mockFind = vi.fn();
const mockCollection = vi.fn(() => ({
  find: mockFind,
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

  mockFind.mockImplementation((query: { $or?: Array<{ _id?: string; key?: string }> }) => {
    const requestedKeys = new Set<string>();
    (query?.$or ?? []).forEach((q) => {
      if (q._id) requestedKeys.add(q._id);
      if (q.key) requestedKeys.add(q.key);
    });

    const docs: any[] = [];
    map.forEach((value, key) => {
      if (requestedKeys.has(key)) {
        docs.push({ _id: key, key, value, updatedAt: new Date().toISOString() });
      }
    });

    return {
      toArray: async () => docs,
    };
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

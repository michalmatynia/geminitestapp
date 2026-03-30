import { NextRequest } from 'next/server';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const authMock = vi.hoisted(() => vi.fn());
const getAuthDataProviderMock = vi.hoisted(() => vi.fn());
const requireAuthProviderMock = vi.hoisted(() => vi.fn());
const logAuthEventMock = vi.hoisted(() => vi.fn());
const invalidateAuthAccessCacheMock = vi.hoisted(() => vi.fn());
const invalidateAuthSecurityProfileCacheMock = vi.hoisted(() => vi.fn());
const invalidateUserPreferencesCacheMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
  getAuthDataProvider: getAuthDataProviderMock,
  requireAuthProvider: requireAuthProviderMock,
  logAuthEvent: logAuthEventMock,
  invalidateAuthAccessCache: invalidateAuthAccessCacheMock,
  invalidateAuthSecurityProfileCache: invalidateAuthSecurityProfileCacheMock,
  invalidateUserPreferencesCache: invalidateUserPreferencesCacheMock,
  normalizeAuthEmail: (email: string) => email,
  AUTH_SETTINGS_KEYS: { userRoles: 'auth_user_roles' },
}));

const getMongoDbMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { deleteAuthUserHandler } from '@/app/api/auth/users/[id]/handler';

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

const deleteFailureLogExpectation = (outcome: string) =>
  expect.objectContaining({
    action: 'auth.users.delete',
    stage: 'failure',
    outcome,
  });

const STORED_USER_ROLES_JSON = JSON.stringify({ 'user-2': 'viewer' });

describe('Auth Users delete handler', () => {
  const usersCollection = {
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  };
  const settingsCollection = {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  };
  const accountsCollection = { deleteMany: vi.fn() };
  const sessionsCollection = { deleteMany: vi.fn() };
  const authSecurityProfilesCollection = { deleteMany: vi.fn() };
  const userPreferencesCollection = { deleteMany: vi.fn() };

  const collection = vi.fn((name: string) => {
    switch (name) {
      case 'users':
        return usersCollection;
      case 'settings':
        return settingsCollection;
      case 'accounts':
        return accountsCollection;
      case 'sessions':
        return sessionsCollection;
      case 'auth_security_profiles':
        return authSecurityProfilesCollection;
      case 'user_preferences':
        return userPreferencesCollection;
      default:
        throw new Error(`Unexpected collection: ${name}`);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://test';
    getMongoDbMock.mockResolvedValue({ collection });
    getAuthDataProviderMock.mockResolvedValue('mongodb');
    requireAuthProviderMock.mockReturnValue('mongodb');
  });

  afterEach(() => {
    delete process.env['MONGODB_URI'];
  });

  it('blocks self-delete attempts', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-1', isElevated: true } });

    await expect(
      deleteAuthUserHandler(
        new NextRequest('http://localhost/api/auth/users/user-1', { method: 'DELETE' }),
        mockContext,
        { id: 'user-1' }
      )
    ).rejects.toThrow('You cannot delete your own account while signed in.');

    expect(logAuthEventMock).toHaveBeenCalledWith(
      deleteFailureLogExpectation('self_delete_blocked')
    );
  });

  it('deletes a user and clears related records', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', isElevated: true } });
    usersCollection.findOne.mockResolvedValue({ _id: 'user-2', email: 'user@example.com' });
    usersCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    accountsCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });
    sessionsCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });
    authSecurityProfilesCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });
    userPreferencesCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });
    settingsCollection.findOne.mockResolvedValue({
      value: STORED_USER_ROLES_JSON,
    });
    settingsCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const response = await deleteAuthUserHandler(
      new NextRequest('http://localhost/api/auth/users/user-2', { method: 'DELETE' }),
      mockContext,
      { id: 'user-2' }
    );
    const payload = (await response.json()) as { id: string; deleted: boolean };

    expect(response.status).toBe(200);
    expect(payload).toEqual({ id: 'user-2', deleted: true });
    expect(usersCollection.deleteOne).toHaveBeenCalled();
    expect(settingsCollection.updateOne).toHaveBeenCalled();
    expect(invalidateAuthAccessCacheMock).toHaveBeenCalledWith('user-2');
    expect(invalidateAuthSecurityProfileCacheMock).toHaveBeenCalledWith('user-2');
    expect(invalidateUserPreferencesCacheMock).toHaveBeenCalledWith('user-2');
  });

  it('rejects requests without a user id', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', isElevated: true } });

    await expect(
      deleteAuthUserHandler(
        new NextRequest('http://localhost/api/auth/users/', { method: 'DELETE' }),
        mockContext,
        { id: '' }
      )
    ).rejects.toThrow('Missing user id.');

    expect(logAuthEventMock).toHaveBeenCalledWith(
      deleteFailureLogExpectation('missing_user_id')
    );
  });
});

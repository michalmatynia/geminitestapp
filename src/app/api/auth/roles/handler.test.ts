import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, badRequestError, internalError } from '@/shared/errors/app-error';

const {
  authMock,
  getAuthRolesMock,
  getAuthPermissionsMock,
  getAuthUserRolesMock,
  getAuthDefaultRoleIdMock,
  invalidateAuthAccessCacheMock,
  getMongoDbMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getAuthRolesMock: vi.fn(),
  getAuthPermissionsMock: vi.fn(),
  getAuthUserRolesMock: vi.fn(),
  getAuthDefaultRoleIdMock: vi.fn(),
  invalidateAuthAccessCacheMock: vi.fn(),
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('@/features/auth/services/auth-access', () => ({
  getAuthRoles: getAuthRolesMock,
  getAuthPermissions: getAuthPermissionsMock,
  getAuthUserRoles: getAuthUserRolesMock,
  getAuthDefaultRoleId: getAuthDefaultRoleIdMock,
  invalidateAuthAccessCache: invalidateAuthAccessCacheMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { GET_handler, PATCH_handler } from './handler';

const createRequestContext = (body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'request-auth-roles-1',
    traceId: 'trace-auth-roles-1',
    correlationId: 'corr-auth-roles-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('auth roles handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
  });

  it('rejects unauthorized users for GET', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: false,
        permissions: [],
      },
    });

    await expect(
      GET_handler(new NextRequest('http://localhost/api/auth/roles'), createRequestContext())
    ).rejects.toMatchObject(authError('Unauthorized.'));
  });

  it('returns role settings for authorized users', async () => {
    const roles = [
      {
        id: 'admin',
        name: 'Admin',
        description: 'Admin role',
        permissions: ['auth.users.read'],
        deniedPermissions: [],
        level: 90,
      },
    ];
    const permissions = [
      {
        id: 'auth.users.read',
        name: 'View users',
        description: 'View user list',
      },
    ];
    const userRoles = { 'user-1': 'admin' };

    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: false,
        permissions: ['auth.users.read'],
      },
    });
    getAuthRolesMock.mockResolvedValue(roles);
    getAuthPermissionsMock.mockResolvedValue(permissions);
    getAuthUserRolesMock.mockResolvedValue(userRoles);
    getAuthDefaultRoleIdMock.mockResolvedValue('viewer');

    const response = await GET_handler(
      new NextRequest('http://localhost/api/auth/roles'),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      roles,
      permissions,
      userRoles,
      defaultRoleId: 'viewer',
    });
  });

  it('rejects unauthorized users for PATCH', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: false,
        permissions: ['auth.users.read'],
      },
    });

    await expect(
      PATCH_handler(new NextRequest('http://localhost/api/auth/roles'), createRequestContext({}))
    ).rejects.toMatchObject(authError('Unauthorized.'));
  });

  it('persists user role mappings and returns updated settings', async () => {
    const userRoles = { 'user-1': 'admin', 'user-2': 'viewer' };
    const roles = [
      {
        id: 'admin',
        name: 'Admin',
        description: 'Admin role',
        permissions: ['auth.users.read'],
        deniedPermissions: [],
        level: 90,
      },
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'Viewer role',
        permissions: ['auth.users.read'],
        deniedPermissions: [],
        level: 10,
      },
    ];
    const permissions = [
      {
        id: 'auth.users.read',
        name: 'View users',
        description: 'View user list',
      },
    ];

    authMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        isElevated: false,
        permissions: ['auth.users.write'],
      },
    });
    getAuthRolesMock.mockResolvedValue(roles);
    getAuthPermissionsMock.mockResolvedValue(permissions);
    getAuthUserRolesMock.mockResolvedValue(userRoles);
    getAuthDefaultRoleIdMock.mockResolvedValue('viewer');

    const findOneAndUpdateMock = vi.fn().mockResolvedValue({ value: { _id: 'doc-1' } });
    const deleteManyMock = vi.fn().mockResolvedValue({ acknowledged: true });
    const collectionMock = vi
      .fn()
      .mockReturnValue({ findOneAndUpdate: findOneAndUpdateMock, deleteMany: deleteManyMock });
    getMongoDbMock.mockResolvedValue({ collection: collectionMock });

    const response = await PATCH_handler(
      new NextRequest('http://localhost/api/auth/roles', { method: 'PATCH' }),
      createRequestContext({ userRoles })
    );

    expect(collectionMock).toHaveBeenCalledWith('settings');
    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([expect.objectContaining({ _id: 'auth_user_roles' })]),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          key: 'auth_user_roles',
          value: JSON.stringify(userRoles),
        }),
        $setOnInsert: expect.objectContaining({
          createdAt: expect.any(Date),
        }),
      }),
      expect.objectContaining({ upsert: true, returnDocument: 'after' })
    );
    expect(deleteManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([expect.objectContaining({ _id: 'auth_user_roles' })]),
        _id: { $ne: 'doc-1' },
      })
    );
    expect(invalidateAuthAccessCacheMock).toHaveBeenCalled();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      roles,
      permissions,
      userRoles,
      defaultRoleId: 'viewer',
    });
  });

  it('rejects PATCH requests with missing payload', async () => {
    authMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        isElevated: true,
        permissions: [],
      },
    });

    await expect(
      PATCH_handler(new NextRequest('http://localhost/api/auth/roles', { method: 'PATCH' }), createRequestContext())
    ).rejects.toMatchObject(badRequestError('Invalid payload.'));
  });

  it('rejects PATCH requests when MongoDB is not configured', async () => {
    process.env['MONGODB_URI'] = '';
    authMock.mockResolvedValue({
      user: {
        id: 'admin-1',
        isElevated: true,
        permissions: [],
      },
    });

    await expect(
      PATCH_handler(
        new NextRequest('http://localhost/api/auth/roles', { method: 'PATCH' }),
        createRequestContext({ userRoles: {} })
      )
    ).rejects.toMatchObject(internalError('MongoDB is not configured.'));
  });
});

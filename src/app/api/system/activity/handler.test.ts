import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivityTypes } from '@/shared/constants/observability';
import type { ActivityLog } from '@/shared/contracts/system';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  assertSettingsManageAccessMock,
  getActivityRepositoryMock,
  listActivityMock,
  countActivityMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  getActivityRepositoryMock: vi.fn(),
  listActivityMock: vi.fn(),
  countActivityMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/shared/lib/observability/activity-repository', () => ({
  getActivityRepository: getActivityRepositoryMock,
}));

import { GET_handler } from './handler';

const createRequestContext = (query: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-system-activity-1',
    traceId: 'trace-system-activity-1',
    correlationId: 'corr-system-activity-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query,
  }) as ApiHandlerContext;

describe('system activity handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActivityRepositoryMock.mockResolvedValue({
      listActivity: listActivityMock,
      countActivity: countActivityMock,
      createActivity: vi.fn(),
      deleteActivity: vi.fn(),
    });
  });

  it('passes the activity type filter through to the repository and returns paginated data', async () => {
    const logs: ActivityLog[] = [
      {
        id: 'activity-1',
        type: ActivityTypes.AUTH.LOGIN,
        description: 'User logged in: ada@example.com',
        userId: 'user-1',
        entityId: 'user-1',
        entityType: 'user',
        metadata: {
          surface: 'kangur',
          loginMethod: 'password',
        },
        createdAt: '2026-03-19T09:00:00.000Z',
        updatedAt: '2026-03-19T09:00:00.000Z',
      },
    ];
    listActivityMock.mockResolvedValue(logs);
    countActivityMock.mockResolvedValue(1);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/system/activity'),
      createRequestContext({
        page: 2,
        pageSize: 25,
        search: 'ada@example.com',
        type: ActivityTypes.AUTH.LOGIN,
      })
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(listActivityMock).toHaveBeenCalledWith({
      limit: 25,
      offset: 25,
      search: 'ada@example.com',
      type: ActivityTypes.AUTH.LOGIN,
    });
    expect(countActivityMock).toHaveBeenCalledWith({
      limit: 25,
      offset: 25,
      search: 'ada@example.com',
      type: ActivityTypes.AUTH.LOGIN,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: logs,
      total: 1,
      page: 2,
      pageSize: 25,
    });
  });

  it('omits optional filters when they are not provided', async () => {
    listActivityMock.mockResolvedValue([]);
    countActivityMock.mockResolvedValue(0);

    await GET_handler(
      new NextRequest('http://localhost/api/system/activity'),
      createRequestContext({
        page: 1,
        pageSize: 10,
      })
    );

    expect(listActivityMock).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
    });
    expect(countActivityMock).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
    });
  });
});

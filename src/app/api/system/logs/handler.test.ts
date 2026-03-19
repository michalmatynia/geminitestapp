import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  assertSettingsManageAccessMock,
  clearSystemLogsMock,
  clearActivityLogsMock,
  clearAnalyticsEventsMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  clearSystemLogsMock: vi.fn(),
  clearActivityLogsMock: vi.fn(),
  clearAnalyticsEventsMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: vi.fn(),
}));

vi.mock('@/shared/lib/api/handle-api-error', () => ({
  createErrorResponse: vi.fn(),
}));

vi.mock('@/features/observability/server', () => ({
  hydrateLogRuntimeContext: vi.fn(),
  hydrateSystemLogRecordRuntimeContext: vi.fn(),
}));

vi.mock('@/shared/lib/auth/settings-manage-access', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/shared/lib/observability/system-log-repository', () => ({
  clearSystemLogs: clearSystemLogsMock,
  createSystemLog: vi.fn(),
  listSystemLogs: vi.fn(),
}));

vi.mock('@/shared/lib/observability/activity-repository', () => ({
  clearActivityLogs: clearActivityLogsMock,
}));

vi.mock('@/shared/lib/analytics/server', () => ({
  clearAnalyticsEvents: clearAnalyticsEventsMock,
}));

import { DELETE_handler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-system-logs-delete-1',
    traceId: 'trace-system-logs-delete-1',
    correlationId: 'corr-system-logs-delete-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('system logs delete handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears only error-level system logs when the error_logs target is selected', async () => {
    clearSystemLogsMock.mockResolvedValue({ deleted: 4 });

    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/system/logs?target=error_logs'),
      createRequestContext()
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(clearSystemLogsMock).toHaveBeenCalledWith({
      before: null,
      level: 'error',
    });
    expect(clearActivityLogsMock).not.toHaveBeenCalled();
    expect(clearAnalyticsEventsMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      target: 'error_logs',
      deleted: 4,
      deletedByTarget: {
        systemLogs: 4,
        activityLogs: 0,
        pageAccessLogs: 0,
      },
    });
  });

  it('clears only info-level system logs when the info_logs target is selected', async () => {
    clearSystemLogsMock.mockResolvedValue({ deleted: 6 });

    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/system/logs?target=info_logs'),
      createRequestContext()
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(clearSystemLogsMock).toHaveBeenCalledWith({
      before: null,
      level: 'info',
    });
    expect(clearActivityLogsMock).not.toHaveBeenCalled();
    expect(clearAnalyticsEventsMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      target: 'info_logs',
      deleted: 6,
      deletedByTarget: {
        systemLogs: 6,
        activityLogs: 0,
        pageAccessLogs: 0,
      },
    });
  });

  it('clears all supported log groups for the all_logs target', async () => {
    clearSystemLogsMock.mockResolvedValue({ deleted: 9 });
    clearActivityLogsMock.mockResolvedValue({ deleted: 5 });
    clearAnalyticsEventsMock.mockResolvedValue({ deleted: 7 });

    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/system/logs?target=all_logs&before=2026-03-19T10:00:00.000Z'),
      createRequestContext()
    );

    expect(clearSystemLogsMock).toHaveBeenCalledWith({
      before: new Date('2026-03-19T10:00:00.000Z'),
    });
    expect(clearActivityLogsMock).toHaveBeenCalledWith({
      before: new Date('2026-03-19T10:00:00.000Z'),
    });
    expect(clearAnalyticsEventsMock).toHaveBeenCalledWith({
      before: new Date('2026-03-19T10:00:00.000Z'),
      type: 'pageview',
    });
    await expect(response.json()).resolves.toEqual({
      target: 'all_logs',
      deleted: 21,
      deletedByTarget: {
        systemLogs: 9,
        activityLogs: 5,
        pageAccessLogs: 7,
      },
    });
  });
});

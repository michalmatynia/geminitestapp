import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  hydrateSystemLogRecordRuntimeContextMock,
  assertSettingsManageAccessMock,
  listSystemLogsMock,
  clearSystemLogsMock,
  clearActivityLogsMock,
  clearAnalyticsEventsMock,
} = vi.hoisted(() => ({
  hydrateSystemLogRecordRuntimeContextMock: vi.fn(),
  assertSettingsManageAccessMock: vi.fn(),
  listSystemLogsMock: vi.fn(),
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

vi.mock('@/features/observability/entry-server', () => ({
  hydrateLogRuntimeContext: vi.fn(),
  hydrateSystemLogRecordRuntimeContext: hydrateSystemLogRecordRuntimeContextMock,
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/shared/lib/observability/system-log-repository', () => ({
  clearSystemLogs: clearSystemLogsMock,
  createSystemLog: vi.fn(),
  listSystemLogs: listSystemLogsMock,
}));

vi.mock('@/shared/lib/observability/activity-repository', () => ({
  clearActivityLogs: clearActivityLogsMock,
}));

vi.mock('@/shared/lib/analytics/server', () => ({
  clearAnalyticsEvents: clearAnalyticsEventsMock,
}));

import { DELETE_handler, GET_handler } from './handler';

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
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
  });

  it('parses shared list query DTOs before loading and hydrating logs', async () => {
    listSystemLogsMock.mockResolvedValue({
      logs: [
        {
          id: 'log-1',
          level: 'error',
          message: 'Run failed',
          source: ' api ',
          service: 'worker',
          context: null,
          stack: null,
          path: '/api/system/logs',
          method: 'GET',
          statusCode: 500,
          requestId: 'req-1',
          traceId: 'trace-1',
          correlationId: 'corr-1',
          spanId: null,
          parentSpanId: null,
          userId: null,
          category: 'system',
          createdAt: '2026-03-20T10:00:00.000Z',
          updatedAt: null,
        },
      ],
      total: 1,
      page: 2,
      pageSize: 25,
    });
    hydrateSystemLogRecordRuntimeContextMock.mockImplementation(async (log) => ({
      ...log,
      source: 'api',
    }));

    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/system/logs?page=2&pageSize=25&level=error&source=%20api%20&from=2026-03-20T00:00:00.000Z'
      ),
      createRequestContext()
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(listSystemLogsMock).toHaveBeenCalledWith({
      page: 2,
      pageSize: 25,
      level: 'error',
      source: 'api',
      service: undefined,
      method: undefined,
      statusCode: undefined,
      minDurationMs: undefined,
      requestId: undefined,
      traceId: undefined,
      correlationId: undefined,
      userId: undefined,
      fingerprint: undefined,
      category: undefined,
      query: undefined,
      from: new Date('2026-03-20T00:00:00.000Z'),
      to: null,
    });
    expect(hydrateSystemLogRecordRuntimeContextMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'log-1' })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      logs: [
        expect.objectContaining({
          id: 'log-1',
          source: 'api',
        }),
      ],
      total: 1,
      page: 2,
      pageSize: 25,
    });
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

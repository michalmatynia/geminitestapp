import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { assertSettingsManageAccessMock, getSystemLogMetricsMock } = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  getSystemLogMetricsMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/shared/lib/observability/system-log-repository', () => ({
  getSystemLogMetrics: getSystemLogMetricsMock,
}));

import { GET_handler } from './handler';

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-system-log-metrics-1',
    traceId: 'trace-system-log-metrics-1',
    correlationId: 'corr-system-log-metrics-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

describe('system log metrics handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
    getSystemLogMetricsMock.mockResolvedValue({
      total: 4,
      levels: { info: 1, warn: 1, error: 2 },
      last24Hours: 3,
      last7Days: 4,
      topSources: [],
      topServices: [],
      topPaths: [],
      generatedAt: '2026-03-22T10:00:00.000Z',
    });
  });

  it('parses shared metrics query DTOs before loading metrics', async () => {
    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/system/logs/metrics?level=warn&source=%20worker%20&minDurationMs=150&to=2026-03-22T10:00:00.000Z'
      ),
      createRequestContext()
    );

    expect(assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(getSystemLogMetricsMock).toHaveBeenCalledWith({
      level: 'warn',
      source: 'worker',
      service: undefined,
      method: undefined,
      statusCode: undefined,
      minDurationMs: 150,
      requestId: undefined,
      traceId: undefined,
      correlationId: undefined,
      userId: undefined,
      fingerprint: undefined,
      category: undefined,
      query: undefined,
      from: null,
      to: new Date('2026-03-22T10:00:00.000Z'),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      metrics: expect.objectContaining({
        total: 4,
        last24Hours: 3,
      }),
    });
  });
});

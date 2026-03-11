import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET } from '@/app/api/system/logs/metrics/route';
import { getSystemLogMetrics } from '@/shared/lib/observability/system-logger';

vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandler:
    (handler: (req: NextRequest, ctx: unknown) => Promise<Response>) =>
      async (req: NextRequest): Promise<Response> =>
        handler(req, {
          requestId: 'test-request-id',
        }),
}));

vi.mock('@/shared/lib/auth/settings-manage-access', () => ({
  assertSettingsManageAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  getSystemLogMetrics: vi.fn(),
}));

describe('System Logs Metrics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/system/logs/metrics should return log metrics', async () => {
    vi.mocked(getSystemLogMetrics).mockResolvedValue({
      total: 10,
      levels: { info: 7, warn: 0, error: 3 },
      last24Hours: 10,
      last7Days: 10,
      topSources: [{ source: 'web', count: 10 }],
      topServices: [],
      topPaths: [{ path: '/api/test', count: 5 }],
      generatedAt: new Date().toISOString(),
    });

    const req = new NextRequest('http://localhost/api/system/logs/metrics');
    const res = await GET(req);
    const body = await res.json();
    const data = body.metrics;

    expect(res.status).toBe(200);
    expect(data.total).toBe(10);
    expect(data.levels.info).toBe(7);
    expect(data.levels.error).toBe(3);
    expect(data.topSources[0].source).toBe('web');
    expect(data.topPaths[0].path).toBe('/api/test');
  });
});

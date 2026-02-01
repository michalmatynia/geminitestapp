import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/system/logs/metrics/route';
import prisma from '@/shared/lib/db/prisma';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

// Mock Prisma
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    systemLog: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

// Mock provider
vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn(),
}));

describe('System Logs Metrics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAppDbProvider as any).mockResolvedValue('prisma');
  });

  it('GET /api/system/logs/metrics should return log metrics', async () => {
    (prisma.systemLog.count as any).mockResolvedValue(10);
    (prisma.systemLog.groupBy as any).mockImplementation(({ by }: { by: string[] }) => {
      if (by.includes('level')) {
        return [
          { level: 'info', _count: { _all: 7 } },
          { level: 'error', _count: { _all: 3 } },
        ];
      }
      if (by.includes('source')) {
        return [
          { source: 'web', _count: { _all: 10 } },
        ];
      }
      if (by.includes('path')) {
        return [
          { path: '/api/test', _count: { _all: 5 } },
        ];
      }
      return [];
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

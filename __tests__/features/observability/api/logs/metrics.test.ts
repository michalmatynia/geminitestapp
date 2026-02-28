import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET } from '@/app/api/system/logs/metrics/route';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import prisma from '@/shared/lib/db/prisma';

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
    vi.mocked(getAppDbProvider).mockResolvedValue('prisma');
  });

  it('GET /api/system/logs/metrics should return log metrics', async () => {
    vi.mocked(prisma.systemLog.count).mockResolvedValue(10);
    vi.mocked(prisma.systemLog.groupBy).mockImplementation((args) => {
      const by = args.by as string[];
      if (by.includes('level')) {
        return Promise.resolve([
          { level: 'info', _count: { _all: 7 } },
          { level: 'error', _count: { _all: 3 } },
        ] as unknown as any);
      }
      if (by.includes('source')) {
        return Promise.resolve([{ source: 'web', _count: { _all: 10 } }] as unknown as any);
      }
      if (by.includes('path')) {
        return Promise.resolve([{ path: '/api/test', _count: { _all: 5 } }] as unknown as any);
      }
      return Promise.resolve([]);
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

import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemLog, Prisma } from '@prisma/client';

import { GET, POST, DELETE } from '@/app/api/system/logs/route';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import prisma from '@/shared/lib/db/prisma';

// Mock Prisma
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    systemLog: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock provider
vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn(),
}));

describe('System Logs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAppDbProvider).mockResolvedValue('prisma');
  });

  it('GET /api/system/logs should list logs with pagination', async () => {
    vi.mocked(prisma.systemLog.count).mockResolvedValue(100);
    vi.mocked(prisma.systemLog.findMany).mockResolvedValue([
      { id: '1', level: 'error', message: 'Err 1', createdAt: new Date() } as unknown as SystemLog,
    ]);

    const req = new NextRequest('http://localhost/api/system/logs?page=1&pageSize=10');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(100);
    expect(data.logs).toHaveLength(1);
    expect(prisma.systemLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
      })
    );
  });

  it('GET /api/system/logs should support advanced triage filters', async () => {
    vi.mocked(prisma.systemLog.count).mockResolvedValue(0);
    vi.mocked(prisma.systemLog.findMany).mockResolvedValue([]);

    const req = new NextRequest(
      'http://localhost/api/system/logs?requestId=req-1&statusCode=500&method=GET&userId=user-1&fingerprint=fp-123&category=DATABASE'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const call = vi.mocked(prisma.systemLog.findMany).mock.calls[0]?.[0] as Prisma.SystemLogFindManyArgs;
    const where = call?.where;
    expect(where).toBeTruthy();
    expect((where as any).AND).toEqual(
      expect.arrayContaining([
        { statusCode: 500 },
        { method: { equals: 'GET', mode: 'insensitive' } },
        { requestId: { contains: 'req-1', mode: 'insensitive' } },
        { userId: { contains: 'user-1', mode: 'insensitive' } },
        { context: { path: ['fingerprint'], equals: 'fp-123' } },
        {
          OR: [
            { category: { equals: 'DATABASE', mode: 'insensitive' } },
            { context: { path: ['category'], equals: 'DATABASE' } },
          ],
        },
      ])
    );
  });

  it('POST /api/system/logs should create a new log entry', async () => {
    const logData = {
      level: 'info',
      message: 'Test message',
      source: 'test-source',
    };
    vi.mocked(prisma.systemLog.create).mockResolvedValue({
      id: 'new-id',
      ...logData,
      createdAt: new Date(),
    } as unknown as SystemLog);

    const req = new NextRequest('http://localhost/api/system/logs', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.log.message).toBe('Test message');
    expect(prisma.systemLog.create).toHaveBeenCalled();
  });

  it('DELETE /api/system/logs should clear logs', async () => {
    vi.mocked(prisma.systemLog.deleteMany).mockResolvedValue({ count: 5 });

    const req = new NextRequest('http://localhost/api/system/logs', {
      method: 'DELETE',
    });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.deleted).toBe(5);
    expect(prisma.systemLog.deleteMany).toHaveBeenCalled();
  });
});

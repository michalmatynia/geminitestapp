import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/system/logs/route';
import prisma from '@/shared/lib/db/prisma';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

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
    (getAppDbProvider as any).mockResolvedValue('prisma');
  });

  it('GET /api/system/logs should list logs with pagination', async () => {
    (prisma.systemLog.count as any).mockResolvedValue(100);
    (prisma.systemLog.findMany as any).mockResolvedValue([
      { id: '1', level: 'error', message: 'Err 1', createdAt: new Date() },
    ]);

    const req = new NextRequest('http://localhost/api/system/logs?page=1&pageSize=10');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(100);
    expect(data.logs).toHaveLength(1);
    expect(prisma.systemLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 0,
      take: 10,
    }));
  });

  it('POST /api/system/logs should create a new log entry', async () => {
    const logData = {
      level: 'info',
      message: 'Test message',
      source: 'test-source',
    };
    (prisma.systemLog.create as any).mockResolvedValue({
      id: 'new-id',
      ...logData,
      createdAt: new Date(),
    });

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
    (prisma.systemLog.deleteMany as any).mockResolvedValue({ count: 5 });

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

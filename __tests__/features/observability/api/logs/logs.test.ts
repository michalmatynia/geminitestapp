import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemLog, Prisma } from '@prisma/client';

import { GET, POST, DELETE } from '@/app/api/system/logs/route';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import prisma from '@/shared/lib/db/prisma';
import {
  hydrateLogRuntimeContext,
  hydrateSystemLogRecordRuntimeContext,
} from '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context';

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

vi.mock('@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context', () => ({
  hydrateLogRuntimeContext: vi.fn().mockImplementation(async (context) => context),
  hydrateSystemLogRecordRuntimeContext: vi.fn().mockImplementation(async (log) => log),
}));

describe('System Logs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAppDbProvider).mockResolvedValue('prisma');
    vi.mocked(hydrateLogRuntimeContext).mockImplementation(async (context) => context);
    vi.mocked(hydrateSystemLogRecordRuntimeContext).mockImplementation(async (log) => log);
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

  it('GET /api/system/logs should hydrate runtime context for listed logs', async () => {
    vi.mocked(prisma.systemLog.count).mockResolvedValue(1);
    vi.mocked(prisma.systemLog.findMany).mockResolvedValue([
      {
        id: '1',
        level: 'error',
        message: 'Err 1',
        source: 'ai-paths-worker',
        context: { runId: 'run-1' },
        createdAt: new Date('2026-03-02T10:00:00.000Z'),
      } as unknown as SystemLog,
    ]);
    vi.mocked(hydrateSystemLogRecordRuntimeContext).mockResolvedValue({
      id: '1',
      level: 'error',
      message: 'Err 1',
      source: 'ai-paths-worker',
      context: {
        contextRegistry: {
          refs: [
            {
              id: 'runtime:ai-path-run:run-1',
              kind: 'runtime_document',
              providerId: 'ai-path-run',
              entityType: 'ai_path_run',
            },
          ],
          resolved: {
            refs: [
              {
                id: 'runtime:ai-path-run:run-1',
                kind: 'runtime_document',
                providerId: 'ai-path-run',
                entityType: 'ai_path_run',
              },
            ],
            documents: [
              {
                id: 'runtime:ai-path-run:run-1',
                kind: 'runtime_document',
                entityType: 'ai_path_run',
                title: 'Primary Path',
                summary: 'failed run',
                status: 'failed',
                tags: ['ai-paths'],
                relatedNodeIds: ['page:ai-paths'],
              },
            ],
            nodes: [],
            truncated: false,
            engineVersion: 'registry:codefirst:7|providers:ai-path-run@1',
          },
        },
      },
      stack: null,
      path: null,
      method: null,
      statusCode: null,
      requestId: null,
      userId: null,
      createdAt: '2026-03-02T10:00:00.000Z',
      updatedAt: null,
    });

    const req = new NextRequest('http://localhost/api/system/logs?page=1&pageSize=10');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(hydrateSystemLogRecordRuntimeContext).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
      })
    );
    expect(data.logs[0].context).toEqual(
      expect.objectContaining({
        contextRegistry: expect.objectContaining({
          refs: [expect.objectContaining({ id: 'runtime:ai-path-run:run-1' })],
          resolved: expect.objectContaining({
            documents: [expect.objectContaining({ id: 'runtime:ai-path-run:run-1' })],
          }),
        }),
      })
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

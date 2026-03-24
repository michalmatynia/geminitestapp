import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DELETE_handler } from '@/app/api/system/logs/handler';
import { GET, POST } from '@/app/api/system/logs/route';
import {
  hydrateLogRuntimeContext,
  hydrateSystemLogRecordRuntimeContext,
} from '@/features/observability/entry-server';
import {
  clearSystemLogs,
  createSystemLog,
  listSystemLogs,
} from '@/shared/lib/observability/system-log-repository';

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

vi.mock('@/shared/lib/observability/system-log-repository', () => ({
  createSystemLog: vi.fn(),
  listSystemLogs: vi.fn(),
  clearSystemLogs: vi.fn(),
}));

vi.mock('@/features/observability/entry-server', () => ({
  hydrateLogRuntimeContext: vi.fn().mockImplementation(async (context) => context),
  hydrateSystemLogRecordRuntimeContext: vi.fn().mockImplementation(async (log) => log),
}));

describe('System Logs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hydrateLogRuntimeContext).mockImplementation(async (context) => context);
    vi.mocked(hydrateSystemLogRecordRuntimeContext).mockImplementation(async (log) => log);
  });

  it('GET /api/system/logs should list logs with pagination', async () => {
    vi.mocked(listSystemLogs).mockResolvedValue({
      logs: [{ id: '1', level: 'error', message: 'Err 1', createdAt: new Date().toISOString() }],
      total: 100,
      page: 1,
      pageSize: 10,
    });

    const req = new NextRequest('http://localhost/api/system/logs?page=1&pageSize=10');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(100);
    expect(data.logs).toHaveLength(1);
    expect(listSystemLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 10,
      })
    );
  });

  it('GET /api/system/logs should support advanced triage filters', async () => {
    vi.mocked(listSystemLogs).mockResolvedValue({
      logs: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });

    const req = new NextRequest(
      'http://localhost/api/system/logs?requestId=req-1&statusCode=500&method=GET&userId=user-1&fingerprint=fp-123&category=DATABASE'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(listSystemLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-1',
        statusCode: 500,
        method: 'GET',
        userId: 'user-1',
        fingerprint: 'fp-123',
        category: 'DATABASE',
      })
    );
  });

  it('GET /api/system/logs should hydrate runtime context for listed logs', async () => {
    vi.mocked(listSystemLogs).mockResolvedValue({
      logs: [
        {
          id: '1',
          level: 'error',
          message: 'Err 1',
          source: 'ai-paths-worker',
          context: { runId: 'run-1' },
          createdAt: '2026-03-02T10:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
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
    vi.mocked(createSystemLog).mockResolvedValue({
      id: 'new-id',
      ...logData,
      createdAt: new Date().toISOString(),
    });

    const req = new NextRequest('http://localhost/api/system/logs', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.log.message).toBe('Test message');
    expect(createSystemLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Test message',
        source: 'test-source',
      })
    );
  });

  it('DELETE /api/system/logs should clear the selected log target', async () => {
    vi.mocked(clearSystemLogs).mockResolvedValue({ deleted: 5 });

    const req = new NextRequest('http://localhost/api/system/logs?target=error_logs', {
      method: 'DELETE',
    });
    const res = await DELETE_handler(req, {
      requestId: 'test-request-id',
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.target).toBe('error_logs');
    expect(data.deleted).toBe(5);
    expect(clearSystemLogs).toHaveBeenCalledWith({
      before: null,
      level: 'error',
    });
  });
});

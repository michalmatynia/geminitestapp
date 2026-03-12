import { NextRequest } from 'next/server';

vi.mock('@/features/ai/server', () => ({
  startAgentQueue: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/audit', () => ({
  logAgentAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  getBrainAssignmentForFeature: vi.fn().mockResolvedValue({ enabled: true }),
}));

vi.mock('@/shared/lib/api/api-handler', async () => {
  const { NextResponse } = await import('next/server');

  return {
    apiHandler:
      (
        handler: (req: NextRequest, ctx: { getElapsedMs: () => number }) => Promise<Response>
      ) =>
      async (req: NextRequest): Promise<Response> => {
        try {
          return await handler(req, {
            getElapsedMs: () => 0,
          });
        } catch (error) {
          const status =
            typeof error === 'object' &&
            error !== null &&
            'httpStatus' in error &&
            typeof error.httpStatus === 'number'
              ? error.httpStatus
              : 500;

          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status }
          );
        }
      },
    apiHandlerWithParams:
      <TParams extends Record<string, string>>(
        handler: (
          req: NextRequest,
          ctx: { getElapsedMs: () => number },
          params: TParams
        ) => Promise<Response>
      ) =>
      async (
        req: NextRequest,
        routeContext?: { params?: Promise<TParams> }
      ): Promise<Response> => {
        try {
          return await handler(
            req,
            {
              getElapsedMs: () => 0,
            },
            (routeContext?.params ? await routeContext.params : ({} as TParams))
          );
        } catch (error) {
          const status =
            typeof error === 'object' &&
            error !== null &&
            'httpStatus' in error &&
            typeof error.httpStatus === 'number'
              ? error.httpStatus
              : 500;

          return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status }
          );
        }
      },
  };
});

import { GET as getAgentAction } from '@/app/api/chatbot/agent/[runId]/[action]/route';
import { GET as listRuns, POST as createRun } from '@/app/api/chatbot/agent/route';
import legacySqlClient from '@/shared/lib/db/legacy-sql-client';

type ChatbotAgentRun = { id: string };
type AgentBrowserLog = { message: string };
type AgentAuditLog = { metadata?: unknown };

describe('Agent API', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    await legacySqlClient.agentBrowserLog.deleteMany({});
    await legacySqlClient.agentBrowserSnapshot.deleteMany({});
    await legacySqlClient.agentAuditLog.deleteMany({});
    await legacySqlClient.agentMemoryItem.deleteMany({});
    await legacySqlClient.chatbotAgentRun.deleteMany({});
  });

  afterAll(async () => {
    await legacySqlClient.$disconnect();
  });

  it('should reject missing prompt when creating a run', async () => {
    const req = new NextRequest('http://localhost/api/agentcreator/agent', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'x-csrf-token': 'test-token',
        Cookie: '__Host-next-auth.csrf-token=test-token',
        'Content-Type': 'application/json',
      },
    });

    const res = await createRun(req);
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(data.error).toBe('Prompt is required.');
  });

  it('should list agent runs with counts', async () => {
    const run = await legacySqlClient.chatbotAgentRun.create({
      data: {
        prompt: 'Browse example.com',
        tools: ['agent-mode'],
      },
    });
    await legacySqlClient.agentBrowserLog.create({
      data: {
        runId: run.id,
        level: 'info',
        message: 'Stub log',
      },
    });
    await legacySqlClient.agentBrowserSnapshot.create({
      data: {
        runId: run.id,
        url: 'about:blank',
        title: 'Stub',
        domHtml: '<html></html>',
        domText: 'stub',
      },
    });

    vi.mocked(legacySqlClient.chatbotAgentRun.findMany).mockResolvedValueOnce([
      {
        ...run,
        _count: {
          browserLogs: 1,
          browserSnapshots: 1,
        },
      } as any,
    ]);

    const res = await listRuns(new NextRequest('http://localhost/api/agentcreator/agent'));
    const data = (await res.json()) as {
      runs: (ChatbotAgentRun & {
        _count: { browserLogs: number; browserSnapshots: number };
      })[];
    };

    expect(res.status).toBe(200);
    expect(data.runs).toHaveLength(1);
    expect(data.runs[0]!._count.browserLogs).toBe(1);
    expect(data.runs[0]!._count.browserSnapshots).toBe(1);
  });

  it('should return agent logs for a run', async () => {
    const run = await legacySqlClient.chatbotAgentRun.create({
      data: { prompt: 'Logs test', tools: ['agent-mode'] },
    });
    const logData = {
      runId: run.id,
      level: 'info',
      message: 'Log entry',
    };
    const log = await legacySqlClient.agentBrowserLog.create({
      data: logData,
    });

    vi.mocked(legacySqlClient.agentBrowserLog.findMany).mockResolvedValueOnce([log]);

    const res = await getAgentAction(new NextRequest('http://localhost'), {
      params: Promise.resolve({ runId: run.id, action: 'logs' }),
    });
    const data = (await res.json()) as { logs: AgentBrowserLog[] };

    expect(res.status).toBe(200);
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0]!.message).toBe('Log entry');
  });

  it('should return agent audit logs for a run', async () => {
    const run = await legacySqlClient.chatbotAgentRun.create({
      data: { prompt: 'Audit test', tools: ['agent-mode'] },
    });
    const auditData = {
      runId: run.id,
      level: 'info' as const,
      message: 'Audit entry',
      metadata: { step: 'tool' },
    };
    const audit = await legacySqlClient.agentAuditLog.create({
      data: auditData,
    });

    vi.mocked(legacySqlClient.agentAuditLog.findMany).mockResolvedValueOnce([audit]);

    const res = await getAgentAction(new NextRequest('http://localhost'), {
      params: Promise.resolve({ runId: run.id, action: 'audits' }),
    });
    const data = (await res.json()) as { audits: AgentAuditLog[] };

    expect(res.status).toBe(200);
    expect(data.audits).toHaveLength(1);
    expect(data.audits[0]!.metadata).toBeDefined();
    expect((data.audits[0]!.metadata as { step: string }).step).toBe('tool');
  });
});

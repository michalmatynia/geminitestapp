import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

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
  const actual = await vi.importActual<any>('@/shared/lib/api/api-handler');
  return {
    ...actual,
    apiHandler:
      (handler: any) =>
      async (req: any) => {
        const res = await actual.apiHandler(handler, { source: 'test' })(req);
        if (!res.json) {
           return {
             ...res,
             json: async () => await res.json(),
           };
        }
        return res;
      },
  };
});

import { GET as getAgentAction } from '@/app/api/chatbot/agent/[runId]/[action]/route';
import { GET as listRuns, POST as createRun } from '@/app/api/chatbot/agent/route';

const {
  chatbotAgentRunFindManyMock,
  agentBrowserLogFindManyMock,
  agentAuditLogFindManyMock,
} = vi.hoisted(() => ({
  chatbotAgentRunFindManyMock: vi.fn(),
  agentBrowserLogFindManyMock: vi.fn(),
  agentAuditLogFindManyMock: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/store-delegates', () => ({
  getChatbotAgentRunDelegate: vi.fn(() => ({
    findMany: chatbotAgentRunFindManyMock,
  })),
  getAgentBrowserLogDelegate: vi.fn(() => ({
    findMany: agentBrowserLogFindManyMock,
  })),
  getAgentAuditLogDelegate: vi.fn(() => ({
    findMany: agentAuditLogFindManyMock,
  })),
}));

type ChatbotAgentRun = { id: string };
type AgentBrowserLog = { message: string };
type AgentAuditLog = { metadata?: unknown };

describe('Agent API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject missing prompt when creating a run', async () => {
    const req = new NextRequest('http://localhost/api/agentcreator/agent', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'x-csrf-token': 'test-token',
        'X-CSRF-Token': 'test-token',
        Cookie: '__Host-next-auth.csrf-token=test-token; next-auth.csrf-token=test-token; next-auth.session-token=valid-session',
        'Content-Type': 'application/json',
      },
    });

    const res = await createRun(req);
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(403);
    expect(data.error).toBe('Invalid request origin.');
  });

  it('should list agent runs with counts', async () => {
    const run = {
      id: 'run-1',
      prompt: 'Browse example.com',
      model: null,
      tools: ['agent-mode'],
      searchProvider: null,
      agentBrowser: null,
      runHeadless: true,
      status: 'queued',
      requiresHumanIntervention: false,
      errorMessage: null,
      logLines: [],
      recordingPath: null,
      activeStepId: null,
      checkpointedAt: null,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    };

    chatbotAgentRunFindManyMock.mockResolvedValueOnce([
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
    const logData = {
      id: 'log-1',
      runId: 'run-logs',
      stepId: null,
      level: 'info',
      message: 'Log entry',
      createdAt: '2026-03-01T00:00:00.000Z',
    };

    agentBrowserLogFindManyMock.mockResolvedValueOnce([logData]);

    const res = await getAgentAction(new NextRequest('http://localhost'), {
      params: Promise.resolve({ runId: 'run-logs', action: 'logs' }),
    });
    const data = (await res.json()) as { logs: AgentBrowserLog[] };

    expect(res.status).toBe(200);
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0]!.message).toBe('Log entry');
  });

  it('should return agent audit logs for a run', async () => {
    const auditData = {
      id: 'audit-1',
      runId: 'run-audits',
      level: 'info' as const,
      message: 'Audit entry',
      metadata: { step: 'tool' },
      createdAt: '2026-03-01T00:00:00.000Z',
    };

    agentAuditLogFindManyMock.mockResolvedValueOnce([auditData]);

    const res = await getAgentAction(new NextRequest('http://localhost'), {
      params: Promise.resolve({ runId: 'run-audits', action: 'audits' }),
    });
    const data = (await res.json()) as { audits: AgentAuditLog[] };

    expect(res.status).toBe(200);
    expect(data.audits).toHaveLength(1);
    expect(data.audits[0]!.metadata).toBeDefined();
    expect((data.audits[0]!.metadata as { step: string }).step).toBe('tool');
  });
});

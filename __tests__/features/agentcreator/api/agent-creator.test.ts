import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { chatbotAgentRunMock } = vi.hoisted(() => ({
  chatbotAgentRunMock: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

import { GET, POST, DELETE } from '@/app/api/agentcreator/agent/route';
import { startAgentQueue } from '@/features/ai/agent-runtime/workers/agentQueue';

vi.mock('@/features/ai/agent-runtime/store-delegates', () => ({
  getChatbotAgentRunDelegate: vi.fn(() => chatbotAgentRunMock),
}));

vi.mock('@/features/ai/agent-runtime/workers/agentQueue', () => ({
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
  };
});

describe('Agent Creator API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns list of agent runs', async () => {
      const createdAt = new Date('2026-03-10T10:00:00.000Z');
      const updatedAt = new Date('2026-03-10T10:05:00.000Z');
      const checkpointedAt = new Date('2026-03-10T10:03:00.000Z');
      const mockRuns = [
        {
          id: 'run-1',
          prompt: 'test',
          model: 'gpt-4',
          tools: ['browser'],
          searchProvider: 'default',
          agentBrowser: 'playwright',
          runHeadless: true,
          status: 'queued',
          requiresHumanIntervention: false,
          errorMessage: null,
          logLines: ['[2026-03-10T10:00:00.000Z] Run queued.'],
          recordingPath: null,
          activeStepId: null,
          checkpointedAt,
          createdAt,
          updatedAt,
          _count: {
            browserSnapshots: 0,
            browserLogs: 0,
          },
        },
      ];
      vi.mocked(chatbotAgentRunMock.findMany).mockResolvedValue(mockRuns as any);

      const req = new NextRequest('http://localhost/api/agentcreator/agent');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.runs).toEqual([
        {
          ...mockRuns[0],
          checkpointedAt: checkpointedAt.toISOString(),
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      ]);
      expect(startAgentQueue).toHaveBeenCalled();
    });

    it('returns 500 if the agent run delegate throws', async () => {
      vi.mocked(chatbotAgentRunMock.findMany).mockImplementationOnce(() => {
        throw new Error('Agent run storage is unavailable.');
      });

      const req = new NextRequest('http://localhost/api/agentcreator/agent');
      const res = await GET(req);
      expect(res.status).toBe(500);
      expect(chatbotAgentRunMock.findMany).toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('creates a new agent run', async () => {
      vi.mocked(chatbotAgentRunMock.create).mockResolvedValue({
        id: 'new-run',
        status: 'queued',
      } as any);

      const req = new NextRequest('http://localhost/api/agentcreator/agent', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Verify the price of item X',
          model: 'gpt-4',
          tools: ['browser'],
          planSettings: { maxSteps: 5 },
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.runId).toBe('new-run');
      expect(chatbotAgentRunMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            prompt: 'Verify the price of item X',
            planState: expect.objectContaining({
              settings: expect.objectContaining({
                maxSteps: 5,
              }),
            }),
          }),
        })
      );
    });

    it('returns 400 if prompt is missing', async () => {
      const req = new NextRequest('http://localhost/api/agentcreator/agent', {
        method: 'POST',
        body: JSON.stringify({ prompt: '' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE', () => {
    it('deletes terminal runs', async () => {
      vi.mocked(chatbotAgentRunMock.findMany).mockResolvedValue([{ id: 'run-1' }] as any);
      vi.mocked(chatbotAgentRunMock.deleteMany).mockResolvedValue({ count: 1 } as any);

      const req = new NextRequest('http://localhost/api/agentcreator/agent?scope=terminal', {
        method: 'DELETE',
      });

      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.deleted).toBe(1);
    });

    it('returns 400 for unsupported scope', async () => {
      const req = new NextRequest('http://localhost/api/agentcreator/agent?scope=all', {
        method: 'DELETE',
      });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });
  });
});

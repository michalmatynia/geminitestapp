import { beforeEach, describe, expect, it, vi } from 'vitest';

import { brainOperationsOverviewResponseSchema } from '@/shared/contracts/ai-brain';

const {
  getAiPathRunQueueStatusMock,
  chatbotFindAllMock,
  listImageStudioRunsMock,
  agentFindManyMock,
} = vi.hoisted(() => ({
  getAiPathRunQueueStatusMock: vi.fn(),
  chatbotFindAllMock: vi.fn(),
  listImageStudioRunsMock: vi.fn(),
  agentFindManyMock: vi.fn(),
}));

vi.mock('@/features/jobs/server', () => ({
  getAiPathRunQueueStatus: getAiPathRunQueueStatusMock,
}));

vi.mock('@/features/ai/chatbot/services/chatbot-job-repository', () => ({
  chatbotJobRepository: {
    findAll: chatbotFindAllMock,
  },
}));

vi.mock('@/features/ai/image-studio/server/run-repository', () => ({
  listImageStudioRuns: listImageStudioRunsMock,
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    chatbotAgentRun: {
      findMany: agentFindManyMock,
    },
  },
}));

import { GET_handler } from './handler';

describe('brain operations overview handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getAiPathRunQueueStatusMock.mockResolvedValue({
      queuedCount: 2,
      activeRuns: 1,
      queueLagMs: 4500,
      throughputPerMinute: 3,
      lastPollTime: Date.now(),
      brainAnalytics24h: {
        totalReports: 14,
        errorReports: 2,
        analyticsReports: 7,
        logReports: 7,
        warningReports: 3,
      },
      slo: {
        overall: 'ok',
        breaches: [],
      },
    });

    chatbotFindAllMock.mockResolvedValue([
      {
        id: 'job-1',
        sessionId: 'session-1',
        status: 'completed',
        model: 'gpt-4o-mini',
        payload: {},
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: null,
      },
      {
        id: 'job-2',
        sessionId: 'session-1',
        status: 'failed',
        model: 'gpt-4o-mini',
        payload: {},
        createdAt: '2026-03-01T00:01:00.000Z',
        updatedAt: null,
      },
    ]);

    listImageStudioRunsMock.mockResolvedValue({
      runs: [
        {
          id: 'run-1',
          status: 'completed',
          updatedAt: '2026-03-01T00:03:00.000Z',
          createdAt: '2026-03-01T00:03:00.000Z',
        },
        {
          id: 'run-2',
          status: 'failed',
          updatedAt: '2026-03-01T00:02:00.000Z',
          createdAt: '2026-03-01T00:02:00.000Z',
        },
      ],
      total: 2,
    });

    agentFindManyMock.mockResolvedValue([
      {
        id: 'agent-run-1',
        status: 'running',
        updatedAt: new Date('2026-03-01T00:04:00.000Z'),
      },
      {
        id: 'agent-run-2',
        status: 'failed',
        updatedAt: new Date('2026-03-01T00:03:00.000Z'),
      },
    ]);
  });

  it('returns a payload that matches the operations overview contract', async () => {
    const response = await GET_handler(
      new Request('http://localhost/api/brain/operations/overview') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = await response.json();

    const parsed = brainOperationsOverviewResponseSchema.parse(payload);
    expect(parsed.range).toBe('1h');
    expect(parsed.domains.ai_paths.state).toBe('healthy');
    expect(parsed.domains.chatbot.sampleSize).toBe(2);
    expect(parsed.domains.agent_runtime.sampleSize).toBe(2);
    expect(parsed.domains.image_studio.sampleSize).toBe(2);
    expect(parsed.domains.chatbot.recentEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('returns partial success with unknown domain when one collector fails', async () => {
    chatbotFindAllMock.mockRejectedValue(new Error('chatbot collector failed'));

    const response = await GET_handler(
      new Request('http://localhost/api/brain/operations/overview') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      domains: {
        chatbot: {
          state: string;
          message?: string;
        };
        ai_paths: {
          state: string;
        };
      };
    };

    expect(payload.domains.chatbot.state).toBe('unknown');
    expect(payload.domains.chatbot.message).toContain('chatbot collector failed');
    expect(payload.domains.ai_paths.state).toBe('healthy');
  });

  it('maps AI Paths SLO warning and critical levels to domain state', async () => {
    getAiPathRunQueueStatusMock.mockResolvedValueOnce({
      queuedCount: 2,
      activeRuns: 1,
      queueLagMs: 4500,
      throughputPerMinute: 3,
      lastPollTime: Date.now(),
      brainAnalytics24h: {
        totalReports: 14,
        errorReports: 2,
        analyticsReports: 7,
        logReports: 7,
        warningReports: 3,
      },
      slo: {
        overall: 'warning',
        breaches: [{ message: 'Lag elevated' }],
      },
    });

    const warningResponse = await GET_handler(
      new Request('http://localhost/api/brain/operations/overview') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );
    const warningPayload = (await warningResponse.json()) as {
      domains: { ai_paths: { state: string } };
    };
    expect(warningPayload.domains.ai_paths.state).toBe('warning');

    getAiPathRunQueueStatusMock.mockResolvedValueOnce({
      queuedCount: 2,
      activeRuns: 1,
      queueLagMs: 4500,
      throughputPerMinute: 3,
      lastPollTime: Date.now(),
      brainAnalytics24h: {
        totalReports: 14,
        errorReports: 2,
        analyticsReports: 7,
        logReports: 7,
        warningReports: 3,
      },
      slo: {
        overall: 'critical',
        breaches: [{ message: 'Worker stopped' }],
      },
    });

    const criticalResponse = await GET_handler(
      new Request('http://localhost/api/brain/operations/overview') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );
    const criticalPayload = (await criticalResponse.json()) as {
      domains: { ai_paths: { state: string } };
    };
    expect(criticalPayload.domains.ai_paths.state).toBe('critical');
  });

  it('uses requested range to compute trend windows', async () => {
    const now = Date.now();
    const inCurrentWindow = new Date(now - 5 * 60 * 1000).toISOString();
    const inPreviousWindow = new Date(now - 20 * 60 * 1000).toISOString();

    chatbotFindAllMock.mockResolvedValue([
      {
        id: 'job-current',
        sessionId: 'session-1',
        status: 'failed',
        model: 'gpt-4o-mini',
        payload: {},
        createdAt: inCurrentWindow,
        updatedAt: null,
      },
      {
        id: 'job-previous',
        sessionId: 'session-1',
        status: 'failed',
        model: 'gpt-4o-mini',
        payload: {},
        createdAt: inPreviousWindow,
        updatedAt: null,
      },
    ]);

    const response = await GET_handler(
      new Request('http://localhost/api/brain/operations/overview?range=15m') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      range: string;
      domains: {
        chatbot: {
          trend?: {
            current?: number;
            previous?: number;
          };
        };
      };
    };

    expect(payload.range).toBe('15m');
    expect(payload.domains.chatbot.trend?.current).toBe(1);
    expect(payload.domains.chatbot.trend?.previous).toBe(1);
  });
});

import { NextRequest } from 'next/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const requireAiPathsAccessMock = vi.hoisted(() => vi.fn());
const getRuntimeAnalyticsSummaryMock = vi.hoisted(() => vi.fn());
const resolveRuntimeAnalyticsRangeWindowMock = vi.hoisted(() => vi.fn());
const startAiPathRunQueueMock = vi.hoisted(() => vi.fn());
const startAiInsightsQueueMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  getRuntimeAnalyticsSummary: getRuntimeAnalyticsSummaryMock,
  resolveRuntimeAnalyticsRangeWindow: resolveRuntimeAnalyticsRangeWindowMock,
}));

vi.mock('@/features/jobs/server', () => ({
  startAiPathRunQueue: startAiPathRunQueueMock,
  startAiInsightsQueue: startAiInsightsQueueMock,
}));

import { GET_handler } from '@/app/api/ai-paths/runtime-analytics/summary/handler';
import { authError } from '@/shared/errors/app-error';

describe('AI Paths runtime analytics summary handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveRuntimeAnalyticsRangeWindowMock.mockReturnValue({
      from: new Date('2026-02-20T00:00:00.000Z'),
      to: new Date('2026-02-20T23:59:59.999Z'),
    });
  });

  it('returns disabled fallback summary with trace analytics when access is unauthorized', async () => {
    requireAiPathsAccessMock.mockRejectedValue(authError());

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runtime-analytics/summary?range=24h'),
      {} as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.storage).toBe('disabled');
    expect(body.summary.traces).toEqual({
      source: 'none',
      sampledRuns: 0,
      sampledSpans: 0,
      completedSpans: 0,
      failedSpans: 0,
      cachedSpans: 0,
      avgDurationMs: null,
      p95DurationMs: null,
      slowestSpan: null,
      topSlowNodes: [],
      topFailedNodes: [],
      truncated: false,
    });
    expect(getRuntimeAnalyticsSummaryMock).not.toHaveBeenCalled();
    expect(startAiPathRunQueueMock).not.toHaveBeenCalled();
  });

  it('returns runtime analytics summary payload with traces when authorized', async () => {
    requireAiPathsAccessMock.mockResolvedValue(undefined);
    getRuntimeAnalyticsSummaryMock.mockResolvedValue({
      from: '2026-02-20T00:00:00.000Z',
      to: '2026-02-20T23:59:59.999Z',
      range: '24h',
      storage: 'redis',
      runs: {
        total: 10,
        queued: 1,
        started: 9,
        completed: 8,
        failed: 1,
        canceled: 0,
        deadLettered: 0,
        successRate: 88.9,
        failureRate: 11.1,
        deadLetterRate: 0,
        avgDurationMs: 1200,
        p95DurationMs: 2400,
      },
      nodes: {
        started: 40,
        completed: 38,
        failed: 2,
        queued: 0,
        running: 0,
        polling: 0,
        cached: 4,
        waitingCallback: 0,
      },
      brain: {
        analyticsReports: 3,
        logReports: 2,
        totalReports: 5,
        warningReports: 1,
        errorReports: 0,
      },
      traces: {
        source: 'db_sample',
        sampledRuns: 10,
        sampledSpans: 42,
        completedSpans: 36,
        failedSpans: 2,
        cachedSpans: 4,
        avgDurationMs: 430,
        p95DurationMs: 980,
        slowestSpan: {
          runId: 'run-1',
          spanId: 'node-1:1:0',
          nodeId: 'node-1',
          nodeType: 'model',
          status: 'completed',
          durationMs: 1800,
        },
        topSlowNodes: [
          {
            nodeId: 'node-1',
            nodeType: 'model',
            spanCount: 4,
            avgDurationMs: 700,
            maxDurationMs: 1800,
            totalDurationMs: 2800,
          },
        ],
        topFailedNodes: [
          {
            nodeId: 'node-2',
            nodeType: 'http',
            failedCount: 2,
            spanCount: 5,
          },
        ],
        truncated: false,
      },
      generatedAt: '2026-02-20T23:59:59.999Z',
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runtime-analytics/summary?range=24h'),
      {} as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(startAiPathRunQueueMock).toHaveBeenCalled();
    expect(startAiInsightsQueueMock).toHaveBeenCalled();
    expect(getRuntimeAnalyticsSummaryMock).toHaveBeenCalledWith({
      from: new Date('2026-02-20T00:00:00.000Z'),
      to: new Date('2026-02-20T23:59:59.999Z'),
      range: '24h',
    });
    expect(body.summary.traces.sampledSpans).toBe(42);
    expect(body.summary.traces.slowestSpan.nodeType).toBe('model');
  });
});

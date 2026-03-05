import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getRuntimeAnalyticsSummaryMock,
  requireAiPathsAccessMock,
  resolveRuntimeAnalyticsRangeWindowMock,
  startAiInsightsQueueMock,
  startAiPathRunQueueMock,
} = vi.hoisted(() => ({
  getRuntimeAnalyticsSummaryMock: vi.fn(),
  requireAiPathsAccessMock: vi.fn(),
  resolveRuntimeAnalyticsRangeWindowMock: vi.fn(),
  startAiInsightsQueueMock: vi.fn(),
  startAiPathRunQueueMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccess: requireAiPathsAccessMock,
}));

vi.mock('@/features/ai/ai-paths/services/runtime-analytics-service', () => ({
  getRuntimeAnalyticsSummary: getRuntimeAnalyticsSummaryMock,
  resolveRuntimeAnalyticsRangeWindow: resolveRuntimeAnalyticsRangeWindowMock,
}));

vi.mock('@/features/jobs/server', () => ({
  startAiInsightsQueue: startAiInsightsQueueMock,
  startAiPathRunQueue: startAiPathRunQueueMock,
}));

import { authError } from '@/shared/errors/app-error';

import { GET_handler } from './handler';

describe('ai-paths runtime analytics summary handler', () => {
  const from = new Date('2026-03-01T00:00:00.000Z');
  const to = new Date('2026-03-02T00:00:00.000Z');

  beforeEach(() => {
    getRuntimeAnalyticsSummaryMock.mockReset();
    requireAiPathsAccessMock.mockReset();
    resolveRuntimeAnalyticsRangeWindowMock.mockReset().mockReturnValue({ from, to });
    startAiInsightsQueueMock.mockReset();
    startAiPathRunQueueMock.mockReset();
  });

  it('returns disabled fallback summary for unauthorized access and includes portable engine block', async () => {
    requireAiPathsAccessMock.mockRejectedValue(authError('Unauthorized'));

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runtime-analytics/summary?range=24h'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { summary?: Record<string, unknown> };
    expect(payload.summary?.['storage']).toBe('disabled');
    expect(payload.summary?.['portableEngine']).toMatchObject({
      source: 'unavailable',
      totals: {
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
        failureRate: 0,
      },
    });
    expect(startAiPathRunQueueMock).not.toHaveBeenCalled();
    expect(startAiInsightsQueueMock).not.toHaveBeenCalled();
    expect(getRuntimeAnalyticsSummaryMock).not.toHaveBeenCalled();
  });

  it('queries runtime analytics summary for authorized requests', async () => {
    requireAiPathsAccessMock.mockResolvedValue(undefined);
    getRuntimeAnalyticsSummaryMock.mockResolvedValue({
      from: from.toISOString(),
      to: to.toISOString(),
      range: '7d',
      storage: 'redis',
      runs: {
        total: 5,
        queued: 0,
        started: 5,
        completed: 4,
        failed: 1,
        canceled: 0,
        deadLettered: 0,
        successRate: 80,
        failureRate: 20,
        deadLetterRate: 0,
        avgDurationMs: 120,
        p95DurationMs: 220,
      },
      nodes: {
        started: 10,
        completed: 9,
        failed: 1,
        queued: 0,
        running: 0,
        polling: 0,
        cached: 0,
        waitingCallback: 0,
      },
      brain: {
        analyticsReports: 0,
        logReports: 0,
        totalReports: 0,
        warningReports: 0,
        errorReports: 0,
      },
      traces: {
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
        kernelParity: {
          sampledRuns: 0,
          runsWithKernelParity: 0,
          sampledHistoryEntries: 0,
          strategyCounts: {
            legacy_adapter: 0,
            code_object_v3: 0,
            unknown: 0,
          },
          resolutionSourceCounts: {
            override: 0,
            registry: 0,
            missing: 0,
            unknown: 0,
          },
          codeObjectIds: [],
        },
        truncated: false,
      },
      portableEngine: {
        source: 'in_memory',
        totals: {
          attempts: 2,
          successes: 1,
          failures: 1,
          successRate: 50,
          failureRate: 50,
        },
        byRunner: {
          client: { attempts: 1, successes: 1, failures: 0 },
          server: { attempts: 1, successes: 0, failures: 1 },
        },
        bySurface: {
          canvas: { attempts: 1, successes: 1, failures: 0 },
          product: { attempts: 0, successes: 0, failures: 0 },
          api: { attempts: 1, successes: 0, failures: 1 },
        },
        byInputSource: {
          portable_package: { attempts: 0, successes: 0, failures: 0 },
          portable_envelope: { attempts: 0, successes: 0, failures: 0 },
          semantic_canvas: { attempts: 0, successes: 0, failures: 0 },
          path_config: { attempts: 2, successes: 1, failures: 1 },
        },
        failureStageCounts: {
          resolve: 0,
          validation: 0,
          runtime: 1,
        },
        recentFailures: [],
      },
      generatedAt: '2026-03-05T00:00:00.000Z',
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/runtime-analytics/summary?range=7d'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(resolveRuntimeAnalyticsRangeWindowMock).toHaveBeenCalledWith('7d');
    expect(getRuntimeAnalyticsSummaryMock).toHaveBeenCalledWith({
      from,
      to,
      range: '7d',
    });
    expect(startAiPathRunQueueMock).toHaveBeenCalledTimes(1);
    expect(startAiInsightsQueueMock).toHaveBeenCalledTimes(1);
    const payload = (await response.json()) as { summary?: { range?: string } };
    expect(payload.summary?.range).toBe('7d');
  });

  it('rejects invalid ranges', async () => {
    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/runtime-analytics/summary?range=2h'),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Invalid range.');
  });
});

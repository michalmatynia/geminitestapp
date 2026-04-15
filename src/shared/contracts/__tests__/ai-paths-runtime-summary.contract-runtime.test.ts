import { describe, expect, it } from 'vitest';

import {
  aiPathRuntimeAnalyticsRangeQuerySchema,
  aiPathRuntimeAnalyticsSummaryResponseSchema,
} from '@/shared/contracts/ai-paths';

describe('ai paths runtime analytics summary contract runtime', () => {
  it('parses runtime analytics range query DTOs', () => {
    expect(aiPathRuntimeAnalyticsRangeQuerySchema.parse({ range: '7d' }).range).toBe('7d');
    expect(aiPathRuntimeAnalyticsRangeQuerySchema.parse({})).toEqual({});
  });

  it('parses runtime analytics summary responses', () => {
    const parsed = aiPathRuntimeAnalyticsSummaryResponseSchema.parse({
      summary: {
        from: '2026-03-11T00:00:00.000Z',
        to: '2026-03-11T23:59:59.999Z',
        range: '24h',
        storage: 'redis',
        runs: {
          total: 12,
          queued: 1,
          started: 11,
          completed: 10,
          failed: 1,
          canceled: 0,
          deadLettered: 0,
          successRate: 90.9,
          failureRate: 9.1,
          deadLetterRate: 0,
          avgDurationMs: 420,
          p95DurationMs: 980,
        },
        nodes: {
          started: 48,
          completed: 45,
          failed: 3,
          queued: 0,
          running: 0,
          polling: 0,
          cached: 6,
          waitingCallback: 0,
        },
        brain: {
          analyticsReports: 2,
          logReports: 1,
          totalReports: 3,
          warningReports: 1,
          errorReports: 0,
        },
        traces: {
          source: 'db_sample',
          sampledRuns: 12,
          sampledSpans: 48,
          completedSpans: 45,
          failedSpans: 3,
          cachedSpans: 6,
          avgDurationMs: 380,
          p95DurationMs: 900,
          slowestSpan: {
            runId: 'run-1',
            spanId: 'span-1',
            nodeId: 'node-1',
            nodeType: 'model',
            status: 'completed',
            durationMs: 1200,
          },
          topSlowNodes: [
            {
              nodeId: 'node-1',
              nodeType: 'model',
              spanCount: 4,
              avgDurationMs: 700,
              maxDurationMs: 1200,
              totalDurationMs: 2800,
            },
          ],
          topFailedNodes: [
            {
              nodeId: 'node-2',
              nodeType: 'http',
              failedCount: 2,
              spanCount: 6,
            },
          ],
          kernelParity: {
            sampledRuns: 12,
            runsWithKernelParity: 10,
            sampledHistoryEntries: 20,
            strategyCounts: {
              code_object_v3: 6,
              unknown: 4,
            },
            resolutionSourceCounts: {
              override: 1,
              registry: 9,
              missing: 0,
              unknown: 0,
            },
            codeObjectIds: ['code-object-1'],
          },
          truncated: false,
        },
        generatedAt: '2026-03-11T23:59:59.999Z',
      },
    });

    expect(parsed.summary.range).toBe('24h');
    expect(parsed.summary.traces.sampledSpans).toBe(48);
  });
});

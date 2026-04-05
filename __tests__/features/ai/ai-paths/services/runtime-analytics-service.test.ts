import { describe, expect, it } from 'vitest';

import { summarizeRuntimeTraceAnalytics } from '@/features/ai/ai-paths/services/runtime-analytics-service';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

const buildRun = (input: { id: string; nodeSpans?: unknown[] }): AiPathRunRecord =>
  ({
    id: input.id,
    status: 'completed',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    meta: {
      runtimeTrace: {
        profile: {
          nodeSpans: input.nodeSpans ?? [],
        },
      },
    },
  }) as AiPathRunRecord;

const AGGREGATED_TRACE_RUNS = [
  buildRun({
    id: 'run-1',
    nodeSpans: [
      {
        spanId: 'span-1',
        nodeId: 'node-a',
        nodeType: 'model',
        status: 'completed',
        durationMs: 120,
      },
      {
        spanId: 'span-2',
        nodeId: 'node-b',
        nodeType: 'http',
        status: 'failed',
        durationMs: 250,
      },
    ],
  }),
  buildRun({
    id: 'run-2',
    nodeSpans: [
      {
        spanId: 'span-3',
        nodeId: 'node-c',
        nodeType: 'database',
        status: 'cached',
        durationMs: 50,
      },
    ],
  }),
] as const;

const EXPECTED_SLOWEST_SPAN = {
  runId: 'run-1',
  spanId: 'span-2',
  nodeId: 'node-b',
  nodeType: 'http',
  status: 'failed',
  durationMs: 250,
} as const;

const EXPECTED_TOP_SLOW_NODES = [
  {
    nodeId: 'node-b',
    nodeType: 'http',
    spanCount: 1,
    avgDurationMs: 250,
    maxDurationMs: 250,
    totalDurationMs: 250,
  },
  {
    nodeId: 'node-a',
    nodeType: 'model',
    spanCount: 1,
    avgDurationMs: 120,
    maxDurationMs: 120,
    totalDurationMs: 120,
  },
  {
    nodeId: 'node-c',
    nodeType: 'database',
    spanCount: 1,
    avgDurationMs: 50,
    maxDurationMs: 50,
    totalDurationMs: 50,
  },
] as const;

const EXPECTED_TOP_FAILED_NODES = [
  {
    nodeId: 'node-b',
    nodeType: 'http',
    failedCount: 1,
    spanCount: 1,
  },
] as const;

describe('runtime-analytics-service summarizeRuntimeTraceAnalytics', () => {
  it('aggregates span counts, duration percentiles, and slowest span', () => {
    const summary = summarizeRuntimeTraceAnalytics({
      runs: AGGREGATED_TRACE_RUNS,
      total: 5,
    });

    expect(summary.source).toBe('db_sample');
    expect(summary.sampledRuns).toBe(2);
    expect(summary.sampledSpans).toBe(3);
    expect(summary.completedSpans).toBe(1);
    expect(summary.failedSpans).toBe(1);
    expect(summary.cachedSpans).toBe(1);
    expect(summary.avgDurationMs).toBe(140);
    expect(summary.p95DurationMs).toBe(250);
    expect(summary.truncated).toBe(true);
    expect(summary.slowestSpan).toEqual(EXPECTED_SLOWEST_SPAN);
    expect(summary.topSlowNodes).toEqual(EXPECTED_TOP_SLOW_NODES);
    expect(summary.topFailedNodes).toEqual(EXPECTED_TOP_FAILED_NODES);
  });

  it('derives span duration from startedAt/finishedAt when durationMs is missing', () => {
    const summary = summarizeRuntimeTraceAnalytics({
      runs: [
        buildRun({
          id: 'run-derived',
          nodeSpans: [
            {
              spanId: 'span-derived',
              nodeId: 'node-derived',
              nodeType: 'agent',
              status: 'completed',
              startedAt: '2026-02-01T00:00:00.000Z',
              finishedAt: '2026-02-01T00:00:00.125Z',
            },
          ],
        }),
      ],
    });

    expect(summary.sampledSpans).toBe(1);
    expect(summary.avgDurationMs).toBe(125);
    expect(summary.p95DurationMs).toBe(125);
    expect(summary.slowestSpan?.durationMs).toBe(125);
    expect(summary.topSlowNodes).toEqual([
      {
        nodeId: 'node-derived',
        nodeType: 'agent',
        spanCount: 1,
        avgDurationMs: 125,
        maxDurationMs: 125,
        totalDurationMs: 125,
      },
    ]);
    expect(summary.topFailedNodes).toEqual([]);
  });
});

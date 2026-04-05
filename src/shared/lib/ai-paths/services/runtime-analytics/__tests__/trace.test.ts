import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getPathRunRepositoryMock, withTimeoutMock, captureExceptionMock, logWarningMock } =
  vi.hoisted(() => ({
    getPathRunRepositoryMock: vi.fn(),
    withTimeoutMock: vi.fn(),
    captureExceptionMock: vi.fn(),
    logWarningMock: vi.fn(),
  }));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: getPathRunRepositoryMock,
}));

vi.mock('../utils', async () => {
  const actual = await vi.importActual<typeof import('../utils')>('../utils');
  return {
    ...actual,
    withTimeout: withTimeoutMock,
  };
});

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

import {
  emptySummary,
  emptyTraceAnalytics,
  extractRuntimeTraceNodeSpans,
  loadRuntimeTraceAnalytics,
  summarizeRuntimeTraceAnalytics,
} from '../trace';

describe('runtime trace analytics', () => {
  beforeEach(() => {
    getPathRunRepositoryMock.mockReset();
    withTimeoutMock.mockReset();
    captureExceptionMock.mockReset();
    logWarningMock.mockReset();
    withTimeoutMock.mockImplementation(async (promise: Promise<unknown>) => await promise);
  });

  it('extracts node spans from direct runtime traces and profile fallbacks', () => {
    expect(
      extractRuntimeTraceNodeSpans({
        meta: {
          runtimeTrace: {
            spans: [{ spanId: 'span-direct' }],
          },
        },
      } as never)
    ).toEqual([{ spanId: 'span-direct' }]);

    expect(
      extractRuntimeTraceNodeSpans({
        meta: {
          runtimeTrace: {
            profile: {
              nodeSpans: [{ spanId: 'span-profile' }],
            },
          },
        },
      } as never)
    ).toEqual([{ spanId: 'span-profile' }]);
  });

  it('summarizes runtime trace spans and kernel parity metadata', () => {
    const summary = summarizeRuntimeTraceAnalytics({
      runs: [
        {
          id: 'run-1',
          meta: {
            runtimeTrace: {
              spans: [
                {
                  spanId: 'span-1',
                  nodeId: 'node-a',
                  nodeType: 'prompt',
                  status: 'completed',
                  durationMs: 120,
                },
                {
                  spanId: 'span-2',
                  nodeId: 'node-b',
                  nodeType: 'llm',
                  status: 'failed',
                  startedAt: '2026-03-22T10:00:00.000Z',
                  finishedAt: '2026-03-22T10:00:00.300Z',
                },
              ],
              kernelParity: {
                sampledHistoryEntries: 2,
                strategyCounts: {
                  compatibility: 1,
                  code_object_v3: 1,
                },
                resolutionSourceCounts: {
                  registry: 1,
                  override: 1,
                },
                codeObjectIds: ['code-1', 'code-2', 'code-1'],
              },
            },
          },
        },
      ] as never,
      total: 3,
    });

    expect(summary).toEqual({
      source: 'db_sample',
      sampledRuns: 1,
      sampledSpans: 2,
      completedSpans: 1,
      failedSpans: 1,
      cachedSpans: 0,
      avgDurationMs: 210,
      p95DurationMs: 300,
      slowestSpan: {
        runId: 'run-1',
        spanId: 'span-2',
        nodeId: 'node-b',
        nodeType: 'llm',
        status: 'failed',
        durationMs: 300,
      },
      topSlowNodes: [
        {
          nodeId: 'node-b',
          nodeType: 'llm',
          spanCount: 1,
          avgDurationMs: 300,
          maxDurationMs: 300,
          totalDurationMs: 300,
        },
        {
          nodeId: 'node-a',
          nodeType: 'prompt',
          spanCount: 1,
          avgDurationMs: 120,
          maxDurationMs: 120,
          totalDurationMs: 120,
        },
      ],
      topFailedNodes: [
        {
          nodeId: 'node-b',
          nodeType: 'llm',
          failedCount: 1,
          spanCount: 1,
        },
      ],
      kernelParity: {
        sampledRuns: 1,
        runsWithKernelParity: 1,
        sampledHistoryEntries: 2,
        strategyCounts: {
          compatibility: 1,
          code_object_v3: 1,
          unknown: 0,
        },
        resolutionSourceCounts: {
          override: 1,
          registry: 1,
          missing: 0,
          unknown: 0,
        },
        codeObjectIds: ['code-1', 'code-2'],
      },
      truncated: true,
    });
  });

  it('counts cached spans without treating them as failures', () => {
    const summary = summarizeRuntimeTraceAnalytics({
      runs: [
        {
          id: 'run-cached',
          meta: {
            runtimeTrace: {
              spans: [
                {
                  spanId: 'span-cached',
                  nodeId: 'node-cache',
                  nodeType: 'fetcher',
                  status: 'cached',
                  durationMs: 15,
                },
              ],
            },
          },
        },
      ] as never,
    });

    expect(summary.cachedSpans).toBe(1);
    expect(summary.failedSpans).toBe(0);
    expect(summary.topFailedNodes).toEqual([]);
  });

  it('loads trace analytics from the repository and falls back to empty traces on errors', async () => {
    getPathRunRepositoryMock.mockResolvedValueOnce({
      listRuns: vi.fn().mockResolvedValue({
        runs: [
          {
            id: 'run-1',
            meta: {
              runtimeTrace: {
                spans: [
                  {
                    spanId: 'span-1',
                    nodeId: 'node-a',
                    nodeType: 'prompt',
                    status: 'completed',
                    durationMs: 120,
                  },
                ],
              },
            },
          },
        ],
        total: 1,
      }),
    });

    const analytics = await loadRuntimeTraceAnalytics({
      from: new Date('2026-03-22T10:00:00.000Z'),
      to: new Date('2026-03-22T11:00:00.000Z'),
    });

    expect(analytics.source).toBe('db_sample');
    expect(analytics.sampledRuns).toBe(1);
    expect(analytics.sampledSpans).toBe(1);

    const error = new Error('repo down');
    getPathRunRepositoryMock.mockRejectedValueOnce(error);
    await expect(
      loadRuntimeTraceAnalytics({
        from: new Date('2026-03-22T10:00:00.000Z'),
        to: new Date('2026-03-22T11:00:00.000Z'),
      })
    ).resolves.toEqual(emptyTraceAnalytics());
    expect(captureExceptionMock).toHaveBeenCalledWith(error);
    expect(logWarningMock).toHaveBeenCalledWith(
      'Failed to load runtime trace analytics sample',
      expect.objectContaining({
        service: 'ai-paths-analytics',
        error,
      })
    );
  });

  it('builds an empty disabled summary shell', () => {
    const summary = emptySummary(
      new Date('2026-03-22T10:00:00.000Z'),
      new Date('2026-03-22T11:00:00.000Z'),
      '24h'
    );

    expect(summary.storage).toBe('disabled');
    expect(summary.runs.total).toBe(0);
    expect(summary.traces).toEqual(emptyTraceAnalytics());
  });
});

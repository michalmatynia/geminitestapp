import { describe, expect, it } from 'vitest';
import {
  buildRunTraceComparison,
  buildRuntimeTimelineItems,
  readRuntimeTraceSummary,
} from '../run-trace-utils';
describe('run-trace-utils', () => {
  it('prefers V1 runtimeTrace.spans over legacy profile.nodeSpans', () => {
    const summary = readRuntimeTraceSummary({
      runtimeTrace: {
        version: 'ai-paths.trace.v1',
        traceId: 'run-1',
        runId: 'run-1',
        source: 'server',
        startedAt: '2026-03-06T10:00:00.000Z',
        finishedAt: '2026-03-06T10:00:02.000Z',
        spans: [
          {
            spanId: 'node-a:1:1',
            runId: 'run-1',
            traceId: 'run-1',
            nodeId: 'node-a',
            nodeType: 'fetcher',
            iteration: 1,
            attempt: 1,
            startedAt: '2026-03-06T10:00:00.000Z',
            finishedAt: '2026-03-06T10:00:01.000Z',
            status: 'completed',
            activationHash: 'activation-hash-1',
            cache: {
              decision: 'seed',
            },
            effect: {
              policy: 'per_activation',
              decision: 'skipped_duplicate',
              sourceSpanId: 'effect-origin:1:1',
            },
          },
        ],
        profile: {
          nodeSpans: [
            {
              spanId: 'legacy-node:1:1',
              nodeId: 'legacy-node',
              nodeType: 'legacy',
              durationMs: 9999,
            },
          ],
          summary: {
            durationMs: 2000,
            iterationCount: 1,
          },
        },
      },
    });

    expect(summary?.nodeSpanCount).toBe(1);
    expect(summary?.spans[0]?.nodeId).toBe('node-a');
    expect(summary?.slowestSpan?.spanId).toBe('node-a:1:1');
    expect(summary?.durationMs).toBe(2000);
    expect(summary?.seededSpanCount).toBe(1);
    expect(summary?.effectReplayCount).toBe(1);
    expect(summary?.spans[0]).toMatchObject({
      cacheDecision: 'seed',
      effectPolicy: 'per_activation',
      effectDecision: 'skipped_duplicate',
      effectSourceSpanId: 'effect-origin:1:1',
      activationHash: 'activation-hash-1',
    });
  });
  it('falls back to legacy profile.nodeSpans when V1 spans are absent', () => {
    const summary = readRuntimeTraceSummary({
      runtimeTrace: {
        traceId: 'run-legacy',
        profile: {
          eventCount: 3,
          sampledEventCount: 2,
          droppedEventCount: 1,
          nodeSpans: [
            {
              spanId: 'legacy-node:1:2',
              nodeId: 'legacy-node',
              nodeType: 'parser',
              iteration: 2,
              attempt: 1,
              durationMs: 150,
              status: 'completed',
            },
          ],
          summary: {
            durationMs: 150,
            iterationCount: 2,
          },
        },
      },
    });

    expect(summary?.traceId).toBe('run-legacy');
    expect(summary?.nodeSpanCount).toBe(1);
    expect(summary?.spans[0]?.nodeType).toBe('parser');
    expect(summary?.profiledEventCount).toBe(2);
    expect(summary?.droppedEventCount).toBe(1);
    expect(summary?.iterationCount).toBe(2);
  });

  it('derives duration from trace timestamps when the profile summary is missing', () => {
    const summary = readRuntimeTraceSummary({
      runtimeTrace: {
        version: 'ai-paths.trace.v1',
        traceId: 'run-2',
        runId: 'run-2',
        source: 'server',
        startedAt: '2026-03-06T10:00:00.000Z',
        finishedAt: '2026-03-06T10:00:05.500Z',
        spans: [],
      },
    });

    expect(summary?.durationMs).toBe(5500);
    expect(summary?.finishedAt).toBe('2026-03-06T10:00:05.500Z');
  });

  it('builds node timeline items from V1 trace spans before falling back to node records', () => {
    const items = buildRuntimeTimelineItems(
      {
        id: 'run-1',
        status: 'completed',
        pathId: 'path-1',
        pathName: 'Path 1',
        createdAt: '2026-03-06T10:00:00.000Z',
        startedAt: '2026-03-06T10:00:01.000Z',
        finishedAt: '2026-03-06T10:00:03.000Z',
        meta: {
          runtimeTrace: {
            version: 'ai-paths.trace.v1',
            traceId: 'run-1',
            runId: 'run-1',
            source: 'server',
            startedAt: '2026-03-06T10:00:01.000Z',
            finishedAt: '2026-03-06T10:00:03.000Z',
            spans: [
              {
                spanId: 'node-a:1:1',
                runId: 'run-1',
                traceId: 'run-1',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                iteration: 1,
                attempt: 1,
                startedAt: '2026-03-06T10:00:01.500Z',
                finishedAt: '2026-03-06T10:00:02.000Z',
                status: 'cached',
                activationHash: 'activation-hash-1',
                cache: {
                  decision: 'seed',
                },
                effect: {
                  policy: 'per_activation',
                  decision: 'skipped_duplicate',
                  sourceSpanId: 'effect-origin:1:1',
                },
              },
            ],
          },
        },
      } as never,
      [
        {
          id: 'row-1',
          runId: 'run-1',
          nodeId: 'node-a',
          nodeType: 'fetcher',
          nodeTitle: 'Fetcher',
          status: 'completed',
          attempt: 1,
          startedAt: '2026-03-06T10:00:09.000Z',
          finishedAt: '2026-03-06T10:00:10.000Z',
          createdAt: '2026-03-06T10:00:09.000Z',
          updatedAt: '2026-03-06T10:00:10.000Z',
        },
      ] as never
    );

    const traceNodeItem = items.find((item) => item.id === 'trace-span-finish-node-a:1:1');
    expect(traceNodeItem?.source).toBe('trace');
    expect(traceNodeItem?.description).toContain('Fetcher');
    expect(traceNodeItem?.details).toEqual(
      expect.arrayContaining([
        'cache=seed',
        'effect=skipped_duplicate',
        'policy=per_activation',
        'sourceSpan=effect-origin:1:1',
        'activation=activation-hash-1',
      ])
    );
  });

  it('builds comparison rows from trace aggregates and highlights regressions', () => {
    const comparison = buildRunTraceComparison(
      {
        id: 'run-a',
        status: 'completed',
        pathId: 'path-1',
        pathName: 'Path 1',
        createdAt: '2026-03-06T10:00:00.000Z',
        startedAt: '2026-03-06T10:00:01.000Z',
        finishedAt: '2026-03-06T10:00:03.000Z',
        runtimeState: {
          history: {
            'node-a': [
              {
                timestamp: '2026-03-06T10:00:01.100Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-a',
                spanId: 'node-a:1:1',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                status: 'completed',
                iteration: 1,
                attempt: 1,
                inputs: {
                  query: 'alpha',
                },
                outputs: {
                  value: 'ok',
                  count: 1,
                },
                inputHash: 'hash-a',
              },
            ],
          },
        },
        meta: {
          runtimeTrace: {
            version: 'ai-paths.trace.v1',
            traceId: 'run-a',
            runId: 'run-a',
            source: 'server',
            startedAt: '2026-03-06T10:00:01.000Z',
            finishedAt: '2026-03-06T10:00:03.000Z',
            spans: [
              {
                spanId: 'node-a:1:1',
                runId: 'run-a',
                traceId: 'run-a',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                iteration: 1,
                attempt: 1,
                startedAt: '2026-03-06T10:00:01.000Z',
                finishedAt: '2026-03-06T10:00:01.100Z',
                status: 'completed',
              },
            ],
          },
        },
      } as never,
      {
        id: 'run-b',
        status: 'failed',
        pathId: 'path-1',
        pathName: 'Path 1',
        createdAt: '2026-03-06T10:05:00.000Z',
        startedAt: '2026-03-06T10:05:01.000Z',
        finishedAt: '2026-03-06T10:05:05.000Z',
        runtimeState: {
          history: {
            'node-a': [
              {
                timestamp: '2026-03-06T10:05:02.000Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-b',
                spanId: 'node-a:1:1',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                status: 'failed',
                iteration: 1,
                attempt: 1,
                inputs: {
                  query: 'beta',
                  mode: 'strict',
                },
                outputs: {
                  value: 'error',
                  reason: 'timeout',
                },
                inputHash: 'hash-b',
              },
            ],
          },
        },
        meta: {
          runtimeTrace: {
            version: 'ai-paths.trace.v1',
            traceId: 'run-b',
            runId: 'run-b',
            source: 'server',
            startedAt: '2026-03-06T10:05:01.000Z',
            finishedAt: '2026-03-06T10:05:05.000Z',
            spans: [
              {
                spanId: 'node-a:1:1',
                runId: 'run-b',
                traceId: 'run-b',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                iteration: 1,
                attempt: 1,
                startedAt: '2026-03-06T10:05:01.000Z',
                finishedAt: '2026-03-06T10:05:02.000Z',
                status: 'failed',
              },
            ],
          },
        },
      } as never
    );

    expect(comparison?.dataSource).toBe('trace');
    expect(comparison?.regressedCount).toBe(1);
    expect(comparison?.durationDeltaMs).toBe(2000);
    expect(comparison?.payloadChangedCount).toBe(1);
    expect(comparison?.rows[0]).toMatchObject({
      nodeId: 'node-a',
      classification: 'regressed',
      leftStatus: 'completed',
      rightStatus: 'failed',
      deltaMs: 900,
      leftHistorySpanId: 'node-a:1:1',
      rightHistorySpanId: 'node-a:1:1',
    });
    expect(comparison?.rows[0]?.inputDiff).toMatchObject({
      added: ['mode'],
      changed: ['query'],
      hasChanges: true,
    });
    expect(comparison?.rows[0]?.outputDiff).toMatchObject({
      added: ['reason'],
      removed: ['count'],
      changed: ['value'],
      hasChanges: true,
    });
    expect(comparison?.rows[0]?.inputDiff?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'mode',
          change: 'added',
          leftLabel: null,
          rightLabel: 'strict',
        }),
        expect.objectContaining({
          key: 'query',
          change: 'changed',
          leftLabel: 'alpha',
          rightLabel: 'beta',
        }),
      ])
    );
    expect(comparison?.rows[0]?.inputDiff?.lines.join('\n')).toContain('~ query: alpha -> beta');
    expect(comparison?.rows[0]?.outputDiff?.lines.join('\n')).toContain('+ reason: timeout');
  });

  it('preserves primitive and array payloads when building comparison diffs', () => {
    const comparison = buildRunTraceComparison(
      {
        id: 'run-a',
        status: 'completed',
        pathId: 'path-1',
        pathName: 'Path 1',
        createdAt: '2026-03-06T11:00:00.000Z',
        startedAt: '2026-03-06T11:00:01.000Z',
        finishedAt: '2026-03-06T11:00:03.000Z',
        runtimeState: {
          history: {
            'node-b': [
              {
                timestamp: '2026-03-06T11:00:01.100Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-a',
                spanId: 'node-b:1:1',
                nodeId: 'node-b',
                nodeType: 'parser',
                nodeTitle: 'Parser',
                status: 'completed',
                iteration: 1,
                attempt: 1,
                inputs: false,
                outputs: ['alpha', 'beta'],
              },
            ],
          },
        },
        meta: {
          runtimeTrace: {
            version: 'ai-paths.trace.v1',
            traceId: 'run-a',
            runId: 'run-a',
            source: 'server',
            startedAt: '2026-03-06T11:00:01.000Z',
            finishedAt: '2026-03-06T11:00:03.000Z',
            spans: [
              {
                spanId: 'node-b:1:1',
                runId: 'run-a',
                traceId: 'run-a',
                nodeId: 'node-b',
                nodeType: 'parser',
                iteration: 1,
                attempt: 1,
                startedAt: '2026-03-06T11:00:01.000Z',
                finishedAt: '2026-03-06T11:00:01.100Z',
                status: 'completed',
              },
            ],
          },
        },
      } as never,
      {
        id: 'run-b',
        status: 'completed',
        pathId: 'path-1',
        pathName: 'Path 1',
        createdAt: '2026-03-06T11:05:00.000Z',
        startedAt: '2026-03-06T11:05:01.000Z',
        finishedAt: '2026-03-06T11:05:03.000Z',
        runtimeState: {
          history: {
            'node-b': [
              {
                timestamp: '2026-03-06T11:05:01.100Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-b',
                spanId: 'node-b:1:1',
                nodeId: 'node-b',
                nodeType: 'parser',
                nodeTitle: 'Parser',
                status: 'completed',
                iteration: 1,
                attempt: 1,
                inputs: true,
                outputs: ['alpha', 'gamma'],
              },
            ],
          },
        },
        meta: {
          runtimeTrace: {
            version: 'ai-paths.trace.v1',
            traceId: 'run-b',
            runId: 'run-b',
            source: 'server',
            startedAt: '2026-03-06T11:05:01.000Z',
            finishedAt: '2026-03-06T11:05:03.000Z',
            spans: [
              {
                spanId: 'node-b:1:1',
                runId: 'run-b',
                traceId: 'run-b',
                nodeId: 'node-b',
                nodeType: 'parser',
                iteration: 1,
                attempt: 1,
                startedAt: '2026-03-06T11:05:01.000Z',
                finishedAt: '2026-03-06T11:05:01.300Z',
                status: 'completed',
              },
            ],
          },
        },
      } as never
    );

    expect(comparison?.rows[0]?.leftInputs).toBe(false);
    expect(comparison?.rows[0]?.rightInputs).toBe(true);
    expect(comparison?.rows[0]?.leftOutputs).toEqual(['alpha', 'beta']);
    expect(comparison?.rows[0]?.rightOutputs).toEqual(['alpha', 'gamma']);
    expect(comparison?.rows[0]?.inputDiff?.entries).toEqual([
      {
        key: 'payload',
        change: 'changed',
        leftLabel: 'false',
        rightLabel: 'true',
      },
    ]);
    expect(comparison?.rows[0]?.outputDiff?.lines.join('\n')).toContain('~ payload:');
  });

  it('summarizes payload and duration changes between runs', () => {
    const comparison = buildRunTraceComparison(
      {
        id: 'run-left',
        status: 'completed',
        pathId: 'path-1',
        pathName: 'Path 1',
        createdAt: '2026-03-06T12:00:00.000Z',
        startedAt: '2026-03-06T12:00:01.000Z',
        finishedAt: '2026-03-06T12:00:03.000Z',
        runtimeState: {
          history: {
            'node-a': [
              {
                timestamp: '2026-03-06T12:00:01.100Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-left',
                spanId: 'node-a:1:1',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                status: 'cached',
                iteration: 1,
                attempt: 1,
                inputs: {},
                outputs: { value: 'cached' },
                inputHash: 'hash-a',
              },
            ],
            'node-b': [
              {
                timestamp: '2026-03-06T12:00:01.300Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-left',
                spanId: 'node-b:1:1',
                nodeId: 'node-b',
                nodeType: 'parser',
                nodeTitle: 'Parser',
                status: 'completed',
                iteration: 1,
                attempt: 1,
                inputs: {},
                outputs: { value: 'parsed' },
                inputHash: 'hash-b',
              },
            ],
          },
        },
        meta: {
          runtimeTrace: {
            version: 'ai-paths.trace.v1',
            traceId: 'run-left',
            runId: 'run-left',
            source: 'server',
            startedAt: '2026-03-06T12:00:01.000Z',
            finishedAt: '2026-03-06T12:00:03.000Z',
            spans: [
              {
                spanId: 'node-a:1:1',
                runId: 'run-left',
                traceId: 'run-left',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                iteration: 1,
                attempt: 1,
                startedAt: '2026-03-06T12:00:01.000Z',
                finishedAt: '2026-03-06T12:00:01.100Z',
                status: 'cached',
              },
              {
                spanId: 'node-b:1:1',
                runId: 'run-left',
                traceId: 'run-left',
                nodeId: 'node-b',
                nodeType: 'parser',
                nodeTitle: 'Parser',
                iteration: 1,
                attempt: 1,
                startedAt: '2026-03-06T12:00:01.200Z',
                finishedAt: '2026-03-06T12:00:01.300Z',
                status: 'completed',
              },
            ],
          },
        },
      } as never,
      {
        id: 'run-right',
        status: 'completed',
        pathId: 'path-1',
        pathName: 'Path 1',
        createdAt: '2026-03-06T12:05:00.000Z',
        startedAt: '2026-03-06T12:05:01.000Z',
        finishedAt: '2026-03-06T12:05:04.000Z',
        runtimeState: {
          history: {
            'node-a': [
              {
                timestamp: '2026-03-06T12:05:01.100Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-right',
                spanId: 'node-a:2:1',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                status: 'completed',
                iteration: 1,
                attempt: 2,
                inputs: {},
                outputs: { value: 'fresh' },
                inputHash: 'hash-a-2',
              },
            ],
            'node-b': [
              {
                timestamp: '2026-03-06T12:05:01.300Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-right',
                spanId: 'node-b:2:1',
                nodeId: 'node-b',
                nodeType: 'parser',
                nodeTitle: 'Parser',
                status: 'cached',
                iteration: 1,
                attempt: 2,
                inputs: {},
                outputs: { value: 'parsed' },
                inputHash: 'hash-b-2',
              },
            ],
          },
        },
        meta: {
          runtimeTrace: {
            version: 'ai-paths.trace.v1',
            traceId: 'run-right',
            runId: 'run-right',
            source: 'server',
            startedAt: '2026-03-06T12:05:01.000Z',
            finishedAt: '2026-03-06T12:05:04.000Z',
            spans: [
              {
                spanId: 'node-a:2:1',
                runId: 'run-right',
                traceId: 'run-right',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                iteration: 1,
                attempt: 2,
                startedAt: '2026-03-06T12:05:01.000Z',
                finishedAt: '2026-03-06T12:05:01.100Z',
                status: 'completed',
              },
              {
                spanId: 'node-b:2:1',
                runId: 'run-right',
                traceId: 'run-right',
                nodeId: 'node-b',
                nodeType: 'parser',
                nodeTitle: 'Parser',
                iteration: 1,
                attempt: 2,
                startedAt: '2026-03-06T12:05:01.200Z',
                finishedAt: '2026-03-06T12:05:01.300Z',
                status: 'cached',
              },
            ],
          },
        },
      } as never
    );

    expect(comparison?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'node-a',
          leftStatus: 'cached',
          rightStatus: 'completed',
        }),
        expect.objectContaining({
          nodeId: 'node-b',
          leftStatus: 'completed',
          rightStatus: 'cached',
        }),
      ])
    );
  });

  it('prioritizes larger duration deltas ahead of plain diffs within the same class', () => {
    const comparison = buildRunTraceComparison(
      {
        id: 'run-left-order',
        status: 'completed',
        pathId: 'path-1',
        pathName: 'Path 1',
        createdAt: '2026-03-06T13:00:00.000Z',
        startedAt: '2026-03-06T13:00:01.000Z',
        finishedAt: '2026-03-06T13:00:03.000Z',
        runtimeState: {
          history: {
            'node-a': [
              {
                timestamp: '2026-03-06T13:00:01.100Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-left-order',
                spanId: 'node-a:1:1',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                status: 'completed',
                iteration: 1,
                attempt: 1,
                inputs: {},
                outputs: { value: 'a' },
                inputHash: 'hash-a',
              },
            ],
            'node-b': [
              {
                timestamp: '2026-03-06T13:00:01.300Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-left-order',
                spanId: 'node-b:1:1',
                nodeId: 'node-b',
                nodeType: 'parser',
                nodeTitle: 'Parser',
                status: 'completed',
                iteration: 1,
                attempt: 1,
                inputs: {},
                outputs: { value: 'b' },
                inputHash: 'hash-b',
              },
            ],
          },
        },
        meta: {
          runtimeTrace: {
            version: 'ai-paths.trace.v1',
            traceId: 'run-left-order',
            runId: 'run-left-order',
            source: 'server',
            startedAt: '2026-03-06T13:00:01.000Z',
            finishedAt: '2026-03-06T13:00:03.000Z',
            spans: [
              {
                spanId: 'node-a:1:1',
                runId: 'run-left-order',
                traceId: 'run-left-order',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                iteration: 1,
                attempt: 1,
                startedAt: '2026-03-06T13:00:01.000Z',
                finishedAt: '2026-03-06T13:00:01.200Z',
                status: 'completed',
              },
              {
                spanId: 'node-b:1:1',
                runId: 'run-left-order',
                traceId: 'run-left-order',
                nodeId: 'node-b',
                nodeType: 'parser',
                nodeTitle: 'Parser',
                iteration: 1,
                attempt: 1,
                startedAt: '2026-03-06T13:00:01.200Z',
                finishedAt: '2026-03-06T13:00:01.300Z',
                status: 'completed',
              },
            ],
          },
        },
      } as never,
      {
        id: 'run-right-order',
        status: 'completed',
        pathId: 'path-1',
        pathName: 'Path 1',
        createdAt: '2026-03-06T13:05:00.000Z',
        startedAt: '2026-03-06T13:05:01.000Z',
        finishedAt: '2026-03-06T13:05:04.000Z',
        runtimeState: {
          history: {
            'node-a': [
              {
                timestamp: '2026-03-06T13:05:01.150Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-right-order',
                spanId: 'node-a:2:1',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                status: 'completed',
                iteration: 1,
                attempt: 2,
                inputs: {},
                outputs: { value: 'a2' },
                inputHash: 'hash-a2',
              },
            ],
            'node-b': [
              {
                timestamp: '2026-03-06T13:05:01.300Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                traceId: 'run-right-order',
                spanId: 'node-b:2:1',
                nodeId: 'node-b',
                nodeType: 'parser',
                nodeTitle: 'Parser',
                status: 'completed',
                iteration: 1,
                attempt: 2,
                inputs: {},
                outputs: { value: 'b2' },
                inputHash: 'hash-b2',
              },
            ],
          },
        },
        meta: {
          runtimeTrace: {
            version: 'ai-paths.trace.v1',
            traceId: 'run-right-order',
            runId: 'run-right-order',
            source: 'server',
            startedAt: '2026-03-06T13:05:01.000Z',
            finishedAt: '2026-03-06T13:05:04.000Z',
            spans: [
              {
                spanId: 'node-a:2:1',
                runId: 'run-right-order',
                traceId: 'run-right-order',
                nodeId: 'node-a',
                nodeType: 'fetcher',
                nodeTitle: 'Fetcher',
                iteration: 1,
                attempt: 2,
                startedAt: '2026-03-06T13:05:01.000Z',
                finishedAt: '2026-03-06T13:05:01.150Z',
                status: 'completed',
              },
              {
                spanId: 'node-b:2:1',
                runId: 'run-right-order',
                traceId: 'run-right-order',
                nodeId: 'node-b',
                nodeType: 'parser',
                nodeTitle: 'Parser',
                iteration: 1,
                attempt: 2,
                startedAt: '2026-03-06T13:05:01.200Z',
                finishedAt: '2026-03-06T13:05:01.900Z',
                status: 'completed',
              },
            ],
          },
        },
      } as never
    );

    expect(comparison?.rows[0]?.nodeId).toBe('node-b');
    expect(comparison?.rows[1]?.nodeId).toBe('node-a');
  });
});

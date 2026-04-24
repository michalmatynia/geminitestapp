import { describe, expect, it } from 'vitest';

import {
  buildRunTraceComparison,
} from '../run-trace-comparison';

const buildHistoryEntry = (overrides: Record<string, unknown>) => ({
  timestamp: '2026-03-06T10:00:01.100Z',
  pathId: 'path-1',
  pathName: 'Path 1',
  traceId: 'run-1',
  spanId: 'node-a:1:1',
  nodeId: 'node-a',
  nodeType: 'fetcher',
  nodeTitle: 'Fetcher',
  status: 'completed',
  iteration: 1,
  attempt: 1,
  inputs: {},
  outputs: {},
  inputHash: 'hash-a',
  ...overrides,
});

const buildTraceSpan = (overrides: Record<string, unknown>) => ({
  spanId: 'node-a:1:1',
  runId: 'run-1',
  traceId: 'run-1',
  nodeId: 'node-a',
  nodeType: 'fetcher',
  nodeTitle: 'Fetcher',
  iteration: 1,
  attempt: 1,
  startedAt: '2026-03-06T10:00:01.000Z',
  finishedAt: '2026-03-06T10:00:01.100Z',
  status: 'completed',
  ...overrides,
});

const buildRun = ({
  id,
  status = 'completed',
  createdAt = '2026-03-06T10:00:00.000Z',
  startedAt = '2026-03-06T10:00:01.000Z',
  finishedAt = '2026-03-06T10:00:03.000Z',
  history = {},
  spans = null,
}: {
  id: string;
  status?: string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  history?: Record<string, unknown>;
  spans?: Array<Record<string, unknown>> | null;
}) =>
  ({
    id,
    status,
    pathId: 'path-1',
    pathName: 'Path 1',
    createdAt,
    startedAt,
    finishedAt,
    runtimeState: {
      history,
    },
    meta:
      spans === null
        ? {}
        : {
            runtimeTrace: {
              version: 'ai-paths.trace.v1',
              traceId: id,
              runId: id,
              source: 'server',
              startedAt,
              finishedAt,
              spans,
            },
          },
  }) as never;

describe('run-trace-comparison', () => {
  it('returns null for incomplete comparisons', () => {
    expect(buildRunTraceComparison(null, null)).toBeNull();
  });

  it('builds regressed trace rows with structured payload diffs', () => {
    const comparison = buildRunTraceComparison(
      buildRun({
        id: 'run-a',
        history: {
          'node-a': [
            buildHistoryEntry({
              traceId: 'run-a',
              inputs: { query: 'alpha' },
              outputs: { value: 'ok', count: 1 },
            }),
          ],
        },
        spans: [
          buildTraceSpan({
            runId: 'run-a',
            traceId: 'run-a',
            status: 'completed',
            finishedAt: '2026-03-06T10:00:01.100Z',
          }),
        ],
      }),
      buildRun({
        id: 'run-b',
        status: 'failed',
        createdAt: '2026-03-06T10:05:00.000Z',
        startedAt: '2026-03-06T10:05:01.000Z',
        finishedAt: '2026-03-06T10:05:05.000Z',
        history: {
          'node-a': [
            buildHistoryEntry({
              timestamp: '2026-03-06T10:05:02.000Z',
              traceId: 'run-b',
              inputs: { query: 'beta', mode: 'strict' },
              outputs: { value: 'error', reason: 'timeout' },
              status: 'failed',
            }),
          ],
        },
        spans: [
          buildTraceSpan({
            runId: 'run-b',
            traceId: 'run-b',
            status: 'failed',
            startedAt: '2026-03-06T10:05:01.000Z',
            finishedAt: '2026-03-06T10:05:02.000Z',
          }),
        ],
      })
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
    expect(comparison?.rows[0]?.inputDiff?.lines.join('\n')).toContain('~ query: alpha -> beta');
  });

  it('preserves primitive and array payloads in payload diffs', () => {
    const comparison = buildRunTraceComparison(
      buildRun({
        id: 'run-left',
        history: {
          'node-b': [
            buildHistoryEntry({
              nodeId: 'node-b',
              nodeType: 'parser',
              nodeTitle: 'Parser',
              spanId: 'node-b:1:1',
              inputs: false,
              outputs: ['alpha', 'beta'],
            }),
          ],
        },
        spans: [
          buildTraceSpan({
            nodeId: 'node-b',
            nodeType: 'parser',
            nodeTitle: 'Parser',
            spanId: 'node-b:1:1',
          }),
        ],
      }),
      buildRun({
        id: 'run-right',
        createdAt: '2026-03-06T11:05:00.000Z',
        startedAt: '2026-03-06T11:05:01.000Z',
        finishedAt: '2026-03-06T11:05:03.000Z',
        history: {
          'node-b': [
            buildHistoryEntry({
              timestamp: '2026-03-06T11:05:01.100Z',
              traceId: 'run-right',
              nodeId: 'node-b',
              nodeType: 'parser',
              nodeTitle: 'Parser',
              spanId: 'node-b:1:1',
              inputs: true,
              outputs: ['alpha', 'gamma'],
            }),
          ],
        },
        spans: [
          buildTraceSpan({
            runId: 'run-right',
            traceId: 'run-right',
            nodeId: 'node-b',
            nodeType: 'parser',
            nodeTitle: 'Parser',
            spanId: 'node-b:1:1',
            finishedAt: '2026-03-06T11:05:01.300Z',
          }),
        ],
      })
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

  it('sorts changed rows by classification and duration delta', () => {
    const comparison = buildRunTraceComparison(
      buildRun({
        id: 'run-left-order',
        createdAt: '2026-03-06T13:00:00.000Z',
        history: {
          'node-a': [
            buildHistoryEntry({
              timestamp: '2026-03-06T13:00:01.100Z',
              traceId: 'run-left-order',
              outputs: { value: 'a' },
            }),
          ],
          'node-b': [
            buildHistoryEntry({
              timestamp: '2026-03-06T13:00:01.300Z',
              traceId: 'run-left-order',
              nodeId: 'node-b',
              nodeType: 'parser',
              nodeTitle: 'Parser',
              spanId: 'node-b:1:1',
              outputs: { value: 'b' },
            }),
          ],
        },
        spans: [
          buildTraceSpan({
            runId: 'run-left-order',
            traceId: 'run-left-order',
            startedAt: '2026-03-06T13:00:01.000Z',
            finishedAt: '2026-03-06T13:00:01.100Z',
          }),
          buildTraceSpan({
            spanId: 'node-b:1:1',
            runId: 'run-left-order',
            traceId: 'run-left-order',
            nodeId: 'node-b',
            nodeType: 'parser',
            nodeTitle: 'Parser',
            startedAt: '2026-03-06T13:00:01.200Z',
            finishedAt: '2026-03-06T13:00:01.300Z',
          }),
        ],
      }),
      buildRun({
        id: 'run-right-order',
        createdAt: '2026-03-06T13:05:00.000Z',
        startedAt: '2026-03-06T13:05:01.000Z',
        finishedAt: '2026-03-06T13:05:04.000Z',
        history: {
          'node-a': [
            buildHistoryEntry({
              timestamp: '2026-03-06T13:05:01.150Z',
              traceId: 'run-right-order',
              outputs: { value: 'a2' },
            }),
          ],
          'node-b': [
            buildHistoryEntry({
              timestamp: '2026-03-06T13:05:01.300Z',
              traceId: 'run-right-order',
              nodeId: 'node-b',
              nodeType: 'parser',
              nodeTitle: 'Parser',
              spanId: 'node-b:2:1',
              outputs: { value: 'b2' },
            }),
          ],
        },
        spans: [
          buildTraceSpan({
            runId: 'run-right-order',
            traceId: 'run-right-order',
            startedAt: '2026-03-06T13:05:01.000Z',
            finishedAt: '2026-03-06T13:05:01.150Z',
          }),
          buildTraceSpan({
            spanId: 'node-b:2:1',
            runId: 'run-right-order',
            traceId: 'run-right-order',
            nodeId: 'node-b',
            nodeType: 'parser',
            nodeTitle: 'Parser',
            startedAt: '2026-03-06T13:05:01.200Z',
            finishedAt: '2026-03-06T13:05:01.900Z',
          }),
        ],
      })
    );

    expect(comparison?.rows[0]?.nodeId).toBe('node-b');
    expect(comparison?.rows[1]?.nodeId).toBe('node-a');
  });

  it('uses mixed sources and surfaces added and removed rows', () => {
    const comparison = buildRunTraceComparison(
      buildRun({
        id: 'left-mixed',
        history: {
          'node-removed': [
            buildHistoryEntry({
              nodeId: 'node-removed',
              nodeType: 'fetcher',
              nodeTitle: 'Removed Node',
              spanId: 'node-removed:1:1',
            }),
          ],
        },
        spans: [
          buildTraceSpan({
            nodeId: 'node-removed',
            nodeType: 'fetcher',
            nodeTitle: 'Removed Node',
            spanId: 'node-removed:1:1',
          }),
        ],
      }),
      buildRun({
        id: 'right-mixed',
        history: {
          'node-added': [
            buildHistoryEntry({
              traceId: 'right-mixed',
              nodeId: 'node-added',
              nodeType: 'parser',
              nodeTitle: 'Added Node',
              spanId: 'node-added:1:1',
              status: 'running',
            }),
          ],
        },
        spans: null,
      })
    );

    expect(comparison?.dataSource).toBe('mixed');
    expect(comparison?.addedCount).toBe(1);
    expect(comparison?.removedCount).toBe(1);
    expect(comparison?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'node-added',
          classification: 'added',
          leftStatus: null,
          rightStatus: 'running',
        }),
        expect.objectContaining({
          nodeId: 'node-removed',
          classification: 'removed',
          leftStatus: 'completed',
          rightStatus: null,
        }),
      ])
    );
  });
});

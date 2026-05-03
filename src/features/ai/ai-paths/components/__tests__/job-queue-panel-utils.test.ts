import { describe, expect, it, vi } from 'vitest';

import type { AiPathRunNodeRecord, AiPathRunRecord } from '@/shared/contracts/ai-paths';

vi.mock('@/shared/lib/ai-paths/core/utils/runtime', () => ({
  safeJsonStringify: (value: unknown): string => JSON.stringify(value ?? null),
}));

import {
  formatUtcDateTime,
  formatUtcClockTime,
  normalizeRunNodes,
  resolveRunExecutionKind,
  resolveRunOrigin,
  resolveRunSource,
  resolveRunSourceDebug,
} from '../job-queue-panel-utils';

const buildNode = (patch: Partial<AiPathRunNodeRecord>): AiPathRunNodeRecord => ({
  id: patch.id ?? `row-${patch.nodeId ?? 'node'}`,
  runId: patch.runId ?? 'run-1',
  nodeId: patch.nodeId ?? 'node-1',
  nodeType: patch.nodeType ?? 'prompt',
  nodeTitle: patch.nodeTitle ?? patch.nodeId ?? 'Node',
  status: patch.status ?? 'completed',
  attempt: patch.attempt ?? 1,
  inputs: patch.inputs ?? {},
  outputs: patch.outputs ?? {},
  createdAt: patch.createdAt ?? '2026-02-23T10:00:00.000Z',
  updatedAt: patch.updatedAt ?? patch.createdAt ?? '2026-02-23T10:00:00.000Z',
  startedAt: patch.startedAt ?? null,
  completedAt: patch.completedAt ?? null,
  finishedAt: patch.finishedAt ?? null,
  errorMessage: patch.errorMessage ?? null,
});

const buildRun = (patch: Partial<AiPathRunRecord>): AiPathRunRecord => ({
  id: patch.id ?? 'run-1',
  createdAt: patch.createdAt ?? '2026-02-23T10:00:00.000Z',
  updatedAt: patch.updatedAt ?? '2026-02-23T10:00:00.000Z',
  status: patch.status ?? 'queued',
  pathId: patch.pathId ?? 'path-1',
  pathName: patch.pathName ?? 'Path 1',
  meta: patch.meta ?? {},
  ...patch,
});

describe('normalizeRunNodes', () => {
  it('sorts nodes by completion time (finishedAt/completedAt) ascending', () => {
    const nodes: AiPathRunNodeRecord[] = [
      buildNode({
        nodeId: 'node-c',
        finishedAt: '2026-02-23T10:00:03.000Z',
      }),
      buildNode({
        nodeId: 'node-a',
        finishedAt: '2026-02-23T10:00:01.000Z',
      }),
      buildNode({
        nodeId: 'node-b',
        completedAt: '2026-02-23T10:00:02.000Z',
      }),
    ];

    const normalized = normalizeRunNodes(nodes);

    expect(normalized.map((node: AiPathRunNodeRecord) => node.nodeId)).toEqual([
      'node-a',
      'node-b',
      'node-c',
    ]);
  });

  it('places unfinished nodes after finished ones and orders unfinished by startedAt', () => {
    const nodes: AiPathRunNodeRecord[] = [
      buildNode({
        nodeId: 'node-running-2',
        status: 'running',
        startedAt: '2026-02-23T10:00:07.000Z',
        finishedAt: null,
      }),
      buildNode({
        nodeId: 'node-completed',
        status: 'completed',
        finishedAt: '2026-02-23T10:00:05.000Z',
      }),
      buildNode({
        nodeId: 'node-running-1',
        status: 'running',
        startedAt: '2026-02-23T10:00:06.000Z',
        finishedAt: null,
      }),
    ];

    const normalized = normalizeRunNodes(nodes);

    expect(normalized.map((node: AiPathRunNodeRecord) => node.nodeId)).toEqual([
      'node-completed',
      'node-running-1',
      'node-running-2',
    ]);
  });

  it('returns empty array for non-array input', () => {
    expect(normalizeRunNodes(null)).toEqual([]);
    expect(normalizeRunNodes(undefined)).toEqual([]);
    expect(normalizeRunNodes({})).toEqual([]);
  });
});

describe('formatUtcClockTime', () => {
  it('formats timestamps in a deterministic UTC clock format', () => {
    expect(formatUtcClockTime('2026-03-09T07:27:00.000Z')).toBe('07:27:00 UTC');
    expect(formatUtcClockTime(1741505220000)).toBe('07:27:00 UTC');
  });

  it('returns the fallback marker for missing or invalid timestamps', () => {
    expect(formatUtcClockTime(null)).toBe('-');
    expect(formatUtcClockTime('invalid')).toBe('-');
  });
});

describe('formatUtcDateTime', () => {
  it('formats timestamps in a deterministic UTC date-time format', () => {
    expect(formatUtcDateTime('2026-03-09T07:27:00.000Z')).toBe('2026-03-09 07:27:00 UTC');
    expect(formatUtcDateTime(Date.parse('2026-03-09T07:27:00.000Z'))).toBe(
      '2026-03-09 07:27:00 UTC'
    );
  });

  it('returns the fallback marker for missing or invalid date-times', () => {
    expect(formatUtcDateTime(undefined)).toBe('-');
    expect(formatUtcDateTime('invalid')).toBe('-');
  });
});

describe('resolveRunExecutionKind', () => {
  it('resolves canonical top-level executionMode metadata', () => {
    const run = buildRun({
      meta: {
        executionMode: 'server',
      },
    });

    expect(resolveRunExecutionKind(run)).toBe('server');
  });

  it('resolves canonical nested executionMode metadata', () => {
    const run = buildRun({
      meta: {
        runtime: {
          executionMode: 'local',
        },
      },
    });

    expect(resolveRunExecutionKind(run)).toBe('local');
  });

  it('ignores removed legacy execution aliases and falls back to unknown', () => {
    const run = buildRun({
      meta: {
        execution_mode: 'server',
        runMode: 'manual',
        run_mode: 'manual',
        mode: 'worker',
        runtime: {
          mode: 'local',
        },
        sourceInfo: {
          mode: 'server',
        },
      },
    });

    expect(resolveRunExecutionKind(run)).toBe('unknown');
  });

  it('ignores removed sourceInfo execution-mode compatibility metadata', () => {
    const run = buildRun({
      meta: {
        sourceInfo: {
          executionMode: 'server',
        },
      },
    });

    expect(resolveRunExecutionKind(run)).toBe('unknown');
  });
});

describe('resolveRunSource', () => {
  it('resolves canonical string source metadata', () => {
    const run = buildRun({
      meta: {
        source: 'AI_PATHS_UI',
      },
    });

    expect(resolveRunSource(run)).toBe('ai_paths_ui');
    expect(resolveRunOrigin(run)).toBe('node');
    expect(resolveRunSourceDebug(run)).toBe('src=ai_paths_ui');
  });

  it('ignores removed object-shaped source compatibility metadata', () => {
    const run = buildRun({
      meta: {
        source: {
          tab: 'product',
        },
        sourceInfo: {
          tab: 'notes',
        },
      },
    });

    expect(resolveRunSource(run)).toBeNull();
    expect(resolveRunOrigin(run)).toBe('unknown');
    expect(resolveRunSourceDebug(run)).toBe('src=-');
  });
});

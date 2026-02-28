import { describe, expect, it, vi } from 'vitest';

import type { AiPathRunNodeRecord } from '@/shared/contracts/ai-paths';

vi.mock('../AiPathsSettingsUtils', () => ({
  safeJsonStringify: (value: unknown): string => JSON.stringify(value ?? null),
}));

import { normalizeRunNodes } from '../job-queue-panel-utils';

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

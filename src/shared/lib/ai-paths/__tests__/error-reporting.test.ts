import { describe, expect, it } from 'vitest';

import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/contracts/ai-paths';

import { buildAiPathRunErrorSummary } from '../error-reporting';

const buildRun = (overrides: Partial<AiPathRunRecord> = {}): AiPathRunRecord =>
  ({
    id: 'run-1',
    status: 'failed',
    errorMessage: null,
    error: null,
    createdAt: '2026-03-09T12:00:00.000Z',
    updatedAt: '2026-03-09T12:00:05.000Z',
    finishedAt: '2026-03-09T12:00:05.000Z',
    nextRetryAt: null,
    meta: null,
    ...overrides,
  }) as unknown as AiPathRunRecord;

const buildNode = (overrides: Partial<AiPathRunNodeRecord> = {}): AiPathRunNodeRecord =>
  ({
    id: 'node-record-1',
    runId: 'run-1',
    nodeId: 'node-db-update',
    nodeType: 'database',
    nodeTitle: 'DB Update',
    status: 'failed',
    attempt: 1,
    errorMessage: null,
    error: null,
    createdAt: '2026-03-09T12:00:01.000Z',
    updatedAt: '2026-03-09T12:00:04.000Z',
    finishedAt: '2026-03-09T12:00:04.000Z',
    ...overrides,
  }) as unknown as AiPathRunNodeRecord;

const NO_EVENTS: AiPathRunEventRecord[] = [];

describe('buildAiPathRunErrorSummary', () => {
  it('returns null when there are no errors, events or node failures', () => {
    const run = buildRun({ status: 'completed', errorMessage: null });
    const result = buildAiPathRunErrorSummary({ run, nodes: [], events: NO_EVENTS });
    expect(result).toBeNull();
  });

  it('includes failed nodes in nodeFailures', () => {
    const run = buildRun();
    const node = buildNode({ status: 'failed', errorMessage: 'DB write error.' });

    const result = buildAiPathRunErrorSummary({ run, nodes: [node], events: NO_EVENTS });

    expect(result).not.toBeNull();
    expect(result!.nodeFailures).toHaveLength(1);
    expect(result!.nodeFailures[0]).toMatchObject({
      nodeId: 'node-db-update',
      nodeType: 'database',
      nodeTitle: 'DB Update',
      code: 'AI_PATHS_NODE_FAILED',
    });
  });

  it('includes blocked nodes in nodeFailures with AI_PATHS_NODE_BLOCKED code', () => {
    const run = buildRun();
    const node = buildNode({ status: 'blocked', errorMessage: null });

    const result = buildAiPathRunErrorSummary({ run, nodes: [node], events: NO_EVENTS });

    expect(result).not.toBeNull();
    expect(result!.nodeFailures).toHaveLength(1);
    expect(result!.nodeFailures[0]).toMatchObject({
      nodeId: 'node-db-update',
      code: 'AI_PATHS_NODE_BLOCKED',
    });
  });

  it('uses the default blocked message when blocked node has no errorMessage or error', () => {
    const run = buildRun();
    const node = buildNode({ status: 'blocked', errorMessage: null, error: null });

    const result = buildAiPathRunErrorSummary({ run, nodes: [node], events: NO_EVENTS });

    expect(result!.nodeFailures[0]?.message).toBe('Node blocked without completing.');
  });

  it('surfaces the errorMessage of a blocked node when present', () => {
    const run = buildRun();
    const node = buildNode({ status: 'blocked', errorMessage: 'Upstream dependency failed.' });

    const result = buildAiPathRunErrorSummary({ run, nodes: [node], events: NO_EVENTS });

    expect(result!.nodeFailures[0]?.message).toBe('Upstream dependency failed.');
  });

  it('excludes completed and skipped nodes from nodeFailures', () => {
    const run = buildRun({ status: 'completed', errorMessage: null });
    const completed = buildNode({ nodeId: 'node-a', status: 'completed', errorMessage: null });
    const skipped = buildNode({ nodeId: 'node-b', status: 'skipped', errorMessage: null });

    const result = buildAiPathRunErrorSummary({ run, nodes: [completed, skipped], events: NO_EVENTS });

    expect(result).toBeNull();
  });

  it('aggregates both failed and blocked nodes in the same summary', () => {
    const run = buildRun();
    const failedNode = buildNode({
      id: 'node-record-1',
      nodeId: 'node-a',
      status: 'failed',
      errorMessage: 'Write failed.',
    });
    const blockedNode = buildNode({
      id: 'node-record-2',
      nodeId: 'node-b',
      status: 'blocked',
      errorMessage: null,
    });

    const result = buildAiPathRunErrorSummary({
      run,
      nodes: [failedNode, blockedNode],
      events: NO_EVENTS,
    });

    expect(result!.nodeFailures).toHaveLength(2);
    const codes = result!.nodeFailures.map((n) => n.code);
    expect(codes).toContain('AI_PATHS_NODE_FAILED');
    expect(codes).toContain('AI_PATHS_NODE_BLOCKED');
  });

  it('counts AI_PATHS_NODE_BLOCKED in the codes summary', () => {
    const run = buildRun();
    const blockedNode = buildNode({ status: 'blocked' });

    const result = buildAiPathRunErrorSummary({ run, nodes: [blockedNode], events: NO_EVENTS });

    const blockedCodeEntry = result!.codes.find((c) => c.code === 'AI_PATHS_NODE_BLOCKED');
    expect(blockedCodeEntry).toBeDefined();
    expect(blockedCodeEntry!.count).toBe(1);
  });
});

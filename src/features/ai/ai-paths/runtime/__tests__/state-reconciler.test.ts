import { describe, expect, it } from 'vitest';

import type { RuntimeState, RuntimeHistoryEntry } from '@/shared/contracts/ai-paths';
import { reconcileRuntimeState } from '../state-reconciler';

describe('state-reconciler', () => {
  const createMockState = (overrides: Partial<RuntimeState> = {}): RuntimeState => ({
    status: 'running',
    nodeStatuses: {},
    inputs: {},
    outputs: {},
    nodeOutputs: {},
    variables: {},
    events: [],
    history: {},
    hashes: {},
    hashTimestamps: {},
    nodeDurations: {},
    ...overrides,
  } as RuntimeState);

  const createMockHistoryEntry = (nodeId: string, spanId: string): RuntimeHistoryEntry => ({
    timestamp: new Date().toISOString(),
    pathId: 'path-1',
    pathName: 'Path 1',
    traceId: 'trace-1',
    spanId,
    nodeId,
    nodeType: 'template',
    nodeTitle: 'Node',
    status: 'completed',
    iteration: 1,
    attempt: 1,
    inputs: {},
    outputs: {},
    inputHash: 'hash',
  } as RuntimeHistoryEntry);

  it('merges partial updates from parallel branches without data loss', () => {
    const base = createMockState({
      nodeStatuses: { 'node-1': 'completed' },
      outputs: { 'node-1': { out: 1 } },
      history: { 'node-1': [createMockHistoryEntry('node-1', 'span-1')] },
    });

    const updateA: Partial<RuntimeState> = {
      nodeStatuses: { 'node-2': 'completed' },
      outputs: { 'node-2': { out: 2 } },
      history: { 'node-2': [createMockHistoryEntry('node-2', 'span-2')] },
    };

    const updateB: Partial<RuntimeState> = {
      nodeStatuses: { 'node-3': 'completed' },
      outputs: { 'node-3': { out: 3 } },
      history: { 'node-3': [createMockHistoryEntry('node-3', 'span-3')] },
    };

    const reconciled = reconcileRuntimeState(base, [updateA, updateB]);

    expect(reconciled.nodeStatuses['node-1']).toBe('completed');
    expect(reconciled.nodeStatuses['node-2']).toBe('completed');
    expect(reconciled.nodeStatuses['node-3']).toBe('completed');
    expect(reconciled.outputs['node-1']).toEqual({ out: 1 });
    expect(reconciled.outputs['node-2']).toEqual({ out: 2 });
    expect(reconciled.outputs['node-3']).toEqual({ out: 3 });
    expect(reconciled.history?.['node-1']).toHaveLength(1);
    expect(reconciled.history?.['node-2']).toHaveLength(1);
    expect(reconciled.history?.['node-3']).toHaveLength(1);
  });

  it('deduplicates history entries by spanId', () => {
    const entry1 = createMockHistoryEntry('node-1', 'span-1');
    const base = createMockState({
      history: { 'node-1': [entry1] },
    });

    const updateA: Partial<RuntimeState> = {
      history: { 'node-1': [entry1] }, // Same entry
    };

    const reconciled = reconcileRuntimeState(base, [updateA]);

    expect(reconciled.history?.['node-1']).toHaveLength(1);
    expect(reconciled.history?.['node-1']?.[0]?.spanId).toBe('span-1');
  });

  it('merges events and deduplicates by id', () => {
    const base = createMockState({
      events: [{ id: 'evt-1', message: 'Hello' } as any],
    });

    const updateA: Partial<RuntimeState> = {
      events: [
        { id: 'evt-1', message: 'Hello (updated)' } as any, // Same ID
        { id: 'evt-2', message: 'World' } as any,
      ],
    };

    const reconciled = reconcileRuntimeState(base, [updateA]);

    expect(reconciled.events).toHaveLength(2);
    expect(reconciled.events.find((e: any) => e.id === 'evt-1')?.message).toBe('Hello (updated)');
    expect(reconciled.events.find((e: any) => e.id === 'evt-2')?.message).toBe('World');
  });
});

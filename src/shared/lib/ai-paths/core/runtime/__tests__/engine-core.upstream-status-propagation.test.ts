import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNode = (input: {
  id: string;
  type: string;
  inputs?: string[];
  outputs?: string[];
}): AiNode =>
  ({
    id: input.id,
    type: input.type,
    title: input.id,
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    config: {},
    inputs: input.inputs ?? [],
    outputs: input.outputs ?? ['value'],
  }) as AiNode;

const buildEdge = (from: string, to: string): Edge =>
  ({
    id: `${from}->${to}`,
    from,
    fromPort: 'value',
    to,
    toPort: 'value',
  }) as Edge;

describe('engine-core upstream status propagation', () => {
  it('keeps waiting_callback status for finished upstream nodes in readiness diagnostics', async () => {
    const upstream = buildNode({ id: 'model-1', type: 'custom_model', outputs: ['value'] });
    const downstream = buildNode({
      id: 'database-1',
      type: 'custom_database',
      inputs: ['value'],
      outputs: ['result'],
    });

    const runtime = await evaluateGraphInternal(
      [upstream, downstream],
      [buildEdge('model-1', 'database-1')],
      {
        resolveHandler: (nodeType) => {
          if (nodeType === 'custom_model') {
            return async () => ({
              status: 'waiting_callback',
            });
          }
          if (nodeType === 'custom_database') {
            return vi.fn(async () => ({ result: 'should-not-run' }));
          }
          return null;
        },
        reportAiPathsError: (): void => {},
      }
    );

    expect(runtime.nodeStatuses['model-1']).toBe('waiting_callback');
    expect(runtime.nodeStatuses['database-1']).toBe('waiting_callback');
    expect(runtime.nodeOutputs['database-1']?.['status']).toBe('waiting_callback');
    expect(runtime.nodeOutputs['database-1']?.['waitingOnDetails']).toEqual([
      expect.objectContaining({
        port: 'value',
        upstream: [expect.objectContaining({ nodeId: 'model-1', status: 'waiting_callback' })],
      }),
    ]);
  });

  it('keeps failed status for finished upstream nodes in readiness diagnostics', async () => {
    const upstream = buildNode({ id: 'model-1', type: 'custom_model', outputs: ['value'] });
    const downstream = buildNode({
      id: 'database-1',
      type: 'custom_database',
      inputs: ['value'],
      outputs: ['result'],
    });

    const runtime = await evaluateGraphInternal(
      [upstream, downstream],
      [buildEdge('model-1', 'database-1')],
      {
        resolveHandler: (nodeType) => {
          if (nodeType === 'custom_model') {
            return async () => ({
              status: 'failed',
              error: 'upstream failed',
            });
          }
          if (nodeType === 'custom_database') {
            return vi.fn(async () => ({ result: 'should-not-run' }));
          }
          return null;
        },
        reportAiPathsError: (): void => {},
      }
    );

    expect(runtime.nodeStatuses['model-1']).toBe('failed');
    expect(runtime.nodeStatuses['database-1']).toBe('blocked');
    expect(runtime.nodeOutputs['database-1']?.['status']).toBe('blocked');
    expect(runtime.nodeOutputs['database-1']?.['waitingOnDetails']).toEqual([
      expect.objectContaining({
        port: 'value',
        upstream: [expect.objectContaining({ nodeId: 'model-1', status: 'failed' })],
      }),
    ]);
  });

  it('treats queued upstream status as transient waiting state', async () => {
    const upstream = buildNode({ id: 'model-1', type: 'custom_model', outputs: ['value'] });
    const downstream = buildNode({
      id: 'database-1',
      type: 'custom_database',
      inputs: ['value'],
      outputs: ['result'],
    });

    const runtime = await evaluateGraphInternal(
      [upstream, downstream],
      [buildEdge('model-1', 'database-1')],
      {
        resolveHandler: (nodeType) => {
          if (nodeType === 'custom_model') {
            return async () => ({
              status: 'queued',
              jobId: 'job-queued-1',
            });
          }
          if (nodeType === 'custom_database') {
            return vi.fn(async () => ({ result: 'should-not-run' }));
          }
          return null;
        },
        reportAiPathsError: (): void => {},
      }
    );

    expect(runtime.nodeStatuses['model-1']).toBe('queued');
    expect(runtime.nodeStatuses['database-1']).toBe('waiting_callback');
    expect(runtime.nodeOutputs['database-1']?.['status']).toBe('waiting_callback');
    expect(runtime.nodeOutputs['database-1']?.['waitingOnDetails']).toEqual([
      expect.objectContaining({
        port: 'value',
        upstream: [expect.objectContaining({ nodeId: 'model-1', status: 'queued' })],
      }),
    ]);
  });
});

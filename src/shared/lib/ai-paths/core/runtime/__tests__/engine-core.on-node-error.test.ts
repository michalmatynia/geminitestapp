import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildFailingNode = (type: string): AiNode =>
  ({
    id: `node-${type}`,
    type,
    title: 'Failing Node',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {},
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('engine-core onNodeError lifecycle', () => {
  it('invokes onNodeError when a node handler throws and does not emit onNodeFinish for that failure', async () => {
    const node = buildFailingNode('custom_failure');
    const onNodeFinish = vi.fn();
    const onNodeError = vi.fn();

    await expect(
      evaluateGraphInternal([node], [] satisfies Edge[], {
        resolveHandler: () => {
          return () => {
            throw new Error('boom');
          };
        },
        onNodeFinish,
        onNodeError,
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow('boom');

    expect(onNodeError).toHaveBeenCalledTimes(1);
    const call = onNodeError.mock.calls[0] as [{ node: AiNode; error: Error }];
    expect(call?.[0]?.node?.id).toBe(node.id);
    expect(onNodeFinish).not.toHaveBeenCalled();
  });

  it('invokes onNodeError when no handler is registered for node type', async () => {
    const node = buildFailingNode('missing_handler');
    const onNodeError = vi.fn();

    await expect(
      evaluateGraphInternal([node], [] satisfies Edge[], {
        resolveHandler: () => null,
        onNodeError,
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow('No handler found for node type: missing_handler');

    expect(onNodeError).toHaveBeenCalledTimes(1);
    const call = onNodeError.mock.calls[0] as [{ node: AiNode; error: Error }];
    expect(call?.[0]?.node?.id).toBe(node.id);
  });

  it('stores failed output status in runtime snapshot when a handler throws', async () => {
    const node = buildFailingNode('snapshot_failure');

    await expect(
      evaluateGraphInternal([node], [] satisfies Edge[], {
        resolveHandler: () => {
          return () => {
            throw new Error('snapshot boom');
          };
        },
        reportAiPathsError: (): void => {},
      })
    ).rejects.toMatchObject({
      state: {
        nodeOutputs: {
          [node.id]: {
            status: 'failed',
          },
        },
      },
    });
  });

  it('keeps handler-declared blocked nodes blocked and prevents downstream execution', async () => {
    const sourceNode = {
      ...buildFailingNode('source_ready'),
      id: 'node-source',
      title: 'Source Node',
      outputs: ['value'],
    } as AiNode;
    const blockedNode = {
      ...buildFailingNode('handler_blocked'),
      id: 'node-blocked',
      title: 'Blocked Node',
      inputs: ['value'],
      outputs: ['result'],
    } as AiNode;
    const downstreamNode = {
      ...buildFailingNode('downstream_observer'),
      id: 'node-downstream',
      title: 'Downstream Node',
      inputs: ['result'],
      outputs: ['value'],
    } as AiNode;
    const downstreamHandler = vi.fn(async () => ({ value: 'should-not-run' }));
    const onHalt = vi.fn();

    const runtime = await evaluateGraphInternal(
      [sourceNode, blockedNode, downstreamNode],
      [
        {
          id: 'edge-source-blocked',
          from: sourceNode.id,
          to: blockedNode.id,
          fromPort: 'value',
          toPort: 'value',
        },
        {
          id: 'edge-blocked-downstream',
          from: blockedNode.id,
          to: downstreamNode.id,
          fromPort: 'result',
          toPort: 'result',
        },
      ] satisfies Edge[],
      {
        resolveHandler: (nodeType) => {
          if (nodeType === 'source_ready') {
            return async () => ({ value: 'ready' });
          }
          if (nodeType === 'handler_blocked') {
            return async () => ({
              status: 'blocked',
              reason: 'missing_prompt',
              blockedReason: 'missing_prompt',
              waitingOnPorts: ['prompt'],
            });
          }
          if (nodeType === 'downstream_observer') {
            return downstreamHandler;
          }
          return null;
        },
        onHalt,
        reportAiPathsError: (): void => {},
      }
    );

    expect(runtime.status).toBe('running');
    expect(runtime.nodeStatuses[sourceNode.id]).toBe('completed');
    expect(runtime.nodeStatuses[blockedNode.id]).toBe('blocked');
    expect(runtime.nodeOutputs[blockedNode.id]).toEqual(
      expect.objectContaining({
        status: 'blocked',
        blockedReason: 'missing_prompt',
      })
    );
    expect(runtime.nodeStatuses[downstreamNode.id]).toBe('waiting_callback');
    expect(runtime.nodeOutputs[downstreamNode.id]).toEqual(
      expect.objectContaining({
        status: 'waiting_callback',
        blockedReason: 'missing_inputs',
      })
    );
    expect(downstreamHandler).not.toHaveBeenCalled();
    expect(onHalt).toHaveBeenCalledTimes(1);
    expect(onHalt).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'blocked',
      })
    );
  });
});

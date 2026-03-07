import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

const buildHttpNode = (): AiNode =>
  ({
    id: 'node-http',
    type: 'http',
    title: 'HTTP Node',
    description: '',
    inputs: ['url'],
    outputs: ['value'],
    config: {
      runtime: {
        sideEffectPolicy: 'per_activation',
        cache: {
          scope: 'activation',
        },
      },
      http: {
        url: 'https://example.test/items',
        method: 'GET',
        headers: '{}',
        bodyTemplate: '',
        responseMode: 'json',
        responsePath: '',
      },
    },
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('engine-core side-effect history', () => {
  it('records effect metadata for executed effect nodes', async () => {
    const node = buildHttpNode();
    const onNodeFinish = vi.fn();
    let handlerContext: NodeHandlerContext | null = null;

    const result = await evaluateGraphInternal([node], [] satisfies Edge[], {
      resolveHandler: () => async (context) => {
        handlerContext = context;
        return { value: 'ok' };
      },
      onNodeFinish,
      recordHistory: true,
      reportAiPathsError: (): void => {},
    });

    expect(handlerContext?.sideEffectControl).toMatchObject({
      policy: 'per_activation',
      decision: 'executed',
      activationHash: expect.any(String),
      idempotencyKey: expect.any(String),
    });
    expect(onNodeFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        node,
        cacheDecision: 'miss',
        sideEffectPolicy: 'per_activation',
        sideEffectDecision: 'executed',
        activationHash: expect.any(String),
        idempotencyKey: expect.any(String),
      })
    );

    const historyEntry = result.history?.[node.id]?.[0];
    expect(historyEntry).toMatchObject({
      traceId: expect.stringContaining('run_'),
      spanId: 'node-http:1:1',
      sideEffectPolicy: 'per_activation',
      sideEffectDecision: 'executed',
      cacheDecision: 'miss',
      idempotencyKey: expect.any(String),
    });
  });

  it('records seeded effect reuse with source span provenance', async () => {
    const node = buildHttpNode();
    const handler = vi.fn(async () => ({ value: 'ok' }));

    const first = await evaluateGraphInternal([node], [] satisfies Edge[], {
      runId: 'run-http-1',
      resolveHandler: () => handler,
      recordHistory: true,
      reportAiPathsError: (): void => {},
    });

    const onNodeFinish = vi.fn();
    const second = await evaluateGraphInternal([node], [] satisfies Edge[], {
      runId: 'run-http-2',
      resolveHandler: () => handler,
      seedOutputs: first.outputs,
      seedHashes: first.hashes,
      seedHistory: first.history,
      onNodeFinish,
      recordHistory: true,
      reportAiPathsError: (): void => {},
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(onNodeFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        node,
        cached: true,
        cacheDecision: 'seed',
        sideEffectPolicy: 'per_activation',
        sideEffectDecision: 'skipped_duplicate',
        effectSourceSpanId: first.history?.[node.id]?.[0]?.spanId,
      })
    );

    const historyEntry = second.history?.[node.id]?.[0];
    expect(historyEntry).toMatchObject({
      spanId: 'node-http:2:1',
      sideEffectPolicy: 'per_activation',
      sideEffectDecision: 'skipped_duplicate',
      cacheDecision: 'seed',
      effectSourceSpanId: first.history?.[node.id]?.[0]?.spanId,
    });
    expect(historyEntry?.spanId).not.toBe(first.history?.[node.id]?.[0]?.spanId);
  });
});

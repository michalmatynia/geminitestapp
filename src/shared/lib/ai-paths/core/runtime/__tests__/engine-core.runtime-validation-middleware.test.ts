import { describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const buildNode = (): AiNode =>
  ({
    id: 'node-1',
    type: 'custom',
    title: 'Custom Node',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {},
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('engine-core runtime validation middleware', () => {
  it('blocks a node when node_pre_execute validation returns block', async () => {
    const node = buildNode();
    const onNodeBlocked = vi.fn();
    const onNodeError = vi.fn();

    let result: Awaited<ReturnType<typeof evaluateGraphInternal>> | null = null;
    let thrown: unknown = null;
    try {
      result = await evaluateGraphInternal([node], [] satisfies Edge[], {
        resolveHandler: () => async () => ({ value: 'ok' }),
        validationMiddleware: ({ stage }) =>
          stage === 'node_pre_execute'
            ? {
                decision: 'block',
                message: 'node pre-execute blocked',
              }
            : null,
        recordHistory: true,
        onNodeBlocked,
        onNodeError,
        reportAiPathsError: (): void => {},
      });
    } catch (error) {
      logClientError(error);
      thrown = error;
    }

    if (result) {
      expect(result.nodeOutputs[node.id]).toMatchObject({
        status: 'blocked',
        blockedReason: 'validation',
        message: 'node pre-execute blocked',
      });
      expect(result.history?.[node.id]?.[0]).toEqual(
        expect.objectContaining({
          traceId: expect.stringContaining('run_'),
          spanId: 'node-1:1:1',
          attempt: 1,
          error: 'node pre-execute blocked',
        })
      );
    }
    if (thrown) {
      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).message).toContain('node pre-execute blocked');
    }

    expect(onNodeBlocked).toHaveBeenCalledWith(
      expect.objectContaining({
        node,
        reason: 'validation',
        status: 'blocked',
        message: 'node pre-execute blocked',
      })
    );
    expect(onNodeError).not.toHaveBeenCalled();
  });

  it('emits runtime validation warnings and continues execution', async () => {
    const node = buildNode();
    const onRuntimeValidation = vi.fn();

    const result = await evaluateGraphInternal([node], [] satisfies Edge[], {
      resolveHandler: () => async () => ({ value: 'ok' }),
      validationMiddleware: ({ stage }) =>
        stage === 'node_post_execute'
          ? {
              decision: 'warn',
              message: 'node post-execute warning',
              issues: [
                {
                  stage,
                  message: 'warn issue',
                },
              ],
            }
          : null,
      onRuntimeValidation,
      reportAiPathsError: (): void => {},
    });

    expect(result.nodeOutputs[node.id]?.['value']).toBe('ok');
    expect(onRuntimeValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'node_post_execute',
        decision: 'warn',
      })
    );
  });

  it('blocks before execution when graph_parse validation returns block', async () => {
    const node = buildNode();
    const onNodeStart = vi.fn();

    await expect(
      evaluateGraphInternal([node], [] satisfies Edge[], {
        resolveHandler: () => async () => ({ value: 'ok' }),
        validationMiddleware: ({ stage }) =>
          stage === 'graph_parse'
            ? {
                decision: 'block',
                message: 'graph parse blocked',
              }
            : null,
        onNodeStart,
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow('graph parse blocked');

    expect(onNodeStart).not.toHaveBeenCalled();
  });

  it('blocks a node after execution when node_post_execute validation returns block', async () => {
    const node = buildNode();
    const onNodeFinish = vi.fn();
    const onNodeBlocked = vi.fn();

    let result: Awaited<ReturnType<typeof evaluateGraphInternal>> | null = null;
    let thrown: unknown = null;
    try {
      result = await evaluateGraphInternal([node], [] satisfies Edge[], {
        resolveHandler: () => async () => ({ value: 'ok' }),
        validationMiddleware: ({ stage }) =>
          stage === 'node_post_execute'
            ? {
                decision: 'block',
                message: 'node post-execute blocked',
              }
            : null,
        recordHistory: true,
        onNodeFinish,
        onNodeBlocked,
        reportAiPathsError: (): void => {},
      });
    } catch (error) {
      logClientError(error);
      thrown = error;
    }

    if (result) {
      expect(result.nodeOutputs[node.id]).toMatchObject({
        status: 'blocked',
        blockedReason: 'validation',
        message: 'node post-execute blocked',
      });
      expect(result.history?.[node.id]?.[0]).toEqual(
        expect.objectContaining({
          traceId: expect.stringContaining('run_'),
          spanId: 'node-1:1:1',
          attempt: 1,
          error: 'node post-execute blocked',
        })
      );
    }
    if (thrown) {
      expect(thrown).toBeInstanceOf(Error);
      expect((thrown as Error).message).toContain('node post-execute blocked');
    }

    expect(onNodeFinish).not.toHaveBeenCalled();
    expect(onNodeBlocked).toHaveBeenCalledWith(
      expect.objectContaining({
        node,
        reason: 'validation',
        status: 'blocked',
        message: 'node post-execute blocked',
      })
    );
  });
});

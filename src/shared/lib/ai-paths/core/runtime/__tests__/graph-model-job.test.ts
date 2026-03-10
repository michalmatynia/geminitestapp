import { describe, expect, it } from 'vitest';

import {
  buildGraphModelJobCacheMetadata,
  buildGraphModelJobEnqueueRequest,
  buildGraphModelJobPayload,
  buildGraphModelQueuedPayload,
  readEnqueuedGraphModelJobId,
} from '@/shared/lib/ai-paths/core/runtime/graph-model-job';

describe('buildGraphModelJobPayload', () => {
  it('mirrors a node-selected model into both top-level modelId and graph.requestedModelId', () => {
    const payload = buildGraphModelJobPayload({
      prompt: 'Generate title',
      modelId: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 256,
      vision: false,
      activePathId: 'path-1',
      nodeId: 'node-1',
      nodeTitle: 'Model',
      runId: 'run-1',
    });

    expect(payload).toMatchObject({
      prompt: 'Generate title',
      modelId: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 256,
      vision: false,
      source: 'ai_paths',
      graph: {
        pathId: 'path-1',
        nodeId: 'node-1',
        nodeTitle: 'Model',
        requestedModelId: 'gpt-4o-mini',
        runId: 'run-1',
      },
    });
  });

  it('omits requested model fields when the node does not select a model', () => {
    const payload = buildGraphModelJobPayload({
      prompt: 'Generate title',
      modelId: '   ',
      activePathId: 'path-1',
      nodeId: 'node-1',
      runId: 'run-1',
    });

    expect(payload.modelId).toBeUndefined();
    expect(payload.graph?.requestedModelId).toBeUndefined();
  });

  it('preserves extra payload data for preview-only context', () => {
    const payload = buildGraphModelJobPayload({
      prompt: 'Generate title',
      nodeId: 'node-1',
      runId: 'run-1',
      extraPayload: {
        context: {
          productId: 'product-1',
        },
      },
    });

    expect(payload).toMatchObject({
      context: {
        productId: 'product-1',
      },
    });
  });

  it('builds the typed graph_model enqueue envelope', () => {
    const payload = buildGraphModelJobPayload({
      prompt: 'Generate title',
      nodeId: 'node-1',
      runId: 'run-1',
    });

    expect(
      buildGraphModelJobEnqueueRequest({
        productId: 'product-1',
        payload,
      })
    ).toEqual({
      productId: 'product-1',
      type: 'graph_model',
      payload,
    });
  });

  it('builds stable cache metadata for graph_model payloads', () => {
    const payload = buildGraphModelJobPayload({
      prompt: 'Generate title',
      modelId: 'gpt-4o-mini',
      nodeId: 'node-1',
      runId: 'run-1',
    });

    expect(
      buildGraphModelJobCacheMetadata({
        payload,
        runId: 'run-1',
      })
    ).toEqual({
      cacheKey: expect.any(String),
      payloadHash: expect.any(String),
    });
  });

  it('adds cacheKey and payloadHash to the queued graph_model payload', () => {
    const payload = buildGraphModelJobPayload({
      prompt: 'Generate title',
      modelId: 'gpt-4o-mini',
      nodeId: 'node-1',
      runId: 'run-1',
    });

    expect(
      buildGraphModelQueuedPayload({
        payload,
        runId: 'run-1',
      })
    ).toMatchObject({
      prompt: 'Generate title',
      cacheKey: expect.any(String),
      payloadHash: expect.any(String),
      graph: {
        requestedModelId: 'gpt-4o-mini',
      },
    });
  });

  it('reads a validated enqueued graph job id and rejects missing ids', () => {
    expect(readEnqueuedGraphModelJobId({ data: { jobId: ' job-1 ' } })).toBe('job-1');
    expect(() => readEnqueuedGraphModelJobId({ data: {} })).toThrow(
      'AI job enqueue response did not include a valid job id.'
    );
  });
});

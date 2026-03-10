import { describe, expect, it } from 'vitest';

import {
  hasAiPathsGraphModelNodeContext,
  isAiPathsGraphModelPayload,
  normalizeGraphModelPayloadForDispatch,
  readGraphModelAiPathsRunContext,
  readGraphModelPayloadGraphString,
  resolveGraphModelCacheKey,
  resolveGraphModelPayloadHash,
  resolveGraphModelPayloadSource,
  resolveGraphModelRequestedModelId,
  safeParseGraphModelJobEnqueuePayload,
  summarizeGraphModelPayload,
} from '@/shared/lib/products/services/product-ai-graph-model-payload';

describe('product-ai graph_model payload helpers', () => {
  it('prefers graph.requestedModelId over top-level and graph fallback model ids', () => {
    const payload = {
      modelId: 'top-level-model',
      graph: {
        requestedModelId: 'node-selected-model',
        modelId: 'graph-model',
      },
    };

    expect(resolveGraphModelRequestedModelId(payload)).toBe('node-selected-model');
  });

  it('falls back to top-level modelId and graph.modelId when requestedModelId is missing', () => {
    expect(resolveGraphModelRequestedModelId({ modelId: 'top-level-model' })).toBe(
      'top-level-model'
    );
    expect(resolveGraphModelRequestedModelId({ graph: { modelId: 'graph-model' } })).toBe(
      'graph-model'
    );
  });

  it('reads cache metadata safely from graph_model payloads', () => {
    expect(resolveGraphModelCacheKey({ cacheKey: '  cache-key-1  ' })).toBe('cache-key-1');
    expect(resolveGraphModelPayloadHash({ payloadHash: '  hash-1  ' })).toBe('hash-1');
    expect(resolveGraphModelCacheKey(null)).toBeNull();
    expect(resolveGraphModelPayloadHash(null)).toBeNull();
  });

  it('reads trimmed graph string metadata safely', () => {
    expect(readGraphModelPayloadGraphString({ graph: { nodeId: '  node-1  ' } }, 'nodeId')).toBe(
      'node-1'
    );
    expect(readGraphModelPayloadGraphString(null, 'nodeId')).toBe('');
  });

  it('reads AI Paths run context from graph metadata', () => {
    expect(
      readGraphModelAiPathsRunContext({
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
          nodeTitle: 'Model node',
        },
      })
    ).toEqual({
      runId: 'run-1',
      nodeId: 'node-1',
      nodeTitle: 'Model node',
    });
  });

  it('detects whether AI Paths graph_model payload has both runId and nodeId', () => {
    expect(
      hasAiPathsGraphModelNodeContext({
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    ).toBe(true);
    expect(
      hasAiPathsGraphModelNodeContext({
        graph: {
          runId: 'run-1',
        },
      })
    ).toBe(false);
  });

  it('prefers explicit source and infers ai_paths from graph metadata when missing', () => {
    expect(resolveGraphModelPayloadSource({ source: 'custom_graph' })).toBe('custom_graph');
    expect(
      resolveGraphModelPayloadSource({
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    ).toBe('ai_paths');
  });

  it('returns null when no source or AI Paths graph markers are present', () => {
    expect(
      resolveGraphModelPayloadSource({
        prompt: 'Generate copy',
      })
    ).toBeNull();
  });

  it('detects AI Paths graph_model payloads from explicit or inferred source plus graph metadata', () => {
    expect(
      isAiPathsGraphModelPayload({
        source: 'ai_paths',
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    ).toBe(true);
    expect(
      isAiPathsGraphModelPayload({
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    ).toBe(true);
    expect(
      isAiPathsGraphModelPayload({
        source: 'custom_graph',
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    ).toBe(false);
  });

  it('normalizes legacy AI Paths payloads for dispatch by inferring source', () => {
    expect(
      normalizeGraphModelPayloadForDispatch({
        prompt: 'Generate copy',
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    ).toEqual(
      expect.objectContaining({
        prompt: 'Generate copy',
        source: 'ai_paths',
        cacheKey: expect.any(String),
        payloadHash: expect.any(String),
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    );
  });

  it('rejects malformed graph_model dispatch payloads', () => {
    expect(() =>
      normalizeGraphModelPayloadForDispatch({
        prompt: 'Generate copy',
        graph: 'bad-graph',
      })
    ).toThrow();
  });

  it('rejects graph_model dispatch payloads without a non-empty prompt', () => {
    expect(() =>
      normalizeGraphModelPayloadForDispatch({
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    ).toThrow();

    expect(() =>
      normalizeGraphModelPayloadForDispatch({
        prompt: '   ',
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    ).toThrow();
  });

  it('safe-parses strict graph_model enqueue payloads without inferring source', () => {
    expect(
      safeParseGraphModelJobEnqueuePayload({
        prompt: 'Generate copy',
        source: 'ai_paths',
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      }).success
    ).toBe(true);

    expect(
      safeParseGraphModelJobEnqueuePayload({
        prompt: 'Generate copy',
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      }).success
    ).toBe(false);
  });

  it('summarizes graph_model payloads through the shared helper', () => {
    expect(
      summarizeGraphModelPayload({
        prompt: 'Generate collectible copy',
        imageUrls: ['a', 'b'],
        modelId: 'top-level-model',
        vision: true,
        cacheKey: '1234567890abcdef',
        payloadHash: 'fedcba0987654321',
        graph: {
          requestedModelId: 'node-selected-model',
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    ).toEqual({
      source: 'ai_paths',
      modelId: 'top-level-model',
      requestedModelId: 'node-selected-model',
      vision: true,
      promptLength: 25,
      imageCount: 2,
      cacheKey: '1234567890ab',
      payloadHash: 'fedcba098765',
    });
  });
});

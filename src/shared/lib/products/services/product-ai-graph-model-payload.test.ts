import { describe, expect, it } from 'vitest';

import {
  readGraphModelAiPathsRunContext,
  readGraphModelPayloadGraphString,
  resolveGraphModelPayloadSource,
  resolveGraphModelRequestedModelId,
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
});

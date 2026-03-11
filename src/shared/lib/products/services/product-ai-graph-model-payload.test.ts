import { beforeEach, describe, expect, it, vi } from 'vitest';

let buildGraphModelJobCacheMetadata: typeof import('@/shared/lib/ai-paths/core/runtime/graph-model-job').buildGraphModelJobCacheMetadata;
let resolveAiPathsGraphModelRequestedModelId: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveAiPathsGraphModelRequestedModelId;
let resolveAiPathsGraphModelNodeSnapshotFromExecutionContext: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveAiPathsGraphModelNodeSnapshotFromExecutionContext;
let resolveAiPathsGraphModelRequestedModelIdFromExecutionContext: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveAiPathsGraphModelRequestedModelIdFromExecutionContext;
let hasAiPathsGraphModelNodeContext: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').hasAiPathsGraphModelNodeContext;
let isAiPathsGraphModelPayload: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').isAiPathsGraphModelPayload;
let matchesGraphModelReuseIdentity: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').matchesGraphModelReuseIdentity;
let normalizeGraphModelPayloadForDispatch: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').normalizeGraphModelPayloadForDispatch;
let prepareGraphModelDispatchJob: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').prepareGraphModelDispatchJob;
let prepareGraphModelEnqueuePayload: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').prepareGraphModelEnqueuePayload;
let prepareGraphModelEnqueuePayloadOrThrow: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').prepareGraphModelEnqueuePayloadOrThrow;
let resolveGraphModelEnqueueInspection: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelEnqueueInspection;
let resolveGraphModelDispatchInspection: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelDispatchInspection;
let prepareGraphModelExecutionInput: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').prepareGraphModelExecutionInput;
let readGraphModelAiPathsRunContext: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').readGraphModelAiPathsRunContext;
let readGraphModelPayloadGraphString: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').readGraphModelPayloadGraphString;
let resolveGraphModelExecutionInspection: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelExecutionInspection;
let resolveGraphModelExecutionPayload: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelExecutionPayload;
let resolveGraphModelExecutionContext: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelExecutionContext;
let resolveGraphModelCacheKey: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelCacheKey;
let resolveGraphModelPayloadInspection: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelPayloadInspection;
let resolveGraphModelPayloadHash: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelPayloadHash;
let resolveGraphModelPayloadSource: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelPayloadSource;
let resolveGraphModelSummaryInspection: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelSummaryInspection;
let resolveGraphModelReuseIdentity: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelReuseIdentity;
let resolveGraphModelRequestedModelId: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').resolveGraphModelRequestedModelId;
let safeParseGraphModelJobEnqueuePayload: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').safeParseGraphModelJobEnqueuePayload;
let safeParseGraphModelQueuedPayload: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').safeParseGraphModelQueuedPayload;
let summarizeGraphModelPayload: typeof import('@/shared/lib/products/services/product-ai-graph-model-payload').summarizeGraphModelPayload;

beforeEach(async () => {
  vi.resetModules();

  ({ buildGraphModelJobCacheMetadata } = await import(
    '@/shared/lib/ai-paths/core/runtime/graph-model-job'
  ));

  ({
    resolveAiPathsGraphModelRequestedModelId,
    resolveAiPathsGraphModelNodeSnapshotFromExecutionContext,
    resolveAiPathsGraphModelRequestedModelIdFromExecutionContext,
    hasAiPathsGraphModelNodeContext,
    isAiPathsGraphModelPayload,
    matchesGraphModelReuseIdentity,
    normalizeGraphModelPayloadForDispatch,
    prepareGraphModelDispatchJob,
    prepareGraphModelEnqueuePayload,
    prepareGraphModelEnqueuePayloadOrThrow,
    resolveGraphModelEnqueueInspection,
    resolveGraphModelDispatchInspection,
    prepareGraphModelExecutionInput,
    readGraphModelAiPathsRunContext,
    readGraphModelPayloadGraphString,
    resolveGraphModelExecutionInspection,
    resolveGraphModelExecutionPayload,
    resolveGraphModelExecutionContext,
    resolveGraphModelCacheKey,
    resolveGraphModelPayloadInspection,
    resolveGraphModelPayloadHash,
    resolveGraphModelPayloadSource,
    resolveGraphModelSummaryInspection,
    resolveGraphModelReuseIdentity,
    resolveGraphModelRequestedModelId,
    safeParseGraphModelJobEnqueuePayload,
    safeParseGraphModelQueuedPayload,
    summarizeGraphModelPayload,
  } = await import('@/shared/lib/products/services/product-ai-graph-model-payload'));
});

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

  it('reads graph_model payload inspection through one shared helper', () => {
    expect(
      resolveGraphModelPayloadInspection({
        cacheKey: '  cache-key-1  ',
        payloadHash: '  hash-1  ',
        graph: {
          requestedModelId: ' node-selected-model ',
          runId: ' run-1 ',
          nodeId: ' node-1 ',
          nodeTitle: ' Node title ',
        },
      })
    ).toEqual({
      source: 'ai_paths',
      requestedModelId: 'node-selected-model',
      cacheKey: 'cache-key-1',
      payloadHash: 'hash-1',
      runId: 'run-1',
      nodeId: 'node-1',
      nodeTitle: 'Node title',
      hasAiPathsNodeContext: true,
      isAiPathsGraphModelPayload: true,
      reuseIdentity: {
        cacheKey: 'cache-key-1',
        payloadHash: 'hash-1',
        requestedModelId: 'node-selected-model',
      },
    });
  });

  it('reads the graph_model reuse identity through one shared helper', () => {
    expect(
      resolveGraphModelReuseIdentity({
        cacheKey: '  cache-key-1  ',
        payloadHash: '  hash-1  ',
        graph: {
          requestedModelId: '  node-selected-model  ',
        },
      })
    ).toEqual({
      cacheKey: 'cache-key-1',
      payloadHash: 'hash-1',
      requestedModelId: 'node-selected-model',
    });
  });

  it('matches graph_model reuse identity through one shared helper', () => {
    expect(
      matchesGraphModelReuseIdentity({
        payload: {
          cacheKey: '  cache-key-1  ',
          payloadHash: '  hash-1  ',
          graph: {
            requestedModelId: '  node-selected-model  ',
          },
        },
        identity: {
          cacheKey: 'cache-key-1',
          payloadHash: 'hash-1',
          requestedModelId: 'node-selected-model',
        },
      })
    ).toBe(true);

    expect(
      matchesGraphModelReuseIdentity({
        payload: {
          cacheKey: 'cache-key-1',
          payloadHash: 'hash-1',
          graph: {
            requestedModelId: 'node-selected-model',
          },
        },
        identity: {
          cacheKey: 'cache-key-1',
          payloadHash: 'hash-1',
          requestedModelId: 'different-model',
        },
      })
    ).toBe(false);
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

  it('detects AI Paths graph_model payloads from strict schemas or legacy inferred node context', () => {
    expect(
      isAiPathsGraphModelPayload({
        prompt: 'Generate copy',
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
    expect(
      isAiPathsGraphModelPayload({
        prompt: 'Generate copy',
        source: 'ai_paths',
        graph: {},
      })
    ).toBe(false);
  });

  it('normalizes legacy AI Paths payloads for dispatch by inferring source', () => {
    const enqueuePayload = {
      prompt: 'Generate copy',
      source: 'ai_paths' as const,
      graph: {
        runId: 'run-1',
        nodeId: 'node-1',
      },
    };
    const expectedQueueMetadata = buildGraphModelJobCacheMetadata({
      payload: enqueuePayload,
      runId: 'run-1',
    });

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
        cacheKey: expectedQueueMetadata.cacheKey,
        payloadHash: expectedQueueMetadata.payloadHash,
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    );
  });

  it('preserves existing queue metadata when normalizing queued graph_model payloads', () => {
    const queuedPayload = {
      prompt: 'Generate copy',
      source: 'ai_paths' as const,
      cacheKey: 'cache-existing',
      payloadHash: 'hash-existing',
      graph: {
        runId: 'run-1',
        nodeId: 'node-1',
      },
    };

    expect(normalizeGraphModelPayloadForDispatch(queuedPayload)).toEqual(
      expect.objectContaining({
        cacheKey: 'cache-existing',
        payloadHash: 'hash-existing',
      })
    );
    expect(safeParseGraphModelQueuedPayload(queuedPayload).success).toBe(true);
  });

  it('prepares a graph_model dispatch job with normalized queued payload', () => {
    const prepared = prepareGraphModelDispatchJob({
      id: 'job-graph-model-1',
      type: 'graph_model' as const,
      payload: {
        prompt: 'Generate copy',
        graph: {
          runId: 'run-1',
          nodeId: 'node-1',
        },
      },
    });

    expect(prepared).toEqual(
      expect.objectContaining({
        id: 'job-graph-model-1',
        type: 'graph_model',
        payload: expect.objectContaining({
          prompt: 'Generate copy',
          source: 'ai_paths',
          cacheKey: expect.any(String),
          payloadHash: expect.any(String),
          graph: {
            runId: 'run-1',
            nodeId: 'node-1',
          },
        }),
      })
    );
  });

  it('reads graph_model dispatch normalization through one shared inspection helper', () => {
    const inspection = resolveGraphModelDispatchInspection({
      prompt: 'Generate copy',
      graph: {
        runId: 'run-1',
        nodeId: 'node-1',
      },
    });

    expect(inspection.error).toBeNull();
    expect(inspection.normalizedPayload).toEqual(
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

  it('prepares graph_model enqueue payloads in one shared pass', () => {
    const prepared = prepareGraphModelEnqueuePayload({
      prompt: 'Generate copy',
      source: 'ai_paths',
      graph: {
        runId: 'run-1',
        nodeId: 'node-1',
        requestedModelId: 'node-selected-model',
      },
    });

    expect(prepared.success).toBe(true);
    if (!prepared.success) {
      throw new Error('Expected graph_model payload to prepare successfully');
    }

    expect(prepared.payload).toEqual(
      expect.objectContaining({
        source: 'ai_paths',
        cacheKey: expect.any(String),
        payloadHash: expect.any(String),
      })
    );
    expect(prepared.reuseIdentity).toEqual({
      cacheKey: prepared.payload.cacheKey,
      payloadHash: prepared.payload.payloadHash,
      requestedModelId: 'node-selected-model',
    });
    expect(prepared.summary).toEqual(
      expect.objectContaining({
        source: 'ai_paths',
        requestedModelId: 'node-selected-model',
      })
    );
  });

  it('reads graph_model enqueue parsing and preparation through one shared inspection helper', () => {
    const inspection = resolveGraphModelEnqueueInspection({
      prompt: 'Generate copy',
      source: 'ai_paths',
      graph: {
        runId: 'run-1',
        nodeId: 'node-1',
        requestedModelId: 'node-selected-model',
      },
    });

    expect(inspection.error).toBeNull();
    expect(inspection.parsedPayload).toEqual(
      expect.objectContaining({
        source: 'ai_paths',
        prompt: 'Generate copy',
      })
    );
    expect(inspection.preparedPayload).toEqual(
      expect.objectContaining({
        success: true,
        payload: expect.objectContaining({
          source: 'ai_paths',
          cacheKey: expect.any(String),
          payloadHash: expect.any(String),
        }),
        reuseIdentity: {
          cacheKey: expect.any(String),
          payloadHash: expect.any(String),
          requestedModelId: 'node-selected-model',
        },
      })
    );
  });

  it('throws a badRequestError when graph_model enqueue payload preparation fails', () => {
    expect(() =>
      prepareGraphModelEnqueuePayloadOrThrow({
        payload: {
          prompt: 'Generate copy',
        },
        productId: 'product-1',
      })
    ).toThrow('Invalid graph_model payload');
  });

  it('resolves execution payloads by normalizing real AI Paths jobs', () => {
    const resolved = resolveGraphModelExecutionPayload({
      prompt: 'Generate copy',
      source: 'ai_paths',
      graph: {
        runId: 'run-1',
        nodeId: 'node-1',
      },
    });

    expect(resolved.source).toBe('ai_paths');
    expect(resolved.payload).toEqual(
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

  it('reads execution payload and context through one shared inspection helper', async () => {
    const { resolveGraphModelExecutionInspection: inspectExecutionPayload } = await import(
      '@/shared/lib/products/services/product-ai-graph-model-payload'
    );

    const resolved = inspectExecutionPayload({
      prompt: 'Generate copy',
      source: 'ai_paths',
      graph: {
        runId: 'run-1',
        nodeId: 'node-1',
        nodeTitle: 'Model node',
        requestedModelId: 'node-selected-model',
      },
    });

    expect(resolved).toEqual({
      executionPayload: {
        source: 'ai_paths',
        payload: expect.objectContaining({
          prompt: 'Generate copy',
          source: 'ai_paths',
          cacheKey: expect.any(String),
          payloadHash: expect.any(String),
          graph: {
            runId: 'run-1',
            nodeId: 'node-1',
            nodeTitle: 'Model node',
            requestedModelId: 'node-selected-model',
          },
        }),
      },
      executionContext: {
        source: 'ai_paths',
        requestedModelId: 'node-selected-model',
        runId: 'run-1',
        nodeId: 'node-1',
        nodeTitle: 'Model node',
        hasAiPathsNodeContext: true,
        payload: expect.objectContaining({
          source: 'ai_paths',
          cacheKey: expect.any(String),
          payloadHash: expect.any(String),
        }),
      },
    });
  });

  it('resolves malformed explicit-source payloads without normalizing them into AI Paths jobs', () => {
    const payload = {
      prompt: 'Generate copy',
      source: 'ai_paths',
      graph: {},
    };

    const resolved = resolveGraphModelExecutionPayload(payload);

    expect(resolved.source).toBe('ai_paths');
    expect(resolved.payload).toBe(payload);
  });

  it('resolves a shared execution context for real AI Paths graph_model payloads', () => {
    const resolved = resolveGraphModelExecutionContext({
      prompt: 'Generate copy',
      source: 'ai_paths',
      graph: {
        runId: 'run-1',
        nodeId: 'node-1',
        nodeTitle: 'Model node',
        requestedModelId: 'node-selected-model',
      },
    });

    expect(resolved).toEqual(
      expect.objectContaining({
        source: 'ai_paths',
        requestedModelId: 'node-selected-model',
        runId: 'run-1',
        nodeId: 'node-1',
        nodeTitle: 'Model node',
        hasAiPathsNodeContext: true,
        payload: expect.objectContaining({
          source: 'ai_paths',
          cacheKey: expect.any(String),
          payloadHash: expect.any(String),
        }),
      })
    );
  });

  it('resolves a shared execution context for malformed explicit-source payloads without upgrading them', () => {
    const payload = {
      prompt: 'Generate copy',
      source: 'ai_paths',
      graph: {},
    };

    expect(resolveGraphModelExecutionContext(payload)).toEqual({
      source: 'ai_paths',
      requestedModelId: null,
      runId: null,
      nodeId: null,
      nodeTitle: null,
      hasAiPathsNodeContext: false,
      payload,
    });
  });

  it('prepares graph_model execution input in one shared async step', async () => {
    await expect(
      prepareGraphModelExecutionInput({
        payload: {
          prompt: 'Generate copy',
          source: 'ai_paths',
          graph: {
            runId: 'run-1',
            nodeId: 'node-1',
          },
        },
        findRunById: async () => ({
          graph: {
            nodes: [
              {
                id: 'node-1',
                title: 'Recovered node title',
                config: {
                  model: {
                    modelId: 'fallback-model',
                  },
                },
              },
            ],
          },
        }),
      })
    ).resolves.toEqual(
      expect.objectContaining({
        source: 'ai_paths',
        rawPrompt: 'Generate copy',
        requestedModelId: 'fallback-model',
        aiPathsConfigErrorContext: {
          requestedModelId: 'fallback-model',
          runId: 'run-1',
          nodeId: 'node-1',
          nodeTitle: 'Recovered node title',
        },
        aiPathsNodeSnapshot: {
          requestedModelId: 'fallback-model',
          nodeTitle: 'Recovered node title',
        },
        payload: expect.objectContaining({
          source: 'ai_paths',
          cacheKey: expect.any(String),
          payloadHash: expect.any(String),
        }),
      })
    );
  });

  it('fails execution preparation when graph_model prompt is blank', async () => {
    await expect(
      prepareGraphModelExecutionInput({
        payload: {
          prompt: '   ',
          source: 'custom_graph',
        },
        jobId: 'job-3',
        findRunById: async () => null,
      })
    ).rejects.toThrow('Graph model job missing prompt');
  });

  it('fails execution preparation when graph_model source is missing', async () => {
    await expect(
      prepareGraphModelExecutionInput({
        payload: {
          prompt: 'Generate copy',
        },
        jobId: 'job-1',
        findRunById: async () => null,
      })
    ).rejects.toThrow('Graph model job missing source');
  });

  it('fails execution preparation when ai_paths payload lacks node context and requested model', async () => {
    await expect(
      prepareGraphModelExecutionInput({
        payload: {
          prompt: 'Generate copy',
          source: 'ai_paths',
          graph: {},
        },
        jobId: 'job-2',
        findRunById: async () => null,
      })
    ).rejects.toThrow(
      'AI Paths graph_model payload requires graph.runId and graph.nodeId when no requested model is provided.'
    );
  });

  it('resolves the requested AI Paths model id from graph context first and run fallback second', async () => {
    await expect(
      resolveAiPathsGraphModelRequestedModelId({
        payload: {
          prompt: 'Generate copy',
          source: 'ai_paths',
          graph: {
            runId: 'run-1',
            nodeId: 'node-1',
            requestedModelId: 'node-selected-model',
          },
        },
        findRunById: async () => ({
          graph: {
            nodes: [
              {
                id: 'node-1',
                config: {
                  model: {
                    modelId: 'fallback-model',
                  },
                },
              },
            ],
          },
        }),
      })
    ).resolves.toBe('node-selected-model');

    await expect(
      resolveAiPathsGraphModelRequestedModelId({
        payload: {
          prompt: 'Generate copy',
          source: 'ai_paths',
          graph: {
            runId: 'run-1',
            nodeId: 'node-1',
          },
        },
        findRunById: async () => ({
          graph: {
            nodes: [
              {
                id: 'node-1',
                config: {
                  model: {
                    modelId: 'fallback-model',
                  },
                },
              },
            ],
          },
        }),
      })
    ).resolves.toBe('fallback-model');
  });

  it('resolves the requested AI Paths model id without requiring worker-entry prompt validation', async () => {
    await expect(
      resolveAiPathsGraphModelRequestedModelId({
        payload: {
          source: 'ai_paths',
          graph: {
            runId: 'run-1',
            nodeId: 'node-1',
          },
        },
        findRunById: async () => ({
          graph: {
            nodes: [
              {
                id: 'node-1',
                config: {
                  model: {
                    modelId: 'fallback-model',
                  },
                },
              },
            ],
          },
        }),
      })
    ).resolves.toBe('fallback-model');
  });

  it('resolves the requested AI Paths model id directly from execution context without reparsing payload', async () => {
    await expect(
      resolveAiPathsGraphModelRequestedModelIdFromExecutionContext({
        executionContext: resolveGraphModelExecutionContext({
          prompt: 'Generate copy',
          source: 'ai_paths',
          graph: {
            runId: 'run-1',
            nodeId: 'node-1',
          },
        }),
        findRunById: async () => ({
          graph: {
            nodes: [
              {
                id: 'node-1',
                config: {
                  model: {
                    modelId: 'fallback-model',
                  },
                },
              },
            ],
          },
        }),
      })
    ).resolves.toBe('fallback-model');
  });

  it('resolves AI Paths node snapshot from execution context with recovered node title and model id', async () => {
    await expect(
      resolveAiPathsGraphModelNodeSnapshotFromExecutionContext({
        executionContext: resolveGraphModelExecutionContext({
          prompt: 'Generate copy',
          source: 'ai_paths',
          graph: {
            runId: 'run-1',
            nodeId: 'node-1',
          },
        }),
        findRunById: async () => ({
          graph: {
            nodes: [
              {
                id: 'node-1',
                title: 'Recovered node title',
                config: {
                  model: {
                    modelId: 'fallback-model',
                  },
                },
              },
            ],
          },
        }),
      })
    ).resolves.toEqual({
      requestedModelId: 'fallback-model',
      nodeTitle: 'Recovered node title',
    });
  });

  it('summarizes graph_model payloads through the shared helper', () => {
    expect(
      summarizeGraphModelPayload({
        prompt: '  Generate collectible copy  ',
        imageUrls: ['a', 17, 'b'],
        modelId: '  top-level-model  ',
        vision: true,
        cacheKey: ' 1234567890abcdef ',
        payloadHash: ' fedcba0987654321 ',
        graph: {
          requestedModelId: ' node-selected-model ',
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

  it('reads graph_model summaries through one shared inspection helper', () => {
    expect(
      resolveGraphModelSummaryInspection({
        prompt: '  Generate collectible copy  ',
        imageUrls: ['a', 17, 'b'],
        modelId: '  top-level-model  ',
        vision: true,
        cacheKey: ' 1234567890abcdef ',
        payloadHash: ' fedcba0987654321 ',
        graph: {
          requestedModelId: ' node-selected-model ',
          runId: 'run-1',
          nodeId: 'node-1',
        },
      })
    ).toEqual({
      summary: {
        source: 'ai_paths',
        modelId: 'top-level-model',
        requestedModelId: 'node-selected-model',
        vision: true,
        promptLength: 25,
        imageCount: 2,
        cacheKey: '1234567890ab',
        payloadHash: 'fedcba098765',
      },
    });
  });

  it('summarizes legacy AI Paths payloads through normalized queued metadata', () => {
    const payload = {
      prompt: '  Generate collectible copy  ',
      imageUrls: ['a', 17, 'b'],
      modelId: '  top-level-model  ',
      vision: true,
      graph: {
        requestedModelId: ' node-selected-model ',
        runId: 'run-1',
        nodeId: 'node-1',
      },
    } satisfies Record<string, unknown>;

    const normalized = normalizeGraphModelPayloadForDispatch(payload);

    expect(summarizeGraphModelPayload(payload)).toEqual({
      source: 'ai_paths',
      modelId: 'top-level-model',
      requestedModelId: 'node-selected-model',
      vision: true,
      promptLength: 25,
      imageCount: 2,
      cacheKey: normalized.cacheKey.slice(0, 12),
      payloadHash: normalized.payloadHash.slice(0, 12),
    });
  });

  it('does not summarize malformed explicit-source payloads as AI Paths jobs', () => {
    expect(
      summarizeGraphModelPayload({
        prompt: 'Generate collectible copy',
        source: 'ai_paths',
        graph: {},
      })
    ).toBeUndefined();
  });
});

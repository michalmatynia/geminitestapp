import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';

const {
  requireAiPathsRunAccessMock,
  enforceAiPathsRunRateLimitMock,
  getAiPathsSettingMock,
  enqueuePathRunMock,
  upsertAiPathsSettingsMock,
  assertAiPathRunQueueReadyForEnqueueMock,
  logSystemEventMock,
  contextRegistryResolveRefsMock,
  resolvePathRunRepositoryMock,
} = vi.hoisted(() => ({
  requireAiPathsRunAccessMock: vi.fn(),
  enforceAiPathsRunRateLimitMock: vi.fn(),
  getAiPathsSettingMock: vi.fn(),
  enqueuePathRunMock: vi.fn(),
  upsertAiPathsSettingsMock: vi.fn(),
  assertAiPathRunQueueReadyForEnqueueMock: vi.fn(),
  logSystemEventMock: vi.fn(),
  contextRegistryResolveRefsMock: vi.fn(),
  resolvePathRunRepositoryMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  enforceAiPathsRunRateLimit: enforceAiPathsRunRateLimitMock,
  getAiPathsSetting: getAiPathsSettingMock,
  enqueuePathRun: enqueuePathRunMock,
}));

vi.mock('@/features/jobs/server', () => ({
  assertAiPathRunQueueReadyForEnqueue: assertAiPathRunQueueReadyForEnqueueMock,
}));

vi.mock('@/features/ai/ai-paths/server/settings-store', () => ({
  upsertAiPathsSettings: upsertAiPathsSettingsMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    resolveRefs: contextRegistryResolveRefsMock,
  },
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  resolvePathRunRepository: resolvePathRunRepositoryMock,
}));

import { POST_handler } from './handler';

const makeRequest = (body: Record<string, unknown>): NextRequest =>
  new NextRequest('http://localhost/api/ai-paths/runs/enqueue', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

const parseResponseBody = async (response: Response): Promise<Record<string, unknown>> => {
  const bodyText = await response.text();
  const parsed: unknown = bodyText ? JSON.parse(bodyText) : {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object response body.');
  }
  return parsed;
};

const buildLegacyStoredTranslationConfig = () => {
  const entry = getStarterWorkflowTemplateById('starter_translation_en_pl');
  if (!entry) throw new Error('Missing starter_translation_en_pl entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path-stale-translation-v2',
    seededDefault: false,
  });

  return {
    ...config,
    name: 'Translation EN->PL Description + Parameters v2',
    trigger: 'Product Modal - Translate EN->PL (Desc+Params)',
    extensions: undefined,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type !== 'database') return node;
      const databaseConfig = node.config?.database;
      if (databaseConfig?.operation !== 'update') return node;
      return {
        ...node,
        config: {
          ...node.config,
          database: {
            ...databaseConfig,
            updatePayloadMode: 'custom',
            updateTemplate:
              '{\n  "$set": {\n    "description_pl": "{{value.description_pl}}",\n    "parameters": {{result.parameters}}\n  },\n  "$unset": {\n    "__noop__": ""\n  }\n}',
            mappings: [
              {
                targetPath: 'description_pl',
                sourcePort: 'value',
                sourcePath: 'description_pl',
              },
              {
                targetPath: 'parameters',
                sourcePort: 'result',
                sourcePath: 'parameters',
              },
            ],
          },
        },
      };
    }),
  };
};

const buildLegacyStoredParameterInferenceConfig = () => {
  const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
  if (!entry) throw new Error('Missing starter_parameter_inference entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path-stale-parameter-inference-v2',
    seededDefault: false,
  });

  return {
    ...config,
    name: 'Parameter Inference v2 No Param Add',
    trigger: 'Product Modal - Infer Parameters',
    extensions: undefined,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type === 'router' && node.id === 'node-router-seed-params') {
        return {
          ...node,
          inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
          outputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
        };
      }
      if (node.type === 'parser') {
        return {
          ...node,
          config: {
            ...node.config,
            parser: {
              ...node.config?.parser,
              mappings: {
                ...(node.config?.parser?.mappings ?? {}),
                title: '',
                content_en: '',
              },
            },
          },
        };
      }
      if (node.type === 'database') {
        const databaseConfig = node.config?.database;
        if (databaseConfig?.operation !== 'query') return node;
        return {
          ...node,
          config: {
            ...node.config,
            database: {
              ...databaseConfig,
              query: {
                ...databaseConfig.query,
                queryTemplate: '{\n  "catalogId": "{{bundle.catalogId}}"\n}',
              },
            },
          },
        };
      }
      return node;
    }),
  };
};

const buildProvenanceOnlyStoredParameterInferenceConfig = () => {
  const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
  if (!entry) throw new Error('Missing starter_parameter_inference entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path-stale-parameter-inference-provenance',
    seededDefault: false,
  });

  return {
    ...config,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type === 'router' && node.id === 'node-router-seed-params') {
        return {
          ...node,
          inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
          outputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
        };
      }
      return node;
    }),
    extensions: {
      aiPathsStarter: {
        starterKey: 'parameter_inference',
        templateId: 'starter_parameter_inference',
        templateVersion: 13,
        seededDefault: false,
      },
    },
  };
};

const buildMappingModeStoredParameterInferenceConfig = () => {
  const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
  if (!entry) throw new Error('Missing starter_parameter_inference entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path-stale-parameter-inference-mapping-live',
    seededDefault: false,
  });

  return {
    ...config,
    name: 'Parameter Inference v2 No Param Add',
    trigger: 'Product Modal - Infer Parameters',
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type !== 'database') return node;
      const databaseConfig = node.config?.database;
      if (databaseConfig?.operation !== 'update') return node;
      return {
        ...node,
        config: {
          ...node.config,
          database: {
            ...databaseConfig,
            updatePayloadMode: 'mapping',
            updateTemplate: '',
            mappings: [
              {
                sourcePath: 'parameters',
                sourcePort: 'value',
                targetPath: 'parameters',
              },
            ],
          },
        },
      };
    }),
    extensions: {
      aiPathsStarter: {
        starterKey: 'parameter_inference',
        templateId: 'starter_parameter_inference',
        templateVersion: 13,
        seededDefault: false,
      },
    },
  };
};

describe('ai-paths runs enqueue handler', () => {
  beforeEach(() => {
    vi.useRealTimers();
    requireAiPathsRunAccessMock.mockReset().mockResolvedValue({ userId: 'user-1' });
    enforceAiPathsRunRateLimitMock.mockReset().mockResolvedValue(undefined);
    getAiPathsSettingMock.mockReset().mockResolvedValue(null);
    enqueuePathRunMock.mockReset().mockResolvedValue({ id: 'run-1', status: 'queued' });
    upsertAiPathsSettingsMock.mockReset().mockResolvedValue(undefined);
    assertAiPathRunQueueReadyForEnqueueMock.mockReset().mockResolvedValue(undefined);
    logSystemEventMock.mockReset().mockResolvedValue(undefined);
    resolvePathRunRepositoryMock.mockReset().mockResolvedValue({
      provider: 'mongodb',
      routeMode: 'explicit',
      collection: 'ai_path_runs',
      repo: {},
    });
    contextRegistryResolveRefsMock.mockReset().mockResolvedValue({
      refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
      nodes: [
        {
          id: 'page:ai-paths',
          kind: 'page',
          name: 'AI Paths Canvas',
          description: 'AI Paths workspace',
          tags: ['ai-paths'],
          permissions: {
            readScopes: ['ctx:read'],
            riskTier: 'none',
            classification: 'internal',
          },
          version: '1.0.0',
          updatedAtISO: '2026-03-09T00:00:00.000Z',
          source: { type: 'code', ref: 'test' },
        },
      ],
      documents: [],
      truncated: false,
      engineVersion: 'registry:test',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects legacy node identities before enqueueing the run', async () => {
    const config = createDefaultPathConfig('path-legacy');
    const legacyNodeId = 'node-legacy-parser';
    const [firstNode, ...restNodes] = config.nodes;
    if (!firstNode) {
      throw new Error('Expected default path config to include at least one node.');
    }
    const nodes = [
      {
        ...firstNode,
        id: legacyNodeId,
        instanceId: legacyNodeId,
      },
      ...restNodes,
    ];
    const edges = config.edges.map((edge) =>
      edge.from === firstNode.id
        ? { ...edge, from: legacyNodeId }
        : edge.to === firstNode.id
          ? { ...edge, to: legacyNodeId }
          : edge
    );

    await expect(
      POST_handler(
        makeRequest({
          pathId: config.id,
          pathName: config.name,
          nodes,
          edges,
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/unsupported node identities/i);

    expect(enqueuePathRunMock).not.toHaveBeenCalled();
  });

  it('rejects invalid edges before enqueueing the run', async () => {
    const config = createDefaultPathConfig('path-invalid-edge');
    const [firstEdge, ...restEdges] = config.edges;
    if (!firstEdge) {
      throw new Error('Expected default path config to include at least one edge.');
    }
    const edges = [
      {
        ...firstEdge,
        to: 'node-missing001122334455667788',
      },
      ...restEdges,
    ];

    await expect(
      POST_handler(
        makeRequest({
          pathId: config.id,
          pathName: config.name,
          nodes: config.nodes,
          edges,
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/invalid or non-canonical edges/i);

    expect(enqueuePathRunMock).not.toHaveBeenCalled();
  });

  it('enqueues canonical graphs without identity repair metadata', async () => {
    const config = createDefaultPathConfig('path-canonical');

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        pathName: config.name,
        nodes: config.nodes,
        edges: config.edges,
        meta: {
          aiPathsValidation: {
            enabled: false,
          },
        },
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    await expect(parseResponseBody(response)).resolves.toEqual({
      run: { id: 'run-1', status: 'queued' },
      runId: 'run-1',
    });
    const enqueueArgs = enqueuePathRunMock.mock.calls[0]?.[0] as
      | {
        pathId?: string;
        pathName?: string;
        nodes?: unknown;
        edges?: unknown;
        meta?: Record<string, unknown>;
      }
      | undefined;
    expect(enqueueArgs).toEqual(
      expect.objectContaining({
        pathId: config.id,
        pathName: config.name,
        nodes: config.nodes,
        edges: config.edges,
      })
    );
    expect(enqueueArgs?.meta).not.toHaveProperty('identityRepair');
  });

  it('remediates removed legacy trigger context modes when loading stored path configs by pathId', async () => {
    const config = createDefaultPathConfig('path-legacy-trigger-mode');
    const seedNode = config.nodes[0];
    expect(seedNode).toBeDefined();
    if (!seedNode) return;
    config.nodes = [
      {
        ...seedNode,
        type: 'trigger',
        title: 'Trigger: Opis i Tytul',
        inputs: ['context'],
        outputs: ['trigger', 'context', 'entityId', 'entityType'],
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'simulation_preferred',
          },
        },
      },
    ];
    config.edges = [];
    getAiPathsSettingMock.mockResolvedValue(JSON.stringify(config));

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
      }),
      {} as Parameters<typeof POST_handler>[1]
    );
    expect(response.status).toBe(200);
    const enqueueArgs = enqueuePathRunMock.mock.calls[0]?.[0] as
      | { nodes?: Array<{ config?: { trigger?: { contextMode?: string } } }> }
      | undefined;
    expect(enqueueArgs?.nodes?.[0]?.config?.trigger?.contextMode).toBe('trigger_only');
  });

  it('repairs stale parameter inference v2 starter configs before enqueueing stored paths', async () => {
    const config = buildLegacyStoredParameterInferenceConfig();
    getAiPathsSettingMock.mockResolvedValue(JSON.stringify(config));

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        entityId: 'product-1',
        entityType: 'product',
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    const enqueueArgs = enqueuePathRunMock.mock.calls[0]?.[0] as
      | {
        nodes?: Array<{
          type?: string;
          config?: { parser?: { mappings?: Record<string, string> } };
        }>;
      }
      | undefined;
    const parserNode = enqueueArgs?.nodes?.find((node) => node.type === 'parser');
    expect(parserNode?.config?.parser?.mappings?.['title']).toBe('$.name_en');
    expect(parserNode?.config?.parser?.mappings?.['content_en']).toBe('$.description_en');
    expect(upsertAiPathsSettingsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        key: `ai_paths_config_${config.id}`,
      }),
    ]);
  });

  it('repairs stale parameter inference starter provenance on non-default path ids before enqueueing', async () => {
    const config = buildProvenanceOnlyStoredParameterInferenceConfig();
    getAiPathsSettingMock.mockResolvedValue(JSON.stringify(config));

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        entityId: 'product-1',
        entityType: 'product',
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(upsertAiPathsSettingsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        key: `ai_paths_config_${config.id}`,
      }),
    ]);
  });

  it('fully repairs stale parameter inference live configs that still use mapping-mode database updates', async () => {
    const config = buildMappingModeStoredParameterInferenceConfig();
    getAiPathsSettingMock.mockResolvedValue(JSON.stringify(config));

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        entityId: 'product-1',
        entityType: 'product',
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(upsertAiPathsSettingsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        key: `ai_paths_config_${config.id}`,
      }),
    ]);
    const repairedPayload = upsertAiPathsSettingsMock.mock.calls[0]?.[0]?.[0]?.value;
    expect(typeof repairedPayload).toBe('string');
    const repairedConfig = JSON.parse(repairedPayload as string) as {
      extensions?: {
        aiPathsStarter?: {
          templateVersion?: number;
        };
      };
      nodes?: Array<{
        type?: string;
        inputs?: string[];
        outputs?: string[];
      }>;
    };
    expect(repairedConfig.extensions?.aiPathsStarter?.templateVersion).toBe(16);
    const seedRouterNode = repairedConfig.nodes?.find((node) => node.type === 'router');
    expect(seedRouterNode).toBeDefined();
    expect(seedRouterNode?.inputs ?? []).not.toContain('prompt');
    expect(seedRouterNode?.outputs ?? []).not.toContain('prompt');
  });

  it('normalizes context registry payloads into enqueue metadata', async () => {
    const config = createDefaultPathConfig('path-with-context');

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        pathName: config.name,
        nodes: config.nodes,
        edges: config.edges,
        contextRegistry: {
          refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
          engineVersion: 'page-context:v1',
          resolved: {
            refs: [{ id: 'runtime:ai-paths:workspace', kind: 'runtime_document' }],
            nodes: [],
            documents: [
              {
                id: 'runtime:ai-paths:workspace',
                kind: 'runtime_document',
                entityType: 'ai_paths_workspace_state',
                title: 'AI Paths workspace state',
                summary: 'Live state',
                status: 'running',
                tags: ['ai-paths'],
                relatedNodeIds: ['page:ai-paths'],
                facts: { activePathId: config.id },
                sections: [],
                provenance: { source: 'test' },
              },
            ],
            truncated: false,
            engineVersion: 'page-context:v1',
          },
        },
        meta: {
          aiPathsValidation: {
            enabled: false,
          },
        },
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(contextRegistryResolveRefsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
        maxNodes: 24,
        depth: 1,
      })
    );
    const enqueueArgs = enqueuePathRunMock.mock.calls[0]?.[0] as
      | { meta?: Record<string, unknown> }
      | undefined;
    expect(enqueueArgs?.meta).toEqual(
      expect.objectContaining({
        contextRegistry: expect.objectContaining({
          refs: expect.arrayContaining([
            { id: 'page:ai-paths', kind: 'static_node' },
            { id: 'runtime:ai-paths:workspace', kind: 'runtime_document' },
          ]),
        }),
      })
    );
  });

  it('loads stored path config when nodes and edges are omitted', async () => {
    const config = createDefaultPathConfig('path-stored-config');
    getAiPathsSettingMock.mockResolvedValueOnce(JSON.stringify(config));

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        triggerEvent: 'manual',
        triggerNodeId: config.nodes.find((node) => node.type === 'trigger')?.id,
        meta: {
          aiPathsValidation: {
            enabled: false,
          },
        },
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(getAiPathsSettingMock).toHaveBeenCalledWith(`ai_paths_config_${config.id}`);
    const enqueueArgs = enqueuePathRunMock.mock.calls[0]?.[0] as
      | {
          pathId?: string;
          pathName?: string;
          nodes?: unknown[];
          edges?: unknown[];
          triggerEvent?: string | null;
        }
      | undefined;
    expect(enqueueArgs?.pathId).toBe(config.id);
    expect(enqueueArgs?.pathName).toBe(config.name);
    expect(enqueueArgs?.nodes).toHaveLength(config.nodes.length);
    expect(
      enqueueArgs?.nodes?.map((node) => (node as { id?: string }).id).sort()
    ).toEqual(config.nodes.map((node) => node.id).sort());
    expect(enqueueArgs?.edges).toHaveLength(config.edges.length);
    expect(
      enqueueArgs?.edges?.map((edge) => (edge as { id?: string }).id).sort()
    ).toEqual(config.edges.map((edge) => edge.id).sort());
    expect(enqueueArgs?.triggerEvent).toBe('manual');
    const logInvocation = logSystemEventMock.mock.calls[0]?.[0] as
      | { source?: string; context?: Record<string, unknown> }
      | undefined;
    expect(logInvocation?.source).toBe('ai-paths.runs.enqueue');
    expect(logInvocation?.context?.['graphSource']).toBe('settings');
  });

  it('derives runId from legacy _id run payloads', async () => {
    enqueuePathRunMock.mockResolvedValueOnce({ _id: 'run-legacy-1', status: 'queued' });
    const config = createDefaultPathConfig('path-canonical-legacy-id');

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        pathName: config.name,
        nodes: config.nodes,
        edges: config.edges,
        meta: {
          aiPathsValidation: {
            enabled: false,
          },
        },
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    await expect(parseResponseBody(response)).resolves.toEqual({
      run: { _id: 'run-legacy-1', status: 'queued' },
      runId: 'run-legacy-1',
    });
  });

  it('returns repository provider headers on successful enqueue responses', async () => {
    const config = createDefaultPathConfig('path-provider-headers');

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        pathName: config.name,
        nodes: config.nodes,
        edges: config.edges,
        meta: { aiPathsValidation: { enabled: false } },
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Ai-Paths-Run-Provider')).toBe('mongodb');
    expect(response.headers.get('X-Ai-Paths-Run-Route-Mode')).toBe('explicit');
  });

  it('rejects enqueue responses that do not expose any run identifier', async () => {
    enqueuePathRunMock.mockResolvedValueOnce({ status: 'queued' });
    const config = createDefaultPathConfig('path-canonical-missing-id');

    await expect(
      POST_handler(
        makeRequest({
          pathId: config.id,
          pathName: config.name,
          nodes: config.nodes,
          edges: config.edges,
          meta: {
            aiPathsValidation: {
              enabled: false,
            },
          },
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/missing run identifier/i);
  });

  it('rejects legacy object-shaped enqueue metadata source', async () => {
    const config = createDefaultPathConfig('path-legacy-meta-source');

    await expect(
      POST_handler(
        makeRequest({
          pathId: config.id,
          pathName: config.name,
          nodes: config.nodes,
          edges: config.edges,
          meta: {
            source: {
              tab: 'product',
            },
            triggerEventId: 'trigger_event_id',
          },
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/meta\.source must be a string/i);

    expect(enqueuePathRunMock).not.toHaveBeenCalled();
  });

  it('throws a 503 service unavailable when the queue readiness check times out', async () => {
    assertAiPathRunQueueReadyForEnqueueMock.mockRejectedValue(
      new Error('queue_preflight_timeout after 10000ms')
    );
    const config = createDefaultPathConfig('path-queue-timeout');

    await expect(
      POST_handler(
        makeRequest({
          pathId: config.id,
          pathName: config.name,
          nodes: config.nodes,
          edges: config.edges,
          meta: { aiPathsValidation: { enabled: false } },
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/queue readiness check timed out/i);

    expect(enqueuePathRunMock).not.toHaveBeenCalled();
  });

  it('re-throws non-timeout queue readiness errors without wrapping them as 503', async () => {
    const queueError = new Error('Redis connection refused');
    assertAiPathRunQueueReadyForEnqueueMock.mockRejectedValue(queueError);
    const config = createDefaultPathConfig('path-queue-error');

    await expect(
      POST_handler(
        makeRequest({
          pathId: config.id,
          pathName: config.name,
          nodes: config.nodes,
          edges: config.edges,
          meta: { aiPathsValidation: { enabled: false } },
        }),
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow('Redis connection refused');

    expect(enqueuePathRunMock).not.toHaveBeenCalled();
  });

  it('resolves runId from a runId field in the enqueue response', async () => {
    enqueuePathRunMock.mockResolvedValueOnce({ runId: 'run-runid-1', status: 'queued' });
    const config = createDefaultPathConfig('path-runid-field');

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        pathName: config.name,
        nodes: config.nodes,
        edges: config.edges,
        meta: { aiPathsValidation: { enabled: false } },
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    await expect(parseResponseBody(response)).resolves.toMatchObject({ runId: 'run-runid-1' });
  });

  it('repairs stale translation starter configs before enqueueing stored paths', async () => {
    const config = buildLegacyStoredTranslationConfig();
    getAiPathsSettingMock.mockResolvedValue(JSON.stringify(config));

    const response = await POST_handler(
      makeRequest({
        pathId: config.id,
        entityId: 'product-1',
        entityType: 'product',
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(upsertAiPathsSettingsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        key: `ai_paths_config_${config.id}`,
      }),
    ]);
  });
});

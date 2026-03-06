import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

const {
  mockDbApiSchema,
  mockAiGenerationGenerate,
  mockAiGenerationUpdateProductDescription,
  mockAgentEnqueue,
  mockAgentPoll,
  mockSettingsList,
  mockLearnerAgentsChat,
  mockPlaywrightEnqueue,
  mockPlaywrightPoll,
} = vi.hoisted(() => ({
  mockDbApiSchema: vi.fn(async () => ({
    ok: true as const,
    data: {
      provider: 'prisma',
      collections: [
        {
          name: 'products',
          fields: [
            {
              name: 'id',
              type: 'String',
              isId: true,
              isRequired: true,
              isUnique: true,
              hasDefault: false,
            },
          ],
          relations: ['categories'],
        },
      ],
    },
  })),
  mockAiGenerationGenerate: vi.fn(async () => ({
    ok: true as const,
    data: { result: 'generated-description' },
  })),
  mockAiGenerationUpdateProductDescription: vi.fn(async () => ({
    ok: true as const,
    data: {},
  })),
  mockAgentEnqueue: vi.fn(async () => ({
    ok: true as const,
    data: { runId: 'agent-run-1' },
  })),
  mockAgentPoll: vi.fn(async () => ({
    ok: true as const,
    data: {
      run: {
        id: 'agent-run-1',
        status: 'completed',
        errorMessage: null,
        logLines: ['done'],
      },
    },
  })),
  mockSettingsList: vi.fn(async () => ({
    ok: true as const,
    data: [],
  })),
  mockLearnerAgentsChat: vi.fn(async () => ({
    ok: true as const,
    data: { message: 'learner-response', sources: [{ id: 'source-1' }] },
  })),
  mockPlaywrightEnqueue: vi.fn(async () => ({
    ok: true as const,
    data: {
      run: {
        runId: 'pw-run-1',
        status: 'queued',
        result: null,
        error: null,
        artifacts: [],
        logs: [],
        startedAt: null,
        completedAt: null,
      },
    },
  })),
  mockPlaywrightPoll: vi.fn(async () => ({
    ok: true as const,
    data: {
      run: {
        runId: 'pw-run-1',
        status: 'completed',
        result: { outputs: { result: 'ok' } },
        error: null,
        artifacts: [],
        logs: [],
        startedAt: null,
        completedAt: null,
      },
    },
  })),
}));

vi.mock('@/shared/lib/ai-paths/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths/api')>(
    '@/shared/lib/ai-paths/api'
  );
  return {
    ...actual,
    dbApi: {
      ...actual.dbApi,
      schema: mockDbApiSchema,
    },
    aiGenerationApi: {
      ...actual.aiGenerationApi,
      generate: mockAiGenerationGenerate,
      updateProductDescription: mockAiGenerationUpdateProductDescription,
    },
    agentApi: {
      ...actual.agentApi,
      enqueue: mockAgentEnqueue,
      poll: mockAgentPoll,
    },
    settingsApi: {
      ...actual.settingsApi,
      list: mockSettingsList,
    },
    learnerAgentsApi: {
      ...actual.learnerAgentsApi,
      chat: mockLearnerAgentsChat,
    },
    playwrightNodeApi: {
      ...actual.playwrightNodeApi,
      enqueue: mockPlaywrightEnqueue,
      poll: mockPlaywrightPoll,
    },
  };
});

import type { AiNode } from '@/shared/contracts/ai-paths';
import {
  CLIENT_LEGACY_HANDLER_NODE_TYPES,
  CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS,
  evaluateGraphClient,
} from '@/shared/lib/ai-paths/core/runtime/engine-client';

type NodeCodeObjectContractEntry = {
  executionAdapter?: unknown;
  codeObjectId?: unknown;
};

const readNativeContractCodeObjectIdSet = (): Set<string> => {
  const contractsPath = path.join(
    process.cwd(),
    'docs',
    'ai-paths',
    'node-code-objects-v3',
    'contracts.json'
  );
  const payload = JSON.parse(readFileSync(contractsPath, 'utf8')) as {
    contracts?: Record<string, NodeCodeObjectContractEntry>;
  };
  const contracts = payload.contracts ?? {};
  const ids = Object.values(contracts)
    .filter(
      (entry: NodeCodeObjectContractEntry): boolean =>
        entry.executionAdapter === 'native_handler_registry' && typeof entry.codeObjectId === 'string'
    )
    .map((entry: NodeCodeObjectContractEntry): string => entry.codeObjectId as string);
  return new Set(ids);
};

const readNativeContractCodeObjectIdByNodeType = (): Map<string, string> => {
  const contractsPath = path.join(
    process.cwd(),
    'docs',
    'ai-paths',
    'node-code-objects-v3',
    'contracts.json'
  );
  const payload = JSON.parse(readFileSync(contractsPath, 'utf8')) as {
    contracts?: Record<string, NodeCodeObjectContractEntry>;
  };
  const contracts = payload.contracts ?? {};
  const entries = Object.entries(contracts)
    .filter(
      ([, entry]: [string, NodeCodeObjectContractEntry]): boolean =>
        entry.executionAdapter === 'native_handler_registry' && typeof entry.codeObjectId === 'string'
    )
    .map(([nodeType, entry]: [string, NodeCodeObjectContractEntry]): [string, string] => [
      nodeType,
      entry.codeObjectId as string,
    ]);
  return new Map(entries);
};

const buildUnsupportedModelNode = (): AiNode => ({
  id: 'node-model',
  type: 'model',
  title: 'Model',
  description: '',
  inputs: [],
  outputs: ['result'],
  config: {},
  position: { x: 0, y: 0 },
});

const buildPromptNode = (): AiNode => ({
  id: 'node-prompt',
  type: 'prompt',
  title: 'Prompt',
  description: '',
  inputs: [],
  outputs: ['prompt'],
  config: {
    prompt: {
      template: 'hello-from-prompt',
    },
  },
  position: { x: 0, y: 0 },
});

const buildAgentNode = (): AiNode => ({
  id: 'node-agent',
  type: 'agent',
  title: 'Agent',
  description: '',
  inputs: ['prompt'],
  outputs: ['result', 'jobId', 'status', 'bundle'],
  config: {
    agent: {
      personaId: '',
      promptTemplate: '',
      waitForResult: false,
    },
  },
  position: { x: 20, y: 0 },
});

const buildLearnerAgentNode = (): AiNode => ({
  id: 'node-learner-agent',
  type: 'learner_agent',
  title: 'Learner Agent',
  description: '',
  inputs: ['prompt'],
  outputs: ['result', 'sources', 'status', 'bundle'],
  config: {
    learnerAgent: {
      agentId: 'agent-1',
      promptTemplate: '',
      includeSources: true,
    },
  },
  position: { x: 40, y: 0 },
});

const buildTriggerNode = (): AiNode => ({
  id: 'node-trigger',
  type: 'trigger',
  title: 'Trigger',
  description: '',
  inputs: [],
  outputs: ['trigger', 'triggerName', 'context', 'entityJson'],
  config: {
    trigger: {
      event: 'manual',
    },
  },
  position: { x: 0, y: 0 },
});

const buildSimulationNode = (): AiNode => ({
  id: 'node-simulation',
  type: 'simulation',
  title: 'Simulation',
  description: '',
  inputs: ['trigger'],
  outputs: ['context', 'entityId', 'entityType', 'entityJson'],
  config: {},
  position: { x: 0, y: 0 },
});

const buildFetcherNode = (): AiNode => ({
  id: 'node-fetcher',
  type: 'fetcher',
  title: 'Fetcher',
  description: '',
  inputs: ['trigger', 'context'],
  outputs: ['context', 'meta', 'entityId', 'entityType'],
  config: {
    fetcher: {
      sourceMode: 'live_context',
    },
  },
  position: { x: 120, y: 0 },
});

const buildDbSchemaNode = (): AiNode => ({
  id: 'node-db-schema',
  type: 'db_schema',
  title: 'DB Schema',
  description: '',
  inputs: [],
  outputs: ['schema', 'context'],
  config: {
    db_schema: {
      mode: 'selected',
      collections: ['products'],
      includeFields: true,
      includeRelations: true,
      formatAs: 'text',
    },
  },
  position: { x: 160, y: 0 },
});

const buildAiDescriptionNode = (): AiNode => ({
  id: 'node-ai-description',
  type: 'ai_description',
  title: 'AI Description',
  description: '',
  inputs: ['entityJson', 'images'],
  outputs: ['description_en'],
  config: {
    description: {
      visionOutputEnabled: true,
      generationOutputEnabled: true,
    },
  },
  position: { x: 175, y: 0 },
});

const buildDescriptionUpdaterNode = (): AiNode => ({
  id: 'node-description-updater',
  type: 'description_updater',
  title: 'Description Updater',
  description: '',
  inputs: ['productId', 'description_en'],
  outputs: ['description_en'],
  config: {},
  position: { x: 182, y: 0 },
});

const buildPlaywrightNode = (): AiNode => ({
  id: 'node-playwright',
  type: 'playwright',
  title: 'Playwright',
  description: '',
  inputs: ['url', 'bundle', 'context'],
  outputs: ['result', 'jobId', 'screenshot', 'html'],
  config: {
    playwright: {
      script: '',
      waitForResult: true,
      timeoutMs: 120000,
      browserEngine: 'chromium',
      capture: {
        screenshot: false,
        html: false,
        video: false,
        trace: false,
      },
    },
  },
  position: { x: 186, y: 0 },
});

const buildConstantNode = (input: { id: string; value: unknown; title?: string }): AiNode => ({
  id: input.id,
  type: 'constant',
  title: input.title ?? 'Constant',
  description: '',
  inputs: [],
  outputs: ['value'],
  config: {
    constant: {
      value: input.value,
    },
  },
  position: { x: 170, y: 0 },
});

const buildApiAdvancedNode = (): AiNode => ({
  id: 'node-api-advanced',
  type: 'api_advanced',
  title: 'API Advanced',
  description: '',
  inputs: [],
  outputs: ['value', 'bundle', 'status', 'headers', 'items', 'route', 'error', 'success'],
  config: {
    apiAdvanced: {
      url: '',
      method: 'GET',
      pathParamsJson: '{}',
      queryParamsJson: '{}',
      headersJson: '{}',
      bodyTemplate: '',
      bodyMode: 'none',
      timeoutMs: 5000,
      authMode: 'none',
      responseMode: 'json',
      responsePath: '',
      outputMappingsJson: '{}',
      retryEnabled: false,
      retryAttempts: 1,
      paginationMode: 'none',
      paginationAggregateMode: 'first_page',
      errorRoutesJson: '[]',
    },
  },
  position: { x: 190, y: 0 },
});

const buildDatabaseNode = (): AiNode => ({
  id: 'node-database',
  type: 'database',
  title: 'Database',
  description: '',
  inputs: [],
  outputs: ['result', 'bundle', 'query', 'queryMode', 'querySource'],
  config: {
    database: {
      operation: 'query',
      query: {
        provider: 'auto',
        collection: 'products',
        mode: 'custom',
        preset: 'by_id',
        field: '_id',
        idType: 'string',
        queryTemplate: '',
        limit: 20,
        sort: '',
        sortPresetId: 'custom',
        projection: '',
        projectionPresetId: 'custom',
        single: false,
      },
    },
  },
  position: { x: 220, y: 0 },
});

const buildAudioOscillatorNode = (): AiNode => ({
  id: 'node-audio-oscillator',
  type: 'audio_oscillator',
  title: 'Audio Oscillator',
  description: '',
  inputs: ['trigger', 'frequency', 'waveform', 'gain', 'durationMs'],
  outputs: ['audioSignal', 'frequency', 'waveform', 'gain', 'durationMs', 'status'],
  config: {
    audioOscillator: {
      waveform: 'triangle',
      frequencyHz: 512,
      gain: 0.3,
      durationMs: 640,
    },
  },
  position: { x: 240, y: 0 },
});

const buildAudioSpeakerNode = (): AiNode => ({
  id: 'node-audio-speaker',
  type: 'audio_speaker',
  title: 'Audio Speaker',
  description: '',
  inputs: ['audioSignal', 'trigger'],
  outputs: ['status', 'audioSignal', 'frequency', 'waveform', 'gain', 'durationMs'],
  config: {
    audioSpeaker: {
      enabled: true,
      autoPlay: true,
      gain: 0.8,
      stopPrevious: true,
    },
  },
  position: { x: 360, y: 0 },
});

const buildHttpNode = (): AiNode => ({
  id: 'node-http',
  type: 'http',
  title: 'HTTP',
  description: '',
  inputs: ['url', 'body', 'headers', 'bundle'],
  outputs: ['value', 'bundle'],
  config: {
    http: {
      url: '',
      method: 'GET',
      headers: '{}',
      responseMode: 'json',
      responsePath: '',
    },
  },
  position: { x: 480, y: 0 },
});

const buildPollNode = (): AiNode => ({
  id: 'node-poll',
  type: 'poll',
  title: 'Poll',
  description: '',
  inputs: ['jobId'],
  outputs: ['result', 'status', 'jobId', 'bundle'],
  config: {
    poll: {
      intervalMs: 1000,
      maxAttempts: 2,
      mode: 'job',
    },
  },
  position: { x: 600, y: 0 },
});

describe('client native code-object registry contract subset', () => {
  it('only contains codeObjectIds that exist in native contracts', () => {
    const nativeContractIds = readNativeContractCodeObjectIdSet();

    expect(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS.length).toBeGreaterThan(0);
    CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS.forEach((codeObjectId: string) => {
      expect(nativeContractIds.has(codeObjectId)).toBe(true);
    });
  });

  it('covers all client-supported pilot node types with native mappings', () => {
    const byNodeType = readNativeContractCodeObjectIdByNodeType();
    const clientNativeIdSet = new Set<string>(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS);
    const missingNodeTypes = CLIENT_LEGACY_HANDLER_NODE_TYPES.filter((nodeType: string): boolean => {
      const contractCodeObjectId = byNodeType.get(nodeType);
      if (!contractCodeObjectId) return false;
      return !clientNativeIdSet.has(contractCodeObjectId);
    });

    expect(missingNodeTypes).toEqual([]);
  });

  it('tracks remaining server-only native node-type asymmetries explicitly', () => {
    const byNodeType = readNativeContractCodeObjectIdByNodeType();
    const clientNativeIdSet = new Set<string>(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS);

    const unsupportedOnClientNodeTypes = Array.from(byNodeType.entries())
      .filter(([, codeObjectId]: [string, string]) => !clientNativeIdSet.has(codeObjectId))
      .map(([nodeType]: [string, string]) => nodeType)
      .sort();

    expect(unsupportedOnClientNodeTypes).toEqual(['model']);
  });

  it('executes prompt nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildPromptNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['prompt'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-prompt']?.['prompt']).toBe('hello-from-prompt');
  });

  it('executes agent nodes through client native contract resolver mapping', async () => {
    mockSettingsList.mockClear();
    mockAgentEnqueue.mockClear();
    mockAgentPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [buildPromptNode(), buildAgentNode()],
      edges: [
        {
          id: 'edge-prompt-agent',
          from: 'node-prompt',
          to: 'node-agent',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelPilotNodeTypes: ['prompt', 'agent'],
      reportAiPathsError: (): void => {},
    });

    expect(mockSettingsList).toHaveBeenCalledTimes(1);
    expect(mockAgentEnqueue).toHaveBeenCalledTimes(1);
    expect(mockAgentEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'hello-from-prompt',
      })
    );
    expect(mockAgentPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-agent']?.['status']).toBe('queued');
    expect(result.outputs?.['node-agent']?.['jobId']).toBe('agent-run-1');
  });

  it('executes learner agent nodes through client native contract resolver mapping', async () => {
    mockLearnerAgentsChat.mockClear();

    const result = await evaluateGraphClient({
      nodes: [buildPromptNode(), buildLearnerAgentNode()],
      edges: [
        {
          id: 'edge-prompt-learner-agent',
          from: 'node-prompt',
          to: 'node-learner-agent',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelPilotNodeTypes: ['prompt', 'learner_agent'],
      reportAiPathsError: (): void => {},
    });

    expect(mockLearnerAgentsChat).toHaveBeenCalledTimes(1);
    expect(mockLearnerAgentsChat).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'agent-1',
      })
    );
    expect(result.outputs?.['node-learner-agent']?.['status']).toBe('completed');
    expect(result.outputs?.['node-learner-agent']?.['result']).toBe('learner-response');
    expect(result.outputs?.['node-learner-agent']?.['sources']).toEqual([{ id: 'source-1' }]);
  });

  it('executes trigger nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildTriggerNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['trigger'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-trigger']?.['trigger']).toBe(true);
    expect(result.outputs?.['node-trigger']?.['triggerName']).toBe('manual');
  });

  it('executes simulation nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildSimulationNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['simulation'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-simulation']?.['entityType']).toBe('product');
    expect(result.outputs?.['node-simulation']?.['context']).toMatchObject({
      contextSource: 'simulation',
      simulationNodeId: 'node-simulation',
      entityType: 'product',
    });
  });

  it('executes fetcher nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildTriggerNode(), buildFetcherNode()],
      edges: [
        {
          id: 'edge-trigger-fetcher',
          from: 'node-trigger',
          to: 'node-fetcher',
          fromPort: 'trigger',
          toPort: 'trigger',
          kind: 'signal',
        },
      ],
      runtimeKernelPilotNodeTypes: ['trigger', 'fetcher'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-fetcher']?.['context']).toMatchObject({
      contextSource: 'trigger_fetcher',
      fetcherNodeId: 'node-fetcher',
    });
    expect(result.outputs?.['node-fetcher']?.['meta']).toMatchObject({
      fetcherResolvedSource: 'live_context',
    });
  });

  it('executes db schema nodes through client native contract resolver mapping', async () => {
    mockDbApiSchema.mockClear();

    const result = await evaluateGraphClient({
      nodes: [buildDbSchemaNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['db_schema'],
      reportAiPathsError: (): void => {},
    });

    expect(mockDbApiSchema).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-db-schema']?.['schema']).toMatchObject({
      provider: 'prisma',
      collections: [{ name: 'products' }],
    });
    expect(result.outputs?.['node-db-schema']?.['context']).toMatchObject({
      provider: 'prisma',
    });
    expect(
      String(
        (result.outputs?.['node-db-schema']?.['context'] as Record<string, unknown> | undefined)?.[
          'schemaText'
        ] ?? ''
      )
    ).toContain('Collection: products');
  });

  it('executes ai description nodes through client native contract resolver mapping', async () => {
    mockAiGenerationGenerate.mockClear();
    const entityJsonNode = buildConstantNode({
      id: 'node-entity-json',
      title: 'Entity JSON',
      value: { id: 'product-42', imageLinks: [] },
    });

    const result = await evaluateGraphClient({
      nodes: [entityJsonNode, buildAiDescriptionNode()],
      edges: [
        {
          id: 'edge-entity-json-ai-description',
          from: 'node-entity-json',
          to: 'node-ai-description',
          fromPort: 'value',
          toPort: 'entityJson',
          kind: 'value',
        },
      ],
      runtimeKernelPilotNodeTypes: ['constant', 'ai_description'],
      reportAiPathsError: (): void => {},
    });

    expect(mockAiGenerationGenerate).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-ai-description']?.['description_en']).toBe('generated-description');
  });

  it('executes description updater nodes through client native contract resolver mapping', async () => {
    mockAiGenerationUpdateProductDescription.mockClear();

    const result = await evaluateGraphClient({
      nodes: [buildDescriptionUpdaterNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['description_updater'],
      reportAiPathsError: (): void => {},
    });

    expect(mockAiGenerationUpdateProductDescription).not.toHaveBeenCalled();
    expect(result.outputs?.['node-description-updater']).toEqual({});
  });

  it('executes playwright nodes through client native contract resolver mapping', async () => {
    mockPlaywrightEnqueue.mockClear();
    mockPlaywrightPoll.mockClear();

    const result = await evaluateGraphClient({
      nodes: [buildPromptNode(), buildPlaywrightNode()],
      edges: [
        {
          id: 'edge-prompt-playwright',
          from: 'node-prompt',
          to: 'node-playwright',
          fromPort: 'prompt',
          toPort: 'prompt',
          kind: 'value',
        },
      ],
      runtimeKernelPilotNodeTypes: ['prompt', 'playwright'],
      reportAiPathsError: (): void => {},
    });

    expect(mockPlaywrightEnqueue).not.toHaveBeenCalled();
    expect(mockPlaywrightPoll).not.toHaveBeenCalled();
    expect(result.outputs?.['node-playwright']?.['status']).toBe('failed');
    expect(result.outputs?.['node-playwright']?.['bundle']).toMatchObject({
      status: 'failed',
      error: 'Playwright script is empty.',
    });
  });

  it('executes api advanced nodes through client native contract resolver mapping', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await evaluateGraphClient({
        nodes: [buildApiAdvancedNode()],
        edges: [],
        runtimeKernelPilotNodeTypes: ['api_advanced'],
        reportAiPathsError: (): void => {},
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.outputs?.['node-api-advanced']?.['success']).toBe(false);
      expect(result.outputs?.['node-api-advanced']?.['status']).toBe(0);
      expect(result.outputs?.['node-api-advanced']?.['route']).toBe('missing_url');
      expect(result.outputs?.['node-api-advanced']?.['error']).toBe('Missing URL');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('executes database nodes through client native contract resolver mapping', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await evaluateGraphClient({
        nodes: [buildDatabaseNode()],
        edges: [],
        runtimeKernelPilotNodeTypes: ['database'],
        reportAiPathsError: (): void => {},
      });
      const bundle = result.outputs?.['node-database']?.['bundle'] as
        | Record<string, unknown>
        | undefined;

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.outputs?.['node-database']?.['result']).toBeNull();
      expect(bundle).toMatchObject({
        guardrail: 'query-resolution',
        querySource: 'customTemplate',
      });
      expect(String(bundle?.['error'] ?? '')).toContain('No explicit query provided.');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('executes audio oscillator nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildAudioOscillatorNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['audio_oscillator'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-audio-oscillator']?.['status']).toBe('ready');
    expect(result.outputs?.['node-audio-oscillator']?.['audioSignal']).toMatchObject({
      kind: 'oscillator',
      waveform: 'triangle',
      frequencyHz: 512,
    });
  });

  it('executes audio speaker nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildAudioOscillatorNode(), buildAudioSpeakerNode()],
      edges: [
        {
          id: 'edge-osc-speaker-audio-signal',
          from: 'node-audio-oscillator',
          to: 'node-audio-speaker',
          fromPort: 'audioSignal',
          toPort: 'audioSignal',
          kind: 'value',
        },
      ],
      runtimeKernelPilotNodeTypes: ['audio_oscillator', 'audio_speaker'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-audio-speaker']?.['status']).toBe('unsupported_environment');
    expect(result.outputs?.['node-audio-speaker']?.['audioSignal']).toMatchObject({
      kind: 'oscillator',
      waveform: 'triangle',
      frequencyHz: 512,
    });
  });

  it('executes http nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildHttpNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['http'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-http']?.['value']).toBeNull();
    expect(result.outputs?.['node-http']?.['bundle']).toMatchObject({
      ok: false,
      status: 0,
      error: 'Missing URL',
    });
  });

  it('executes poll nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildPollNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['poll'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-poll']).toEqual({});
  });

  it('keeps unsupported server-only nodes blocked in client execution', async () => {
    await expect(
      evaluateGraphClient({
        nodes: [buildUnsupportedModelNode()],
        edges: [],
        runtimeKernelPilotNodeTypes: ['model'],
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow(`Node type 'model' is not supported in client-side execution. Use Server execution.`);
  });
});

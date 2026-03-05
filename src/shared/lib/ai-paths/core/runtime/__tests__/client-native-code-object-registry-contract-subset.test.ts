import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

const { mockDbApiSchema } = vi.hoisted(() => ({
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

    expect(unsupportedOnClientNodeTypes).toEqual([
      'agent',
      'ai_description',
      'database',
      'description_updater',
      'learner_agent',
      'model',
      'playwright',
    ]);
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

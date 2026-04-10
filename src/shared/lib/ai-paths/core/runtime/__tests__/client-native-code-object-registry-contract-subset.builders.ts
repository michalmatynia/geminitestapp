import { readFileSync } from 'node:fs';
import path from 'node:path';

import { vi } from 'vitest';

const buildDbApiSchemaResponse = () => ({
  ok: true as const,
  data: {
    provider: 'mongodb',
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
});

const buildDbApiBrowseResponse = () => ({
  ok: true as const,
  data: {
    provider: 'mongodb' as const,
    collection: 'products',
    documents: [{ _id: 'prod-1', name_en: 'Desk Lamp' }],
    total: 1,
    limit: 20,
    skip: 0,
  },
});

const buildAiJobsEnqueueResponse = () => ({
  ok: true as const,
  data: { jobId: 'job-model-1' },
});

const buildAiJobsPollResponse = () => ({
  ok: true as const,
  data: {
    status: 'completed',
    result: 'model-result',
  },
});

const buildAgentEnqueueResponse = () => ({
  ok: true as const,
  data: { runId: 'agent-run-1' },
});

const buildAgentPollResponse = () => ({
  ok: true as const,
  data: {
    run: {
      id: 'agent-run-1',
      status: 'completed',
      errorMessage: null,
      logLines: ['done'],
    },
  },
});

const buildSettingsListResponse = () => ({
  ok: true as const,
  data: [],
});

const buildLearnerAgentsChatResponse = () => ({
  ok: true as const,
  data: { message: 'learner-response', sources: [{ id: 'source-1' }] },
});

const buildPlaywrightEnqueueResponse = () => ({
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
});

const buildPlaywrightPollResponse = () => ({
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
});

const hoistedMocks = vi.hoisted(() => ({
  mockDbApiSchema: vi.fn(async () => buildDbApiSchemaResponse()),
  mockDbApiBrowse: vi.fn(async () => buildDbApiBrowseResponse()),
  mockAiJobsEnqueue: vi.fn(async () => buildAiJobsEnqueueResponse()),
  mockAiJobsPoll: vi.fn(async () => buildAiJobsPollResponse()),
  mockAgentEnqueue: vi.fn(async () => buildAgentEnqueueResponse()),
  mockAgentPoll: vi.fn(async () => buildAgentPollResponse()),
  mockSettingsList: vi.fn(async () => buildSettingsListResponse()),
  mockLearnerAgentsChat: vi.fn(async () => buildLearnerAgentsChatResponse()),
  mockPlaywrightEnqueue: vi.fn(async () => buildPlaywrightEnqueueResponse()),
  mockPlaywrightPoll: vi.fn(async () => buildPlaywrightPollResponse()),
}));

export const mockDbApiSchema = hoistedMocks.mockDbApiSchema;
export const mockDbApiBrowse = hoistedMocks.mockDbApiBrowse;
export const mockAiJobsEnqueue = hoistedMocks.mockAiJobsEnqueue;
export const mockAiJobsPoll = hoistedMocks.mockAiJobsPoll;
export const mockAgentEnqueue = hoistedMocks.mockAgentEnqueue;
export const mockAgentPoll = hoistedMocks.mockAgentPoll;
export const mockSettingsList = hoistedMocks.mockSettingsList;
export const mockLearnerAgentsChat = hoistedMocks.mockLearnerAgentsChat;
export const mockPlaywrightEnqueue = hoistedMocks.mockPlaywrightEnqueue;
export const mockPlaywrightPoll = hoistedMocks.mockPlaywrightPoll;

vi.mock('@/shared/lib/ai-paths/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths/api')>(
    '@/shared/lib/ai-paths/api'
  );
  return {
    ...actual,
    dbApi: {
      ...actual.dbApi,
      schema: hoistedMocks.mockDbApiSchema,
      browse: hoistedMocks.mockDbApiBrowse,
    },
    aiJobsApi: {
      ...actual.aiJobsApi,
      enqueue: hoistedMocks.mockAiJobsEnqueue,
      poll: hoistedMocks.mockAiJobsPoll,
    },
    agentApi: {
      ...actual.agentApi,
      enqueue: hoistedMocks.mockAgentEnqueue,
      poll: hoistedMocks.mockAgentPoll,
    },
    settingsApi: {
      ...actual.settingsApi,
      list: hoistedMocks.mockSettingsList,
    },
    learnerAgentsApi: {
      ...actual.learnerAgentsApi,
      chat: hoistedMocks.mockLearnerAgentsChat,
    },
    playwrightNodeApi: {
      ...actual.playwrightNodeApi,
      enqueue: hoistedMocks.mockPlaywrightEnqueue,
      poll: hoistedMocks.mockPlaywrightPoll,
    },
  };
});

import type { AiNode } from '@/shared/contracts/ai-paths';
import {
  CLIENT_LEGACY_HANDLER_NODE_TYPES,
  CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS,
  evaluateGraphClient,
} from '@/shared/lib/ai-paths/core/runtime/engine-client';

export {
  CLIENT_LEGACY_HANDLER_NODE_TYPES,
  CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS,
  evaluateGraphClient,
};

export type NodeCodeObjectContractEntry = {
  executionAdapter?: unknown;
  codeObjectId?: unknown;
};

export const readNativeContractCodeObjectIdSet = (): Set<string> => {
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
        entry.executionAdapter === 'native_handler_registry' &&
        typeof entry.codeObjectId === 'string'
    )
    .map((entry: NodeCodeObjectContractEntry): string => entry.codeObjectId as string);
  return new Set(ids);
};

export const readNativeContractCodeObjectIdByNodeType = (): Map<string, string> => {
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
        entry.executionAdapter === 'native_handler_registry' &&
        typeof entry.codeObjectId === 'string'
    )
    .map(([nodeType, entry]: [string, NodeCodeObjectContractEntry]): [string, string] => [
      nodeType,
      entry.codeObjectId as string,
    ]);
  return new Map(entries);
};

export const buildUnsupportedClientNode = (): AiNode => ({
  id: 'node-unsupported',
  type: 'unsupported_client_node',
  title: 'Unsupported',
  description: '',
  inputs: [],
  outputs: ['result'],
  config: {},
  position: { x: 0, y: 0 },
});

export const buildFunctionNode = (): AiNode => ({
  id: 'node-function',
  type: 'function',
  title: 'Function',
  description: '',
  inputs: [],
  outputs: ['value'],
  config: {
    function: {
      script: 'return { value: "ok" };',
      safeMode: true,
    },
  },
  position: { x: 0, y: 0 },
});

export const buildPromptNode = (): AiNode => ({
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

export const buildModelNode = (): AiNode => ({
  id: 'node-model',
  type: 'model',
  title: 'Model',
  description: '',
  inputs: ['prompt', 'images'],
  outputs: ['result', 'jobId'],
  config: {
    model: {
      waitForResult: false,
      temperature: 0.7,
      maxTokens: 256,
      vision: false,
    },
  },
  position: { x: 10, y: 0 },
});

export const buildModelWaitNode = (): AiNode => ({
  id: 'node-model-wait',
  type: 'model',
  title: 'Model Wait',
  description: '',
  inputs: ['prompt', 'images'],
  outputs: ['result', 'jobId'],
  config: {
    model: {
      waitForResult: true,
      temperature: 0.7,
      maxTokens: 256,
      vision: false,
    },
  },
  position: { x: 12, y: 0 },
});

export const buildAgentNode = (): AiNode => ({
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

export const buildAgentWaitNode = (): AiNode => ({
  id: 'node-agent-wait',
  type: 'agent',
  title: 'Agent Wait',
  description: '',
  inputs: ['prompt'],
  outputs: ['result', 'jobId', 'status', 'bundle'],
  config: {
    agent: {
      personaId: '',
      promptTemplate: '',
      waitForResult: true,
    },
  },
  position: { x: 22, y: 0 },
});

export const buildLearnerAgentNode = (): AiNode => ({
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

export const buildTriggerNode = (): AiNode => ({
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

export const buildSimulationNode = (): AiNode => ({
  id: 'node-simulation',
  type: 'simulation',
  title: 'Simulation',
  description: '',
  inputs: ['trigger'],
  outputs: ['context', 'entityId', 'entityType', 'entityJson'],
  config: {},
  position: { x: 0, y: 0 },
});

export const buildFetcherNode = (): AiNode => ({
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

export const buildDbSchemaNode = (): AiNode => ({
  id: 'node-db-schema',
  type: 'db_schema',
  title: 'DB Schema',
  description: '',
  inputs: ['context', 'schema'],
  outputs: ['schema', 'context'],
  config: {
    db_schema: {
      provider: 'auto',
      mode: 'selected',
      collections: ['products'],
      sourceMode: 'schema_and_live_context',
      contextCollections: ['products'],
      contextQuery: '{"status":"active"}',
      contextLimit: 20,
      includeFields: true,
      includeRelations: true,
      formatAs: 'text',
    },
  },
  position: { x: 160, y: 0 },
});

export const buildPlaywrightNode = (): AiNode => ({
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

export const buildConstantNode = (input: {
  id: string;
  value: unknown;
  title?: string;
}): AiNode => ({
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

export const buildApiAdvancedNode = (): AiNode => ({
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

export const buildDatabaseNode = (): AiNode => ({
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

export const buildAudioOscillatorNode = (): AiNode => ({
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

export const buildAudioSpeakerNode = (): AiNode => ({
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

export const buildHttpNode = (): AiNode => ({
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

export const buildPollNode = (): AiNode => {
  const node: AiNode = {
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
  };

  return node;
};

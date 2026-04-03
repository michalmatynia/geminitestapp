import type { AiNode, NodeConfig, NodeType } from '@/shared/contracts/ai-paths';

import {
  TRIGGER_EVENTS,
  PARSER_PRESETS,
  DEFAULT_DB_QUERY,
  DEFAULT_CONTEXT_ROLE,
} from '../constants';
import { palette } from '../definitions';
import { backfillNodePortContracts } from './normalization.helpers';
import { createDefaultPlaywrightConfig } from '../playwright/default-config';
import { createParserMappings, createViewerOutputs } from '../utils/graph.nodes';
import { resolveNodeTypeId } from '../utils/node-identity';
import {
  normalizeModelNode,
  normalizeAgentNode,
} from './nodes/ai';
import { normalizeAudioOscillatorNode, normalizeAudioSpeakerNode } from './nodes/audio';
import { normalizeContextNode } from './nodes/context';
import { normalizeRouterNode, normalizeDelayNode, normalizePollNode } from './nodes/control';
import { normalizeDatabaseNode, normalizeDbSchemaNode } from './nodes/database';
import { normalizeFetcherNode, normalizeSimulationNode } from './nodes/fetcher';
import { normalizeHttpNode, normalizeApiAdvancedNode } from './nodes/http';
import { normalizeMutatorNode, normalizeStringMutatorNode } from './nodes/mutator';
import { normalizeMapperNode, normalizeParserNode, normalizeRegexNode } from './nodes/parser';
import { normalizeTriggerNode } from './nodes/trigger';
import {
  normalizeValidatorNode,
  normalizeConstantNode,
  normalizeMathNode,
  normalizeTemplateNode,
  normalizeBundleNode,
  normalizeCompareNode,
  normalizePlaywrightNode,
  normalizeViewerNode,
} from './nodes/utils';
import { normalizeValidationPatternNode } from './nodes/validation';

type NodeNormalizer = (node: AiNode) => AiNode | null;

const NODE_NORMALIZERS: Partial<Record<NodeType, NodeNormalizer>> = {
  context: normalizeContextNode as NodeNormalizer,
  trigger: normalizeTriggerNode as NodeNormalizer,
  fetcher: normalizeFetcherNode as NodeNormalizer,
  simulation: normalizeSimulationNode as NodeNormalizer,
  mapper: normalizeMapperNode as NodeNormalizer,
  parser: normalizeParserNode as NodeNormalizer,
  regex: normalizeRegexNode as NodeNormalizer,
  database: normalizeDatabaseNode as NodeNormalizer,
  db_schema: normalizeDbSchemaNode as NodeNormalizer,
  model: normalizeModelNode as NodeNormalizer,
  agent: normalizeAgentNode as NodeNormalizer,
  audio_oscillator: normalizeAudioOscillatorNode as NodeNormalizer,
  audio_speaker: normalizeAudioSpeakerNode as NodeNormalizer,
  router: normalizeRouterNode as NodeNormalizer,
  delay: normalizeDelayNode as NodeNormalizer,
  poll: normalizePollNode as NodeNormalizer,
  http: normalizeHttpNode as NodeNormalizer,
  api_advanced: normalizeApiAdvancedNode as NodeNormalizer,
  validation_pattern: normalizeValidationPatternNode as NodeNormalizer,
  mutator: normalizeMutatorNode as NodeNormalizer,
  string_mutator: normalizeStringMutatorNode as NodeNormalizer,
  validator: normalizeValidatorNode as NodeNormalizer,
  constant: normalizeConstantNode as NodeNormalizer,
  math: normalizeMathNode as NodeNormalizer,
  template: normalizeTemplateNode as NodeNormalizer,
  bundle: normalizeBundleNode as NodeNormalizer,
  compare: normalizeCompareNode as NodeNormalizer,
  playwright: normalizePlaywrightNode as NodeNormalizer,
  viewer: normalizeViewerNode as NodeNormalizer,
};

const normalizeNode = (node: AiNode): AiNode | null => {
  const normalizer = NODE_NORMALIZERS[node.type];
  return normalizer ? normalizer(node) : node;
};

export const normalizeNodes = (items: AiNode[]): AiNode[] => {
  const normalized = items
    .map(normalizeNode)
    .filter((node: AiNode | null): node is AiNode => Boolean(node));
  return backfillNodePortContracts(normalized).nodes.map(
    (node: AiNode): AiNode => ({
      ...node,
      inputs: node.inputs ?? [],
      outputs: node.outputs ?? [],
      instanceId: node.id,
      nodeTypeId: resolveNodeTypeId(node, palette),
    })
  );
};

export const getDefaultConfigForType = (
  type: NodeType,
  outputs: string[],
  inputs: string[]
): NodeConfig | undefined => {
  if (type === 'trigger') {
    return {
      trigger: {
        event: TRIGGER_EVENTS[0]?.id ?? 'manual',
        contextMode: 'trigger_only',
      },
    };
  }
  if (type === 'simulation') {
    return {
      simulation: {
        productId: '',
        entityType: 'product',
        entityId: '',
        runBehavior: 'before_connected_trigger',
      },
    };
  }
  if (type === 'fetcher') {
    return {
      fetcher: {
        sourceMode: 'live_context',
        entityType: 'product',
        entityId: '',
        productId: '',
      },
      runtime: {
        waitForInputs: true,
        inputContracts: {
          trigger: { required: true },
          context: { required: false },
          meta: { required: false },
          entityId: { required: false },
          entityType: { required: false },
        },
      },
    };
  }
  if (type === 'audio_oscillator') {
    return {
      audioOscillator: {
        waveform: 'sine',
        frequencyHz: 440,
        gain: 0.25,
        durationMs: 400,
      },
    };
  }
  if (type === 'audio_speaker') {
    return {
      audioSpeaker: {
        enabled: true,
        autoPlay: true,
        gain: 1,
        stopPrevious: true,
      },
    };
  }
  if (type === 'viewer') {
    return { viewer: { outputs: createViewerOutputs(inputs), showImagesAsJson: false } };
  }
  if (type === 'context') {
    return {
      context: {
        role: DEFAULT_CONTEXT_ROLE,
        entityType: 'auto',
        entityIdSource: 'simulation',
        entityId: '',
        scopeMode: 'full',
        includePaths: [],
        excludePaths: [],
      },
    };
  }
  if (type === 'mapper') {
    return {
      mapper: {
        outputs: outputs.length ? outputs : ['value'],
        mappings: createParserMappings(outputs.length ? outputs : ['value']),
        jsonIntegrityPolicy: 'repair',
      },
    };
  }
  if (type === 'mutator') {
    return {
      mutator: {
        path: 'entity.title',
        valueTemplate: '{{value}}',
      },
    };
  }
  if (type === 'string_mutator') {
    return {
      stringMutator: {
        operations: [],
      },
    };
  }
  if (type === 'validator') {
    return {
      validator: {
        requiredPaths: ['entity.id'],
        mode: 'all',
      },
    };
  }
  if (type === 'validation_pattern') {
    return {
      validationPattern: {
        source: 'global_stack',
        stackId: '',
        scope: 'global',
        includeLearnedRules: true,
        runtimeMode: 'validate_only',
        failPolicy: 'block_on_error',
        inputPort: 'auto',
        outputPort: 'value',
        maxAutofixPasses: 1,
        includeRuleIds: [],
        localListName: 'Path Local Validation List',
        localListDescription: '',
        rules: [],
        learnedRules: [],
      },
    };
  }
  if (type === 'constant') {
    return {
      constant: {
        valueType: 'string',
        value: '',
      },
    };
  }
  if (type === 'math') {
    return {
      math: {
        operation: 'add',
        operand: 0,
      },
    };
  }
  if (type === 'template') {
    return {
      template: {
        template: 'Write a summary for {{context.entity.title}}',
      },
    };
  }
  if (type === 'bundle') {
    return {
      bundle: {
        includePorts: [],
      },
    };
  }
  if (type === 'gate') {
    return {
      gate: {
        mode: 'block',
        failMessage: 'Gate blocked',
      },
    };
  }
  if (type === 'compare') {
    return {
      compare: {
        operator: 'eq',
        compareTo: '',
        caseSensitive: false,
        message: 'Comparison failed',
      },
    };
  }
  if (type === 'router') {
    return {
      router: {
        mode: 'valid',
        matchMode: 'truthy',
        compareTo: '',
      },
    };
  }
  if (type === 'delay') {
    return {
      delay: {
        ms: 300,
      },
    };
  }
  if (type === 'poll') {
    return {
      poll: {
        intervalMs: 2000,
        maxAttempts: 30,
        mode: 'job',
        dbQuery: { ...DEFAULT_DB_QUERY },
        successPath: 'status',
        successOperator: 'equals',
        successValue: 'completed',
        resultPath: 'result',
      },
    };
  }
  if (type === 'http') {
    return {
      http: {
        url: 'https://api.example.com',
        method: 'GET',
        headers: '{\n  "Content-Type": "application/json"\n}',
        bodyTemplate: '',
        responseMode: 'json',
        responsePath: '',
      },
    };
  }
  if (type === 'api_advanced') {
    return {
      apiAdvanced: {
        url: 'https://api.example.com/v1/resource',
        method: 'GET',
        pathParamsJson: '{}',
        queryParamsJson: '{}',
        headersJson: '{}',
        bodyTemplate: '',
        bodyMode: 'none',
        timeoutMs: 30_000,
        authMode: 'none',
        apiKeyName: '',
        apiKeyValueTemplate: '',
        apiKeyPlacement: 'header',
        bearerTokenTemplate: '',
        basicUsernameTemplate: '',
        basicPasswordTemplate: '',
        oauthTokenUrl: '',
        oauthClientIdTemplate: '',
        oauthClientSecretTemplate: '',
        oauthScopeTemplate: '',
        connectionIdTemplate: '',
        connectionHeaderName: 'X-Connection-Id',
        responseMode: 'json',
        responsePath: '',
        outputMappingsJson: '{}',
        retryEnabled: true,
        retryAttempts: 2,
        retryBackoff: 'fixed',
        retryBackoffMs: 500,
        retryMaxBackoffMs: 5_000,
        retryJitterRatio: 0,
        retryOnStatusJson: '[429,500,502,503,504]',
        retryOnNetworkError: true,
        paginationMode: 'none',
        pageParam: 'page',
        limitParam: 'limit',
        startPage: 1,
        pageSize: 50,
        cursorParam: 'cursor',
        cursorPath: '',
        itemsPath: 'items',
        maxPages: 1,
        paginationAggregateMode: 'first_page',
        rateLimitEnabled: false,
        rateLimitRequests: 1,
        rateLimitIntervalMs: 1000,
        rateLimitConcurrency: 1,
        rateLimitOnLimit: 'wait',
        idempotencyEnabled: false,
        idempotencyHeaderName: 'Idempotency-Key',
        idempotencyKeyTemplate: '',
        errorRoutesJson: '[]',
      },
    };
  }
  if (type === 'parser') {
    return {
      parser: {
        mappings: createParserMappings(outputs),
        outputMode: 'individual',
        presetId: PARSER_PRESETS[0]?.id ?? 'custom',
      },
    };
  }
  if (type === 'regex') {
    return {
      regex: {
        pattern: '',
        flags: 'g',
        mode: 'group',
        matchMode: 'first',
        groupBy: 'match',
        outputMode: 'object',
        includeUnmatched: true,
        unmatchedKey: '__unmatched__',
        splitLines: true,
        sampleText: '',
        aiPrompt: '',
        aiAutoRun: false,
        activeVariant: 'manual',
        jsonIntegrityPolicy: 'repair',
      },
    };
  }
  if (type === 'iterator') {
    return {
      iterator: {
        autoContinue: true,
        maxSteps: 50,
      },
    };
  }
  if (type === 'prompt') {
    return { prompt: { template: '' } };
  }
  if (type === 'model') {
    return {
      model: {
        temperature: 0.7,
        maxTokens: 800,
        vision: (inputs ?? []).includes('images'),
        waitForResult: true,
      },
    };
  }
  if (type === 'agent') {
    return {
      agent: {
        personaId: '',
        promptTemplate: '',
        waitForResult: true,
      },
    };
  }
  if (type === 'playwright') {
    return {
      playwright: createDefaultPlaywrightConfig(),
    };
  }
  if (type === 'database') {
    return {
      database: {
        operation: 'query',
        entityType: 'product',
        idField: 'entityId',
        mode: 'replace',
        updateStrategy: 'one',
        updatePayloadMode: 'custom',
        useMongoActions: false,
        mappings: [],
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
          projection: '',
          single: false,
        },
        writeSource: 'bundle',
        writeSourcePath: '',
        dryRun: false,
        writeOutcomePolicy: {
          onZeroAffected: 'fail',
        },
      },
    };
  }
  if (type === 'db_schema') {
    return {
      db_schema: {
        provider: 'auto',
        mode: 'all',
        collections: [],
        includeFields: true,
        includeRelations: true,
        formatAs: 'text',
      },
    };
  }
  return undefined;
};

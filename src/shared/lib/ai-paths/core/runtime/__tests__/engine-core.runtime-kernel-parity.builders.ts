import { describe, expect, it } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandler, RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';
import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import {
  createNodeRuntimeKernel,
  toNodeRuntimeResolutionTelemetry,
} from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';

export type RuntimeMode = 'legacy_adapter' | 'code_object_v3';

export const buildKernelNodes = (value: unknown): AiNode[] => [
  {
    id: 'node-constant',
    type: 'constant',
    title: 'Constant',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {
      constant: {
        valueType: typeof value === 'number' ? 'number' : 'string',
        value,
      },
    },
    position: { x: 0, y: 0 },
  } as AiNode,
  {
    id: 'node-math',
    type: 'math',
    title: 'Math',
    description: '',
    inputs: ['value'],
    outputs: ['value'],
    config: {
      math: {
        operation: 'add',
        operand: 5,
      },
    },
    position: { x: 200, y: 0 },
  } as AiNode,
  {
    id: 'node-template',
    type: 'template',
    title: 'Template',
    description: '',
    inputs: ['value'],
    outputs: ['prompt'],
    config: {
      template: {
        template: 'sum={{value}}',
      },
    },
    position: { x: 400, y: 0 },
  } as AiNode,
];

export const buildKernelEdges = (): Edge[] => [
  {
    id: 'edge-constant-math',
    from: 'node-constant',
    to: 'node-math',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-math-template',
    from: 'node-math',
    to: 'node-template',
    fromPort: 'value',
    toPort: 'value',
  },
];

export const buildTransformKernelNodes = (title: string): AiNode[] => [
  {
    id: 'node-constant',
    type: 'constant',
    title: 'Constant',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {
      constant: {
        valueType: 'string',
        value: JSON.stringify({ title }),
      },
    },
    position: { x: 0, y: 180 },
  } as AiNode,
  {
    id: 'node-parser',
    type: 'parser',
    title: 'JSON Parser',
    description: '',
    inputs: ['entityJson'],
    outputs: ['value'],
    config: {
      parser: {
        outputMode: 'individual',
        mappings: {
          title: 'title',
        },
      },
    },
    position: { x: 180, y: 180 },
  } as AiNode,
  {
    id: 'node-bundle',
    type: 'bundle',
    title: 'Bundle',
    description: '',
    inputs: ['value', 'productId', 'content_en', 'images', 'title'],
    outputs: ['bundle'],
    config: {
      bundle: {
        includePorts: ['value'],
      },
    },
    position: { x: 300, y: 180 },
  } as AiNode,
  {
    id: 'node-mapper',
    type: 'mapper',
    title: 'JSON Mapper',
    description: '',
    inputs: ['value'],
    outputs: ['context'],
    config: {
      mapper: {
        outputs: ['value'],
        mappings: {
          value: 'title',
        },
      },
    },
    position: { x: 420, y: 180 },
  } as AiNode,
  {
    id: 'node-context',
    type: 'context',
    title: 'Context Filter',
    description: '',
    inputs: ['context'],
    outputs: ['context', 'entityId', 'entityType', 'entityJson'],
    config: {
      context: {
        entityType: 'auto',
        entityIdSource: 'context',
        scopeMode: 'full',
        scopeTarget: 'entity',
      },
    },
    position: { x: 540, y: 180 },
  } as AiNode,
  {
    id: 'node-trigger',
    type: 'trigger',
    title: 'Trigger: Image Studio Analysis',
    description: '',
    inputs: [],
    outputs: ['trigger', 'triggerName'],
    config: {
      trigger: {
        event: 'manual',
        contextMode: 'trigger_only',
      },
    },
    position: { x: 600, y: 60 },
  } as AiNode,
  {
    id: 'node-db-schema',
    type: 'db_schema',
    title: 'Database Schema',
    description: '',
    inputs: [],
    outputs: ['schema', 'context'],
    config: {
      db_schema: {
        provider: 'all',
        mode: 'all',
        collections: [],
        includeFields: true,
        includeRelations: false,
        formatAs: 'json',
      },
    },
    position: { x: 720, y: -60 },
  } as AiNode,
  {
    id: 'node-simulation',
    type: 'simulation',
    title: 'Simulation: Entity Modal',
    description: '',
    inputs: ['trigger'],
    outputs: ['context', 'entityId', 'entityType', 'productId'],
    config: {
      simulation: {
        entityType: 'product',
        entityId: 'sim-wave-a',
        productId: 'sim-wave-a',
        runBehavior: 'before_connected_trigger',
      },
    },
    position: { x: 720, y: 60 },
  } as AiNode,
  {
    id: 'node-fetcher',
    type: 'fetcher',
    title: 'Fetcher: Trigger Context',
    description: '',
    inputs: ['trigger', 'context', 'meta', 'entityId', 'entityType'],
    outputs: ['context', 'meta', 'entityId', 'entityType'],
    config: {
      fetcher: {
        sourceMode: 'live_context',
        entityType: 'product',
        entityId: '',
        productId: '',
      },
      runtime: {
        inputContracts: {
          trigger: { required: true },
          context: { required: true },
          meta: { required: false },
          entityId: { required: false },
          entityType: { required: false },
        },
      },
    },
    position: { x: 600, y: 180 },
  } as AiNode,
  {
    id: 'node-validator',
    type: 'validator',
    title: 'Validator',
    description: '',
    inputs: ['context'],
    outputs: ['context', 'valid', 'errors'],
    config: {
      validator: {
        requiredPaths: ['value'],
        mode: 'all',
      },
    },
    position: { x: 660, y: 180 },
  } as AiNode,
  {
    id: 'node-gate',
    type: 'gate',
    title: 'Gate',
    description: '',
    inputs: ['context', 'valid', 'errors'],
    outputs: ['context', 'valid', 'errors'],
    config: {
      gate: {
        mode: 'block',
        failMessage: 'Gate blocked',
      },
    },
    position: { x: 780, y: 180 },
  } as AiNode,
  {
    id: 'node-mutator',
    type: 'mutator',
    title: 'Mutator',
    description: '',
    inputs: ['context'],
    outputs: ['value'],
    config: {
      mutator: {
        suffix: '-mutated',
      },
    },
    position: { x: 900, y: 180 },
  } as AiNode,
  {
    id: 'node-compare',
    type: 'compare',
    title: 'Compare',
    description: '',
    inputs: ['value'],
    outputs: ['value', 'valid', 'errors'],
    config: {
      compare: {
        operator: 'notEmpty',
        compareTo: '',
        caseSensitive: false,
        message: 'Comparison failed',
      },
    },
    position: { x: 1020, y: 180 },
  } as AiNode,
  {
    id: 'node-delay',
    type: 'delay',
    title: 'Delay',
    description: '',
    inputs: ['value', 'bundle'],
    outputs: ['value', 'bundle'],
    config: {
      delay: {
        ms: 0,
      },
    },
    position: { x: 1110, y: 180 },
  } as AiNode,
  {
    id: 'node-iterator',
    type: 'iterator',
    title: 'Iterator',
    description: '',
    inputs: ['value', 'callback'],
    outputs: ['value', 'index', 'total', 'done', 'status'],
    config: {
      iterator: {
        autoContinue: true,
        maxSteps: 50,
      },
    },
    position: { x: 1200, y: 180 },
  } as AiNode,
  {
    id: 'node-regex',
    type: 'regex',
    title: 'Regex Grouper',
    description: '',
    inputs: ['value'],
    outputs: ['value'],
    config: {
      regex: {
        pattern: '\\s+',
        flags: 'g',
      },
    },
    position: { x: 1320, y: 180 },
  } as AiNode,
  {
    id: 'node-validation-pattern',
    type: 'validation_pattern',
    title: 'Validation Pattern',
    description: '',
    inputs: ['value', 'prompt', 'result', 'context'],
    outputs: ['value', 'result', 'context', 'valid', 'errors', 'bundle'],
    config: {
      validationPattern: {
        source: 'global_stack',
        scope: 'global',
        runtimeMode: 'validate_only',
        failPolicy: 'block_on_error',
        inputPort: 'auto',
        outputPort: 'value',
        maxAutofixPasses: 1,
        includeRuleIds: [],
        rules: [],
        learnedRules: [],
        stackId: '',
      },
    },
    position: { x: 1410, y: 180 },
  } as AiNode,
  {
    id: 'node-string-mutator',
    type: 'string_mutator',
    title: 'String Mutator',
    description: '',
    inputs: ['value', 'prompt', 'result'],
    outputs: ['value'],
    config: {
      stringMutator: {
        operations: [
          {
            type: 'replace',
            search: '_',
            replace: '-',
            matchMode: 'all',
            useRegex: false,
          },
          {
            type: 'append',
            position: 'suffix',
            value: '-v3',
          },
        ],
      },
    },
    position: { x: 1590, y: 240 },
  } as AiNode,
  {
    id: 'node-router',
    type: 'router',
    title: 'Router',
    description: '',
    inputs: ['value', 'bundle'],
    outputs: ['value', 'bundle'],
    config: {
      router: {
        mode: 'value',
        matchMode: 'truthy',
        compareTo: '',
      },
    },
    position: { x: 1770, y: 180 },
  } as AiNode,
  {
    id: 'node-template',
    type: 'template',
    title: 'Template',
    description: '',
    inputs: ['value'],
    outputs: ['prompt'],
    config: {
      template: {
        template: 'out={{value}}',
      },
    },
    position: { x: 1950, y: 180 },
  } as AiNode,
  {
    id: 'node-poll',
    type: 'poll',
    title: 'Poll Job',
    description: '',
    inputs: ['jobId', 'query', 'value', 'entityId', 'productId', 'bundle'],
    outputs: ['result', 'status', 'jobId', 'bundle'],
    config: {
      poll: {
        mode: 'job',
        intervalMs: 2000,
        maxAttempts: 30,
        dbQuery: {
          provider: 'mongodb',
          collection: 'products',
          mode: 'preset',
          preset: 'by_id',
          field: '_id',
          idType: 'string',
          queryTemplate: '{...}',
          limit: 20,
          sort: '',
          projection: '',
          single: false,
        },
        successPath: 'status',
        successOperator: 'equals',
        successValue: 'completed',
        resultPath: 'result',
      },
    },
    position: { x: 2040, y: 180 },
  } as AiNode,
  {
    id: 'node-prompt',
    type: 'prompt',
    title: 'Prompt',
    description: '',
    inputs: ['bundle', 'title', 'images', 'result', 'entityId'],
    outputs: ['prompt', 'images'],
    config: {
      prompt: {
        template: 'prompt={{result}}',
      },
      runtime: {
        inputContracts: {
          bundle: { required: false },
          title: { required: false },
          images: { required: false },
          result: { required: true },
          entityId: { required: false },
        },
      },
    },
    position: { x: 2130, y: 60 },
  } as AiNode,
  {
    id: 'node-agent',
    type: 'agent',
    title: 'Reasoning Agent',
    description: '',
    inputs: ['prompt', 'bundle', 'context', 'entityJson'],
    outputs: ['result', 'jobId'],
    config: {
      agent: {
        personaId: '',
        promptTemplate: '',
        waitForResult: true,
      },
      runtime: {
        inputContracts: {
          prompt: { required: true },
          bundle: { required: false },
          context: { required: false },
          entityJson: { required: false },
        },
      },
    },
    position: { x: 2220, y: 60 },
  } as AiNode,
  {
    id: 'node-model',
    type: 'model',
    title: 'Model',
    description: '',
    inputs: ['prompt', 'images'],
    outputs: ['result', 'jobId'],
    config: {
      model: {
        modelId: '',
        temperature: 0.7,
        maxTokens: 800,
        systemPrompt: '',
        vision: false,
        waitForResult: true,
      },
    },
    position: { x: 2310, y: 60 },
  } as AiNode,
  {
    id: 'node-http',
    type: 'http',
    title: 'HTTP Fetch',
    description: '',
    inputs: ['url', 'body', 'headers', 'bundle'],
    outputs: ['value', 'bundle'],
    config: {
      http: {
        url: 'https://example.com/api',
        method: 'POST',
        headers: '{"content-type":"application/json"}',
        bodyTemplate: '',
        responseMode: 'json',
        responsePath: '',
      },
      runtime: {
        inputContracts: {
          url: { required: false },
          body: { required: true },
          headers: { required: false },
          bundle: { required: false },
        },
      },
    },
    position: { x: 2400, y: 60 },
  } as AiNode,
  {
    id: 'node-database',
    type: 'database',
    title: 'Database Query',
    description: '',
    inputs: [
      'entityId',
      'entityType',
      'productId',
      'context',
      'query',
      'value',
      'bundle',
      'result',
      'content_en',
      'queryCallback',
      'schema',
      'aiQuery',
    ],
    outputs: ['result', 'bundle', 'content_en', 'aiPrompt'],
    config: {
      database: {
        operation: 'query',
        entityType: 'product',
        idField: '_id',
        query: {
          provider: 'mongodb',
          collection: 'products',
          mode: 'preset',
          preset: 'by_id',
          field: '_id',
          idType: 'string',
          queryTemplate: '{...}',
          limit: 20,
          sort: '',
          projection: '',
          single: false,
        },
      },
      runtime: {
        inputContracts: {
          query: { required: true },
          schema: { required: false },
        },
      },
    },
    position: { x: 2490, y: 0 },
  } as AiNode,
  {
    id: 'node-api-advanced',
    type: 'api_advanced',
    title: 'API Operation (Advanced)',
    description: '',
    inputs: ['url', 'body', 'headers', 'params', 'bundle'],
    outputs: ['value', 'bundle', 'status', 'headers', 'items', 'route', 'error', 'success'],
    config: {
      apiAdvanced: {
        url: 'https://example.com/advanced',
        method: 'POST',
        pathParamsJson: {},
        queryParamsJson: {},
        headersJson: {},
        authMode: 'none',
        responseMode: 'json',
        responsePath: '',
        outputMappingsJson: {},
        retryEnabled: true,
        retryAttempts: 2,
        retryOnStatusJson: [429, 500, 502, 503, 504],
        paginationMode: 'none',
        errorRoutesJson: [],
      },
      runtime: {
        inputContracts: {
          url: { required: false },
          body: { required: false },
          headers: { required: false },
          params: { required: false },
          bundle: { required: false },
        },
      },
    },
    position: { x: 2580, y: 0 },
  } as AiNode,
  {
    id: 'node-audio-oscillator',
    type: 'audio_oscillator',
    title: 'Audio Oscillator',
    description: '',
    inputs: ['frequency', 'waveform', 'gain', 'durationMs', 'trigger'],
    outputs: ['audioSignal', 'frequency', 'waveform', 'gain', 'durationMs'],
    config: {
      audioOscillator: {
        waveform: 'sine',
        frequencyHz: 440,
        gain: 0.25,
        durationMs: 400,
      },
      runtime: {
        inputContracts: {
          frequency: { required: false },
          waveform: { required: false },
          gain: { required: false },
          durationMs: { required: false },
          trigger: { required: false },
        },
      },
    },
    position: { x: 2670, y: 120 },
  } as AiNode,
  {
    id: 'node-audio-speaker',
    type: 'audio_speaker',
    title: 'Audio Speaker (Mono)',
    description: '',
    inputs: ['audioSignal', 'frequency', 'waveform', 'gain', 'durationMs', 'trigger'],
    outputs: ['status', 'audioSignal'],
    config: {
      audioSpeaker: {
        enabled: true,
        autoPlay: true,
        gain: 1,
        stopPrevious: true,
      },
      runtime: {
        inputContracts: {
          audioSignal: { required: true },
          frequency: { required: false },
          waveform: { required: false },
          gain: { required: false },
          durationMs: { required: false },
          trigger: { required: false },
        },
      },
    },
    position: { x: 2760, y: 120 },
  } as AiNode,
  {
    id: 'node-learner-agent',
    type: 'learner_agent',
    title: 'Learner Agent',
    description: '',
    inputs: ['prompt', 'bundle'],
    outputs: ['result', 'jobId', 'sources'],
    config: {
      learnerAgent: {
        agentId: '',
        promptTemplate: '',
        includeSources: true,
      },
      runtime: {
        inputContracts: {
          prompt: { required: true },
          bundle: { required: false },
        },
      },
    },
    position: { x: 2220, y: 180 },
  } as AiNode,
  {
    id: 'node-playwright',
    type: 'playwright',
    title: 'Playwright',
    description: '',
    inputs: ['url', 'bundle', 'context'],
    outputs: ['result', 'jobId', 'screenshot', 'html'],
    config: {
      playwright: {
        mode: 'scrape',
        url: 'https://example.com/path',
      },
      runtime: {
        inputContracts: {
          url: { required: false },
          bundle: { required: false },
          context: { required: false },
        },
      },
    },
    position: { x: 2850, y: 0 },
  } as AiNode,
  {
    id: 'node-ai-description',
    type: 'ai_description',
    title: 'AI Description Generator',
    description: '',
    inputs: ['entityJson', 'images', 'title'],
    outputs: ['description_en'],
    config: {
      description: {
        visionOutputEnabled: true,
        generationOutputEnabled: true,
      },
      runtime: {
        inputContracts: {
          entityJson: { required: false },
          images: { required: false },
          title: { required: false },
        },
      },
    },
    position: { x: 2490, y: 120 },
  } as AiNode,
  {
    id: 'node-description-updater',
    type: 'description_updater',
    title: 'Description Updater (Deprecated)',
    description: '',
    inputs: ['productId', 'description_en'],
    outputs: ['description_en'],
    config: {},
    position: { x: 2040, y: 120 },
  } as AiNode,
  {
    id: 'node-viewer',
    type: 'viewer',
    title: 'Result Viewer',
    description: '',
    inputs: [
      'result',
      'sources',
      'grouped',
      'matches',
      'index',
      'total',
      'done',
      'analysis',
      'description',
      'description_en',
      'prompt',
      'images',
      'title',
      'productId',
      'content_en',
      'context',
      'meta',
      'trigger',
      'triggerName',
      'jobId',
      'status',
      'entityId',
      'entityType',
      'entityJson',
      'bundle',
      'valid',
      'errors',
      'value',
      'audioSignal',
      'frequency',
      'waveform',
      'gain',
      'durationMs',
      'queryCallback',
      'aiPrompt',
    ],
    outputs: [],
    config: {
      viewer: {
        outputs: {},
        showImagesAsJson: false,
      },
    },
    position: { x: 2040, y: 300 },
  } as AiNode,
  {
    id: 'node-notification',
    type: 'notification',
    title: 'Toast Notification',
    description: '',
    inputs: ['value', 'bundle', 'title'],
    outputs: [],
    config: {},
    position: { x: 2130, y: 180 },
  } as AiNode,
];

export const buildTransformKernelEdges = (): Edge[] => [
  {
    id: 'edge-constant-parser',
    from: 'node-constant',
    to: 'node-parser',
    fromPort: 'entityJson',
    toPort: 'entityJson',
  },
  {
    id: 'edge-parser-bundle',
    from: 'node-parser',
    to: 'node-bundle',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-bundle-mapper',
    from: 'node-bundle',
    to: 'node-mapper',
    fromPort: 'bundle',
    toPort: 'bundle',
  },
  {
    id: 'edge-parser-mapper',
    from: 'node-parser',
    to: 'node-mapper',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-mapper-context',
    from: 'node-mapper',
    to: 'node-context',
    fromPort: 'context',
    toPort: 'context',
  },
  {
    id: 'edge-context-fetcher',
    from: 'node-context',
    to: 'node-fetcher',
    fromPort: 'context',
    toPort: 'context',
  },
  {
    id: 'edge-trigger-fetcher',
    from: 'node-trigger',
    to: 'node-fetcher',
    fromPort: 'trigger',
    toPort: 'trigger',
  },
  {
    id: 'edge-trigger-simulation',
    from: 'node-trigger',
    to: 'node-simulation',
    fromPort: 'trigger',
    toPort: 'trigger',
  },
  {
    id: 'edge-fetcher-validator',
    from: 'node-fetcher',
    to: 'node-validator',
    fromPort: 'context',
    toPort: 'context',
  },
  {
    id: 'edge-validator-gate-context',
    from: 'node-validator',
    to: 'node-gate',
    fromPort: 'context',
    toPort: 'context',
  },
  {
    id: 'edge-validator-gate-valid',
    from: 'node-validator',
    to: 'node-gate',
    fromPort: 'valid',
    toPort: 'valid',
  },
  {
    id: 'edge-validator-gate-errors',
    from: 'node-validator',
    to: 'node-gate',
    fromPort: 'errors',
    toPort: 'errors',
  },
  {
    id: 'edge-gate-mutator',
    from: 'node-gate',
    to: 'node-mutator',
    fromPort: 'context',
    toPort: 'context',
  },
  {
    id: 'edge-mutator-compare',
    from: 'node-mutator',
    to: 'node-compare',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-compare-delay',
    from: 'node-compare',
    to: 'node-delay',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-delay-iterator',
    from: 'node-delay',
    to: 'node-iterator',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-iterator-regex',
    from: 'node-iterator',
    to: 'node-regex',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-regex-validation-pattern',
    from: 'node-regex',
    to: 'node-validation-pattern',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-validation-pattern-string-mutator',
    from: 'node-validation-pattern',
    to: 'node-string-mutator',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-string-mutator-router',
    from: 'node-string-mutator',
    to: 'node-router',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-router-template',
    from: 'node-router',
    to: 'node-template',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-template-notification',
    from: 'node-template',
    to: 'node-notification',
    fromPort: 'prompt',
    toPort: 'value',
  },
  {
    id: 'edge-template-prompt',
    from: 'node-template',
    to: 'node-poll',
    fromPort: 'prompt',
    toPort: 'value',
  },
  {
    id: 'edge-poll-prompt',
    from: 'node-poll',
    to: 'node-prompt',
    fromPort: 'result',
    toPort: 'result',
  },
  {
    id: 'edge-prompt-description-updater',
    from: 'node-prompt',
    to: 'node-description-updater',
    fromPort: 'prompt',
    toPort: 'description_en',
  },
  {
    id: 'edge-prompt-agent',
    from: 'node-prompt',
    to: 'node-agent',
    fromPort: 'prompt',
    toPort: 'prompt',
  },
  {
    id: 'edge-prompt-learner-agent',
    from: 'node-prompt',
    to: 'node-learner-agent',
    fromPort: 'prompt',
    toPort: 'prompt',
  },
  {
    id: 'edge-prompt-model',
    from: 'node-prompt',
    to: 'node-model',
    fromPort: 'prompt',
    toPort: 'prompt',
  },
  {
    id: 'edge-prompt-model-images',
    from: 'node-prompt',
    to: 'node-model',
    fromPort: 'images',
    toPort: 'images',
  },
  {
    id: 'edge-model-http',
    from: 'node-model',
    to: 'node-http',
    fromPort: 'result',
    toPort: 'body',
  },
  {
    id: 'edge-db-schema-database',
    from: 'node-db-schema',
    to: 'node-database',
    fromPort: 'schema',
    toPort: 'schema',
  },
  {
    id: 'edge-http-database',
    from: 'node-http',
    to: 'node-database',
    fromPort: 'value',
    toPort: 'query',
  },
  {
    id: 'edge-http-api-advanced-body',
    from: 'node-http',
    to: 'node-api-advanced',
    fromPort: 'value',
    toPort: 'body',
  },
  {
    id: 'edge-http-api-advanced-url',
    from: 'node-http',
    to: 'node-api-advanced',
    fromPort: 'value',
    toPort: 'url',
  },
  {
    id: 'edge-http-playwright-url',
    from: 'node-http',
    to: 'node-playwright',
    fromPort: 'value',
    toPort: 'url',
  },
  {
    id: 'edge-context-playwright-context',
    from: 'node-context',
    to: 'node-playwright',
    fromPort: 'context',
    toPort: 'context',
  },
  {
    id: 'edge-audio-oscillator-audio-speaker',
    from: 'node-audio-oscillator',
    to: 'node-audio-speaker',
    fromPort: 'audioSignal',
    toPort: 'audioSignal',
  },
  {
    id: 'edge-simulation-description-updater',
    from: 'node-simulation',
    to: 'node-description-updater',
    fromPort: 'productId',
    toPort: 'productId',
  },
  {
    id: 'edge-description-updater-viewer',
    from: 'node-description-updater',
    to: 'node-viewer',
    fromPort: 'description_en',
    toPort: 'description_en',
  },
  {
    id: 'edge-model-viewer',
    from: 'node-model',
    to: 'node-viewer',
    fromPort: 'result',
    toPort: 'result',
  },
  {
    id: 'edge-http-viewer',
    from: 'node-http',
    to: 'node-viewer',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-database-viewer',
    from: 'node-database',
    to: 'node-viewer',
    fromPort: 'aiPrompt',
    toPort: 'aiPrompt',
  },
  {
    id: 'edge-api-advanced-viewer',
    from: 'node-api-advanced',
    to: 'node-viewer',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-learner-agent-viewer-result',
    from: 'node-learner-agent',
    to: 'node-viewer',
    fromPort: 'result',
    toPort: 'result',
  },
  {
    id: 'edge-learner-agent-viewer-sources',
    from: 'node-learner-agent',
    to: 'node-viewer',
    fromPort: 'sources',
    toPort: 'sources',
  },
  {
    id: 'edge-playwright-viewer-result',
    from: 'node-playwright',
    to: 'node-viewer',
    fromPort: 'result',
    toPort: 'result',
  },
  {
    id: 'edge-playwright-viewer-job-id',
    from: 'node-playwright',
    to: 'node-viewer',
    fromPort: 'jobId',
    toPort: 'jobId',
  },
  {
    id: 'edge-audio-speaker-viewer-audio-signal',
    from: 'node-audio-speaker',
    to: 'node-viewer',
    fromPort: 'audioSignal',
    toPort: 'audioSignal',
  },
  {
    id: 'edge-audio-speaker-viewer-status',
    from: 'node-audio-speaker',
    to: 'node-viewer',
    fromPort: 'status',
    toPort: 'status',
  },
  {
    id: 'edge-ai-description-viewer',
    from: 'node-ai-description',
    to: 'node-viewer',
    fromPort: 'description_en',
    toPort: 'description',
  },
  {
    id: 'edge-template-viewer',
    from: 'node-template',
    to: 'node-viewer',
    fromPort: 'prompt',
    toPort: 'prompt',
  },
];

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const pilotHandlers: Record<string, NodeHandler> = {
  constant: ({ node }) => {
    const valueType = node.config?.constant?.valueType;
    const rawValue = node.config?.constant?.value;
    const value = valueType === 'number' ? Number(rawValue ?? 0) : (rawValue ?? '');
    const entityJson =
      typeof value === 'string'
        ? (() => {
            try {
              return asRecord(JSON.parse(value));
            } catch {
              return { value };
            }
          })()
        : asRecord(value);

    return { value, entityJson };
  },
  math: ({ node, nodeInputs }) => {
    const inputValue = nodeInputs['value'];
    const numeric = Number(inputValue);
    if (!Number.isFinite(numeric)) {
      return { value: inputValue };
    }
    const operand = Number(node.config?.math?.operand ?? 0);
    return { value: numeric + operand };
  },
  parser: ({ nodeInputs }) => {
    const rawInput = nodeInputs['entityJson'] ?? nodeInputs['context'];
    let parsed = asRecord(rawInput);

    if (typeof rawInput === 'string') {
      try {
        parsed = asRecord(JSON.parse(rawInput));
      } catch {
        parsed = {};
      }
    }

    return {
      productId: String(parsed['productId'] ?? ''),
      title: String(parsed['title'] ?? ''),
      value: String(parsed['title'] ?? ''),
      images: Array.isArray(parsed['images']) ? parsed['images'] : [],
      content_en: String(parsed['content_en'] ?? ''),
    };
  },
  mapper: ({ nodeInputs }) => {
    const value =
      nodeInputs['value'] ?? nodeInputs['context'] ?? nodeInputs['result'] ?? nodeInputs['bundle'];
    return {
      value: String(value ?? ''),
      context: { value: String(value ?? '') },
      result: value,
    };
  },
  bundle: ({ node, nodeInputs }) => {
    const config = asRecord(node.config?.bundle);
    const includePorts = Array.isArray(config['includePorts'])
      ? (config['includePorts'] as unknown[])
          .map((entry: unknown): string => String(entry ?? '').trim())
          .filter((entry: string): boolean => entry.length > 0)
      : node.inputs;
    const bundle = includePorts.reduce<Record<string, unknown>>((acc, port) => {
      if (nodeInputs[port] !== undefined) {
        acc[port] = nodeInputs[port];
      }
      return acc;
    }, {});
    return { bundle };
  },
  mutator: ({ node, nodeInputs }) => {
    const inputContext = asRecord(nodeInputs['context']);
    const input = String(inputContext['value'] ?? '');
    const suffix = String(node.config?.mutator?.suffix ?? '');
    const value = `${input}${suffix}`;
    const context = { ...inputContext, value };
    return {
      context,
      value,
    };
  },
  context: ({ nodeInputs }) => {
    const rawContext = asRecord(nodeInputs['context']);
    const entityId = typeof rawContext['entityId'] === 'string' ? rawContext['entityId'] : '';
    const entityType = typeof rawContext['entityType'] === 'string' ? rawContext['entityType'] : '';
    const entityJson = asRecord(rawContext['entityJson']);
    return {
      context: rawContext,
      entityId,
      entityType,
      entityJson,
    };
  },
  trigger: () => ({
    trigger: true,
    triggerName: 'manual',
  }),
  db_schema: () => ({
    schema: {
      provider: 'all',
      collections: [],
    },
    context: {
      source: 'db_schema',
    },
  }),
  simulation: ({ node }) => {
    const simulationConfig = asRecord(node.config?.simulation);
    const entityId = String(
      simulationConfig['entityId'] ?? simulationConfig['productId'] ?? 'sim-wave-a'
    );
    const entityType = String(simulationConfig['entityType'] ?? 'product');
    return {
      context: {
        source: 'simulation',
        entityId,
        entityType,
        value: entityId,
      },
      entityId,
      entityType,
      productId: entityId,
    };
  },
  fetcher: ({ nodeInputs }) => {
    const context = asRecord(nodeInputs['context']);
    const meta = asRecord(nodeInputs['meta']);
    const entityId =
      typeof nodeInputs['entityId'] === 'string'
        ? nodeInputs['entityId']
        : typeof context['entityId'] === 'string'
          ? context['entityId']
          : '';
    const entityType =
      typeof nodeInputs['entityType'] === 'string'
        ? nodeInputs['entityType']
        : typeof context['entityType'] === 'string'
          ? context['entityType']
          : 'product';
    return {
      context,
      meta,
      entityId,
      entityType,
    };
  },
  validator: ({ node, nodeInputs }) => {
    const contextValue = asRecord(nodeInputs['context']);
    const config = asRecord(node.config?.validator);
    const requiredPaths = Array.isArray(config['requiredPaths'])
      ? (config['requiredPaths'] as unknown[])
          .map((entry: unknown): string => String(entry ?? '').trim())
          .filter((entry: string): boolean => entry.length > 0)
      : [];
    const mode = String(config['mode'] ?? 'all');
    const missing = requiredPaths.filter((pathValue: string): boolean => {
      const value = contextValue[pathValue];
      if (value === undefined || value === null) return true;
      if (typeof value === 'string' && value.trim().length === 0) return true;
      return false;
    });
    const valid = mode === 'any' ? missing.length < requiredPaths.length : missing.length === 0;
    return {
      context: contextValue,
      valid,
      errors: missing,
    };
  },
  gate: ({ node, nodeInputs }) => {
    const contextValue = asRecord(nodeInputs['context']);
    const validInput = nodeInputs['valid'];
    const errorsInput = Array.isArray(nodeInputs['errors'])
      ? nodeInputs['errors'].map((entry: unknown) => String(entry ?? ''))
      : [];
    const config = asRecord(node.config?.gate);
    const mode = String(config['mode'] ?? 'block');
    const failMessage = String(config['failMessage'] ?? 'Gate blocked');
    const isValid = typeof validInput === 'boolean' ? validInput : Boolean(validInput);

    if (!isValid && mode === 'block') {
      return {
        context: null,
        valid: false,
        errors: errorsInput.length > 0 ? errorsInput : [failMessage],
      };
    }

    return {
      context: contextValue,
      valid: isValid,
      errors: errorsInput,
    };
  },
  compare: ({ node, nodeInputs }) => {
    const config = asRecord(node.config?.compare);
    const operator = String(config['operator'] ?? 'eq');
    const compareTo = String(config['compareTo'] ?? '');
    const caseSensitive = Boolean(config['caseSensitive']);
    const message = String(config['message'] ?? 'Comparison failed');
    const currentValue = nodeInputs['value'];
    const base = String(currentValue ?? '');
    const value = caseSensitive ? base : base.toLowerCase();
    const target = caseSensitive ? compareTo : compareTo.toLowerCase();
    const valid = (() => {
      if (operator === 'eq') return value === target;
      if (operator === 'neq') return value !== target;
      if (operator === 'gt') return Number(value) > Number(target);
      if (operator === 'gte') return Number(value) >= Number(target);
      if (operator === 'lt') return Number(value) < Number(target);
      if (operator === 'lte') return Number(value) <= Number(target);
      if (operator === 'contains') return value.includes(target);
      if (operator === 'startsWith') return value.startsWith(target);
      if (operator === 'endsWith') return value.endsWith(target);
      if (operator === 'isEmpty') return value.trim() === '';
      if (operator === 'notEmpty') return value.trim() !== '';
      return false;
    })();

    return {
      value: currentValue,
      valid,
      errors: valid ? [] : [message],
    };
  },
  delay: ({ nodeInputs }) => {
    const delayed: Record<string, unknown> = {};
    if (nodeInputs['value'] !== undefined) {
      delayed['value'] = nodeInputs['value'];
    }
    if (nodeInputs['bundle'] !== undefined) {
      delayed['bundle'] = nodeInputs['bundle'];
    }
    return delayed;
  },
  iterator: ({ nodeInputs }) => {
    const raw = nodeInputs['value'];
    const values = Array.isArray(raw) ? raw : [raw];
    const value = values.length > 0 ? values[0] : null;
    return {
      value,
      index: values.length > 0 ? 0 : -1,
      total: values.length,
      done: true,
      status: 'completed',
    };
  },
  regex: ({ node, nodeInputs }) => {
    const input = String(nodeInputs['value'] ?? '');
    const pattern = String(node.config?.regex?.pattern ?? '\\s+');
    const flags = String(node.config?.regex?.flags ?? 'g');
    const transformed = (() => {
      try {
        return input.replace(new RegExp(pattern, flags), '_');
      } catch {
        return input;
      }
    })();
    return {
      grouped: { transformed: [transformed] },
      matches: [transformed],
      value: transformed,
      aiPrompt: '',
    };
  },
  validation_pattern: ({ nodeInputs }) => {
    const rawInput = nodeInputs['value'] ?? nodeInputs['prompt'] ?? nodeInputs['result'] ?? '';
    const text = String(rawInput ?? '');
    return {
      value: text,
      result: text,
      context: nodeInputs['context'] ?? null,
      valid: true,
      errors: [],
      bundle: {
        source: 'global_stack',
        issueCount: 0,
      },
    };
  },
  router: ({ node, nodeInputs }) => {
    const config = asRecord(node.config?.router);
    const mode = String(config['mode'] ?? 'valid');
    const matchMode = String(config['matchMode'] ?? 'truthy');
    const compareTo = String(config['compareTo'] ?? '');
    const valueCandidate = mode === 'valid' ? nodeInputs['valid'] : nodeInputs['value'];
    const asString = String(valueCandidate ?? '');
    const shouldPass = (() => {
      if (matchMode === 'falsy') return !valueCandidate;
      if (matchMode === 'equals') return asString === compareTo;
      if (matchMode === 'contains') return asString.includes(compareTo);
      return Boolean(valueCandidate);
    })();

    if (!shouldPass) {
      return {};
    }

    const next: Record<string, unknown> = {};
    if (nodeInputs['value'] !== undefined) {
      next['value'] = nodeInputs['value'];
    }
    if (nodeInputs['bundle'] !== undefined) {
      next['bundle'] = nodeInputs['bundle'];
    }
    return next;
  },
  string_mutator: ({ node, nodeInputs }) => {
    const rawInput = String(
      nodeInputs['value'] ?? nodeInputs['prompt'] ?? nodeInputs['result'] ?? ''
    );
    const config = asRecord(node.config?.stringMutator);
    const operations = Array.isArray(config['operations'])
      ? (config['operations'] as Array<Record<string, unknown>>)
      : [];

    let current = rawInput;
    operations.forEach((operation) => {
      const type = String(operation['type'] ?? '');
      if (type === 'replace') {
        const search = String(operation['search'] ?? '');
        if (!search) return;
        const replace = String(operation['replace'] ?? '');
        const mode = String(operation['matchMode'] ?? 'all');
        current =
          mode === 'all' ? current.split(search).join(replace) : current.replace(search, replace);
      } else if (type === 'append') {
        const value = String(operation['value'] ?? '');
        const position = String(operation['position'] ?? 'suffix');
        current = position === 'prefix' ? `${value}${current}` : `${current}${value}`;
      }
    });

    return { value: current };
  },
  template: ({ node, nodeInputs }) => {
    const template = String(node.config?.template?.template ?? '{{value}}');
    const rendered = template.replace(/{{\s*value\s*}}/g, String(nodeInputs['value'] ?? ''));
    return { prompt: rendered };
  },
  poll: ({ nodeInputs }) => {
    const result = nodeInputs['result'] ?? nodeInputs['value'] ?? nodeInputs['query'] ?? null;
    const jobIdInput = nodeInputs['jobId'];
    const jobId =
      typeof jobIdInput === 'string' && jobIdInput.trim().length > 0
        ? jobIdInput
        : 'job-poll-wave-a';
    const bundle = asRecord(nodeInputs['bundle']);
    return {
      result,
      status: 'completed',
      jobId,
      bundle,
    };
  },
  prompt: ({ node, nodeInputs }) => {
    const template = String(node.config?.prompt?.template ?? '{{result}}');
    const rendered = template.replace(/{{\s*result\s*}}/g, String(nodeInputs['result'] ?? ''));
    return {
      prompt: rendered,
      images: Array.isArray(nodeInputs['images']) ? nodeInputs['images'] : [],
    };
  },
  agent: ({ nodeInputs }) => ({
    result: `agent:${String(nodeInputs['prompt'] ?? '')}`,
    jobId: 'job-agent-wave-a',
  }),
  learner_agent: ({ nodeInputs }) => ({
    result: `learner:${String(nodeInputs['prompt'] ?? '')}`,
    jobId: 'job-learner-agent-wave-a',
    sources: [
      {
        id: 'source-wave-a',
        score: 1,
      },
    ],
  }),
  model: ({ nodeInputs }) => ({
    result: String(nodeInputs['prompt'] ?? ''),
    jobId: 'job-model-wave-a',
  }),
  playwright: ({ nodeInputs }) => {
    const url = String(nodeInputs['url'] ?? 'https://example.com/path');
    return {
      result: `playwright:${url}`,
      jobId: 'job-playwright-wave-a',
      screenshot: `screenshot:${url}`,
      html: `<html><body>${url}</body></html>`,
    };
  },
  audio_oscillator: ({ node, nodeInputs }) => {
    const config = asRecord(node.config?.audioOscillator);
    const frequency = Number(nodeInputs['frequency'] ?? config['frequencyHz'] ?? 440);
    const waveform = String(nodeInputs['waveform'] ?? config['waveform'] ?? 'sine');
    const gain = Number(nodeInputs['gain'] ?? config['gain'] ?? 0.25);
    const durationMs = Number(nodeInputs['durationMs'] ?? config['durationMs'] ?? 400);
    const audioSignal = {
      source: 'oscillator',
      waveform,
      frequency,
      gain,
      durationMs,
    };
    return {
      audioSignal,
      frequency,
      waveform,
      gain,
      durationMs,
    };
  },
  audio_speaker: ({ nodeInputs }) => {
    const signal = nodeInputs['audioSignal'];
    return {
      status: 'completed',
      audioSignal:
        signal && typeof signal === 'object' ? signal : { source: 'speaker', signal: 'none' },
    };
  },
  ai_description: ({ nodeInputs }) => {
    const title = String(nodeInputs['title'] ?? '');
    const imageCount = Array.isArray(nodeInputs['images']) ? nodeInputs['images'].length : 0;
    return {
      description_en: `ai-description:${title || 'untitled'}:${imageCount}`,
    };
  },
  http: ({ node, nodeInputs }) => {
    const body = nodeInputs['body'] ?? nodeInputs['url'] ?? '';
    const bundle = asRecord(nodeInputs['bundle']);
    const config = asRecord(node.config?.http);
    const method = String(config['method'] ?? 'GET');
    return {
      value: `http:${method}:${String(body)}`,
      bundle,
    };
  },
  database: ({ nodeInputs }) => {
    const queryInput = nodeInputs['query'] ?? nodeInputs['value'] ?? nodeInputs['result'] ?? '';
    const schema = asRecord(nodeInputs['schema']);
    const bundle = asRecord(nodeInputs['bundle']);
    const query = String(queryInput ?? '');
    const schemaProvider = String(schema['provider'] ?? 'unknown');
    return {
      result: {
        query,
        schemaProvider,
      },
      bundle,
      content_en: query,
      aiPrompt: `db:${schemaProvider}:${query}`,
    };
  },
  api_advanced: ({ node, nodeInputs }) => {
    const body = String(nodeInputs['body'] ?? '');
    const bundle = asRecord(nodeInputs['bundle']);
    const config = asRecord(node.config?.apiAdvanced);
    const method = String(config['method'] ?? 'GET');
    return {
      value: `api_advanced:${method}:${body}`,
      bundle,
      status: 200,
      headers: {},
      items: [body],
      route: 'success',
      error: null,
      success: true,
    };
  },
  description_updater: ({ nodeInputs }) => ({
    description_en: String(nodeInputs['description_en'] ?? ''),
  }),
  viewer: () => ({}),
  notification: () => ({}),
};

export const stripRuntimeTelemetry = (
  history: Record<string, RuntimeHistoryEntry[]> | undefined
): Record<string, Array<Record<string, unknown>>> => {
  if (!history) return {};
  return Object.fromEntries(
    Object.entries(history).map(([nodeId, entries]) => [
      nodeId,
      entries.map((entry: RuntimeHistoryEntry) => {
        const clone = { ...entry } as Record<string, unknown>;
        delete clone['timestamp'];
        delete clone['durationMs'];
        delete clone['delayMs'];
        delete clone['runtimeStrategy'];
        delete clone['runtimeResolutionSource'];
        delete clone['runtimeCodeObjectId'];
        return clone;
      }),
    ])
  );
};

export const runKernelPath = async (mode: RuntimeMode, value: unknown) => {
  const nodes = buildKernelNodes(value);
  const edges = buildKernelEdges();
  const profileNodeEvents: Array<Record<string, unknown>> = [];

  const runtimeKernel = createNodeRuntimeKernel({
    resolveLegacyHandler: (nodeType: string) => pilotHandlers[nodeType] ?? null,
    ...(mode === 'legacy_adapter' ? { runtimeKernelNodeTypes: [] } : {}),
  });

  const result = await evaluateGraphInternal(nodes, edges, {
    runId: `run-${mode}`,
    resolveHandler: runtimeKernel.resolveHandler,
    resolveHandlerTelemetry: (type: string) =>
      toNodeRuntimeResolutionTelemetry(runtimeKernel.resolveDescriptor(type)),
    recordHistory: true,
    profile: {
      onEvent: (event): void => {
        if (event.type === 'node') {
          profileNodeEvents.push(event as unknown as Record<string, unknown>);
        }
      },
    },
    reportAiPathsError: (): void => {},
  });

  return {
    result,
    profileNodeEvents,
  };
};

export const runTransformKernelPath = async (mode: RuntimeMode, title: string) => {
  const nodes = buildTransformKernelNodes(title);
  const edges = buildTransformKernelEdges();
  const profileNodeEvents: Array<Record<string, unknown>> = [];

  const runtimeKernel = createNodeRuntimeKernel({
    resolveLegacyHandler: (nodeType: string) => pilotHandlers[nodeType] ?? null,
    ...(mode === 'legacy_adapter' ? { runtimeKernelNodeTypes: [] } : {}),
  });

  const result = await evaluateGraphInternal(nodes, edges, {
    runId: `run-transform-${mode}`,
    maxIterations: 90,
    resolveHandler: runtimeKernel.resolveHandler,
    resolveHandlerTelemetry: (type: string) =>
      toNodeRuntimeResolutionTelemetry(runtimeKernel.resolveDescriptor(type)),
    recordHistory: true,
    profile: {
      onEvent: (event): void => {
        if (event.type === 'node') {
          profileNodeEvents.push(event as unknown as Record<string, unknown>);
        }
      },
    },
    reportAiPathsError: (): void => {},
  });

  return {
    result,
    profileNodeEvents,
  };
};


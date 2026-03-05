import { describe, expect, it } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandler, RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';
import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import {
  createNodeRuntimeKernel,
  toNodeRuntimeResolutionTelemetry,
} from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';

type RuntimeMode = 'legacy_adapter' | 'code_object_v3';

const buildPilotNodes = (value: unknown): AiNode[] => [
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

const buildPilotEdges = (): Edge[] => [
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

const buildTransformPilotNodes = (title: string): AiNode[] => [
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

const buildTransformPilotEdges = (): Edge[] => [
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
    id: 'edge-template-description-updater',
    from: 'node-template',
    to: 'node-description-updater',
    fromPort: 'prompt',
    toPort: 'description_en',
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
    id: 'edge-template-viewer',
    from: 'node-template',
    to: 'node-viewer',
    fromPort: 'prompt',
    toPort: 'prompt',
  },
];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const pilotHandlers: Record<string, NodeHandler> = {
  constant: ({ node }) => {
    const valueType = node.config?.constant?.valueType;
    const rawValue = node.config?.constant?.value;
    const value = valueType === 'number' ? Number(rawValue ?? 0) : rawValue ?? '';
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
    const value = nodeInputs['value'] ?? nodeInputs['context'] ?? nodeInputs['result'] ?? nodeInputs['bundle'];
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
    const entityId = String(simulationConfig['entityId'] ?? simulationConfig['productId'] ?? 'sim-wave-a');
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
    const rawInput = String(nodeInputs['value'] ?? nodeInputs['prompt'] ?? nodeInputs['result'] ?? '');
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
        current = mode === 'all' ? current.split(search).join(replace) : current.replace(search, replace);
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
  description_updater: ({ nodeInputs }) => ({
    description_en: String(nodeInputs['description_en'] ?? ''),
  }),
  viewer: () => ({}),
  notification: () => ({}),
};

const stripRuntimeTelemetry = (
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

const runPilotPath = async (mode: RuntimeMode, value: unknown) => {
  const nodes = buildPilotNodes(value);
  const edges = buildPilotEdges();
  const profileNodeEvents: Array<Record<string, unknown>> = [];

  const runtimeKernel = createNodeRuntimeKernel({
    resolveLegacyHandler: (nodeType: string) => pilotHandlers[nodeType] ?? null,
    ...(mode === 'legacy_adapter' ? { v3PilotNodeTypes: [] } : {}),
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

const runTransformPilotPath = async (mode: RuntimeMode, title: string) => {
  const nodes = buildTransformPilotNodes(title);
  const edges = buildTransformPilotEdges();
  const profileNodeEvents: Array<Record<string, unknown>> = [];

  const runtimeKernel = createNodeRuntimeKernel({
    resolveLegacyHandler: (nodeType: string) => pilotHandlers[nodeType] ?? null,
    ...(mode === 'legacy_adapter' ? { v3PilotNodeTypes: [] } : {}),
  });

  const result = await evaluateGraphInternal(nodes, edges, {
    runId: `run-transform-${mode}`,
    maxIterations: 30,
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

describe('engine-core v3 pilot dual-run parity', () => {
  it('keeps outputs and node statuses identical for numeric pilot path', async () => {
    const legacy = await runPilotPath('legacy_adapter', 7);
    const v3 = await runPilotPath('code_object_v3', 7);

    expect(legacy.result.status).toBe('completed');
    expect(v3.result.status).toBe('completed');
    expect(legacy.result.outputs).toEqual(v3.result.outputs);
    expect(legacy.result.nodeStatuses).toEqual(v3.result.nodeStatuses);
    expect(stripRuntimeTelemetry(legacy.result.history)).toEqual(stripRuntimeTelemetry(v3.result.history));

    const legacyNodeEvents = legacy.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );
    const v3NodeEvents = v3.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );

    expect(legacyNodeEvents).toHaveLength(3);
    expect(v3NodeEvents).toHaveLength(3);
    legacyNodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('legacy_adapter');
      expect(event['runtimeCodeObjectId']).toBeNull();
    });
    v3NodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('code_object_v3');
      expect(typeof event['runtimeCodeObjectId']).toBe('string');
    });
  });

  it('keeps outputs and node statuses identical for non-numeric fallback path', async () => {
    const legacy = await runPilotPath('legacy_adapter', 'abc');
    const v3 = await runPilotPath('code_object_v3', 'abc');

    expect(legacy.result.status).toBe('completed');
    expect(v3.result.status).toBe('completed');
    expect(legacy.result.outputs).toEqual(v3.result.outputs);
    expect(legacy.result.nodeStatuses).toEqual(v3.result.nodeStatuses);
    expect(stripRuntimeTelemetry(legacy.result.history)).toEqual(stripRuntimeTelemetry(v3.result.history));

    expect(legacy.result.outputs['node-template']?.['prompt']).toBe('sum=abc');
    expect(v3.result.outputs['node-template']?.['prompt']).toBe('sum=abc');
  });

  it('keeps outputs, statuses, and strategy telemetry identical for transform pilot path', async () => {
    const legacy = await runTransformPilotPath('legacy_adapter', 'Wave A Kernel');
    const v3 = await runTransformPilotPath('code_object_v3', 'Wave A Kernel');

    expect(legacy.result.status).toBe('completed');
    expect(v3.result.status).toBe('completed');
    expect(legacy.result.outputs).toEqual(v3.result.outputs);
    expect(legacy.result.nodeStatuses).toEqual(v3.result.nodeStatuses);
    expect(stripRuntimeTelemetry(legacy.result.history)).toEqual(stripRuntimeTelemetry(v3.result.history));

    const legacyPrompt = legacy.result.outputs['node-template']?.['prompt'];
    const v3Prompt = v3.result.outputs['node-template']?.['prompt'];
    expect(typeof legacyPrompt).toBe('string');
    expect(legacyPrompt).toBe(v3Prompt);
    expect(String(legacyPrompt)).toContain('-mutated-v3');

    const legacyNodeEvents = legacy.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );
    const v3NodeEvents = v3.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );

    expect(legacyNodeEvents).toHaveLength(23);
    expect(v3NodeEvents).toHaveLength(23);

    legacyNodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('legacy_adapter');
      expect(event['runtimeCodeObjectId']).toBeNull();
    });
    v3NodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('code_object_v3');
      expect(typeof event['runtimeCodeObjectId']).toBe('string');
    });
  });
});

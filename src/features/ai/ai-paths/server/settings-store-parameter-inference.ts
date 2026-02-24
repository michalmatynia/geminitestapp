import { normalizeNodes } from '@/features/ai/ai-paths/lib/core/normalization';
import { sanitizeEdges } from '@/features/ai/ai-paths/lib/core/utils/graph';
import type { PathConfig } from '@/shared/contracts/ai-paths';

export const PARAMETER_INFERENCE_PATH_ID = 'path_syr8f4';
export const PARAMETER_INFERENCE_PATH_NAME = 'Parameter Inference';
export const PARAMETER_INFERENCE_TRIGGER_BUTTON_ID = '0ef40981-7ac6-416e-9205-7200289f851c';
export const PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME = 'Infer Parameters';

export const buildParameterInferencePathConfigValue = (timestamp: string): string => {
  const config: PathConfig = {
    id: PARAMETER_INFERENCE_PATH_ID,
    version: 12,
    name: PARAMETER_INFERENCE_PATH_NAME,
    description:
      'Infer product parameter values from name and images, then update product parameters.',
    trigger: 'Product Modal - Infer Parameters',
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'block',
    strictFlowMode: true,
    nodes: [
      {
        type: 'trigger',
        title: 'Trigger: Infer Parameters',
        description: `User trigger button (${PARAMETER_INFERENCE_TRIGGER_BUTTON_ID}).`,
        inputs: [],
        outputs: [
          'trigger',
          'triggerName',
        ],
        config: {
          trigger: {
            event: PARAMETER_INFERENCE_TRIGGER_BUTTON_ID,
          },
        },
        id: 'node-trigger-params',
        position: { x: 24, y: 520 },
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        type: 'fetcher',
        title: 'Fetcher: Trigger Context',
        description: 'Resolve context, metadata, and entity identity from trigger input.',
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
            waitForInputs: true,
            inputContracts: {
              trigger: { required: true },
              context: { required: false },
              meta: { required: false },
              entityId: { required: false },
              entityType: { required: false },
            },
          },
        },
        id: 'node-fetcher-params',
        position: { x: 280, y: 520 },
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        type: 'parser',
        title: 'JSON Parser',
        description: 'Extract fields into outputs or a single bundle.',
        inputs: ['entityJson', 'context'],
        outputs: ['bundle', 'images'],
        id: 'node-parser-params',
        position: { x: 540, y: 520 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          parser: {
            mappings: {
              catalogId: '$.catalogs[0].catalogId',
              content_en: '',
              images: '',
              productId: '',
              title: '',
            },
            outputMode: 'bundle',
            presetId: 'product_core',
          },
          notes: {
            text: 'Grab product name, description and images.',
          },
        },
      },
      {
        type: 'database',
        title: 'Database Query',
        description:
          'Load available parameters for product catalog (with fallback by product parameter IDs).',
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
        outputs: ['result', 'bundle', 'aiPrompt'],
        id: 'node-query-params',
        position: { x: 560, y: 110 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          database: {
            operation: 'query',
            entityType: 'product',
            idField: 'entityId',
            mode: 'replace',
            query: {
              provider: 'auto',
              collection: 'product_parameters',
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate:
                '{\n' +
                '  "catalogId": "{{bundle.catalogId}}"\n' +
                '}',
              limit: 200,
              sort: '',
              projection: '',
              single: false,
            },
            writeSource: 'bundle',
            writeSourcePath: '',
            dryRun: false,
            distinctField: '',
            updateTemplate: '',
            skipEmpty: true,
            trimStrings: false,
            aiPrompt: '',
            validationRuleIds: [],
          },
          runtime: { waitForInputs: true },
        },
      },
      {
        type: 'prompt',
        title: 'Prompt',
        description: 'Build parameter template rows for products with empty parameters.',
        inputs: ['result'],
        outputs: ['prompt'],
        id: 'node-prompt-template-params',
        position: { x: 1040, y: 40 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          prompt: {
            template:
              'You create PRODUCT parameter template rows from parameter definitions JSON.\n' +
              'Parameter definitions JSON (array): {{result}}\n\n' +
              'Rules:\n' +
              '1. Return ONLY valid JSON array.\n' +
              '2. Output one item per definition with id.\n' +
              '3. Item schema: {"parameterId":"<id>","value":""}.\n' +
              '4. parameterId must exactly match definition id.\n' +
              '5. Skip definitions with missing/empty id.\n' +
              '6. Do not include extra keys.\n' +
              '7. No markdown, no explanations, no code fences.\n' +
              '8. If input has no valid definitions, return [].',
          },
        },
      },
      {
        type: 'model',
        title: 'Model',
        description: 'Create parameter template rows from definitions.',
        inputs: ['prompt', 'context'],
        outputs: ['result', 'jobId'],
        id: 'node-model-template-params',
        position: { x: 1460, y: 40 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          model: {
            modelId: 'gemma3:12b',
            temperature: 0,
            maxTokens: 900,
            vision: false,
            waitForResult: true,
          },
        },
      },
      {
        type: 'validation_pattern',
        title: 'VP: JSON Cleaner',
        description: 'Clean raw model JSON output by stripping markdown fences and surrounding text.',
        inputs: ['value', 'prompt', 'result', 'context'],
        outputs: ['value', 'result', 'context', 'valid', 'errors', 'bundle'],
        id: 'node-vp-template-params',
        position: { x: 1880, y: 40 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          validationPattern: {
            source: 'path_local' as const,
            localListName: 'param-template-json-cleaner',
            localListDescription: 'Cleans catalog parameter template JSON from model response',
            runtimeMode: 'validate_and_autofix' as const,
            failPolicy: 'report_only' as const,
            inputPort: 'result' as const,
            outputPort: 'value' as const,
            maxAutofixPasses: 3,
            includeRuleIds: [],
            rules: [
              {
                id: 'strip-code-fences',
                kind: 'regex' as const,
                enabled: true,
                severity: 'warning' as const,
                title: 'Strip markdown code fences',
                description: null,
                message: 'Model response contains markdown code fences',
                similar: [],
                pattern: '```(?:json)?\\s*',
                flags: 'gi',
                autofix: {
                  enabled: true,
                  operations: [
                    {
                      kind: 'replace' as const,
                      pattern: '```(?:json)?\\s*',
                      flags: 'gi',
                      replacement: '',
                    },
                  ],
                },
              },
              {
                id: 'strip-before-bracket',
                kind: 'regex' as const,
                enabled: true,
                severity: 'warning' as const,
                title: 'Strip text before opening bracket',
                description: null,
                message: 'Response contains text before JSON array',
                similar: [],
                pattern: '^[^\\[]+',
                flags: '',
                autofix: {
                  enabled: true,
                  operations: [
                    {
                      kind: 'replace' as const,
                      pattern: '^[^\\[]+',
                      flags: '',
                      replacement: '',
                    },
                  ],
                },
              },
              {
                id: 'strip-after-bracket',
                kind: 'regex' as const,
                enabled: true,
                severity: 'warning' as const,
                title: 'Strip text after closing bracket',
                description: null,
                message: 'Response contains text after JSON array',
                similar: [],
                pattern: '\\][^\\]]+$',
                flags: '',
                autofix: {
                  enabled: true,
                  operations: [
                    {
                      kind: 'replace' as const,
                      pattern: '\\][^\\]]+$',
                      flags: '',
                      replacement: ']',
                    },
                  ],
                },
              },
            ],
            learnedRules: [],
          },
          runtime: { waitForInputs: true },
        },
      },
      {
        type: 'logical_condition',
        title: 'LC: Check Template',
        description: 'Check that the cleaned template JSON is not empty.',
        inputs: ['value', 'result', 'context', 'bundle'],
        outputs: ['value', 'valid', 'errors'],
        id: 'node-lc-template-params',
        position: { x: 2100, y: 40 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          logicalCondition: {
            combinator: 'and' as const,
            conditions: [
              {
                id: 'check-template-not-empty',
                inputPort: 'value' as const,
                operator: 'notEmpty' as const,
              },
            ],
          },
          runtime: { waitForInputs: true },
        },
      },
      {
        type: 'router',
        title: 'Router: Seed Gate',
        description: 'Only pass template JSON to seed when it is non-empty.',
        inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
        outputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
        id: 'node-router-seed-params',
        position: { x: 2260, y: 40 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          router: {
            mode: 'valid' as const,
            matchMode: 'truthy' as const,
            compareTo: '',
          },
          runtime: { waitForInputs: true },
        },
      },
      {
        type: 'database',
        title: 'Database Query',
        description: 'Seed product parameter rows when parameters are missing/empty.',
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
        id: 'node-seed-params',
        position: { x: 2480, y: 40 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          database: {
            operation: 'update',
            entityType: 'product',
            idField: 'entityId',
            mode: 'replace',
            updateStrategy: 'one',
            useMongoActions: true,
            actionCategory: 'update',
            action: 'findOneAndUpdate',
            mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
            updatePayloadMode: 'custom',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'custom',
              preset: 'by_id',
              field: '_id',
              idType: 'string',
              queryTemplate:
                '{\n' +
                '  "id": "{{entityId}}",\n' +
                '  "$or": [\n' +
                '    { "parameters": { "$exists": false } },\n' +
                '    { "parameters": { "$size": 0 } }\n' +
                '  ]\n' +
                '}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
            writeSource: 'bundle',
            writeSourcePath: '',
            dryRun: false,
            distinctField: '',
            updateTemplate:
              '{\n' +
              '  "$set": {\n' +
              '    "parameters": {{value}}\n' +
              '  }\n' +
              '}',
            skipEmpty: true,
            trimStrings: false,
            aiPrompt: '',
            validationRuleIds: [],
          },
          runtime: { waitForInputs: true },
        },
      },
      {
        type: 'prompt',
        title: 'Prompt',
        description: 'Build prompt for parameter inference.',
        inputs: ['bundle', 'title', 'images', 'result', 'entityId'],
        outputs: ['prompt', 'images'],
        id: 'node-prompt-params',
        position: { x: 1080, y: 320 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          prompt: {
            template:
              'Infer product PARAMETERS in ENGLISH from the product data below.\n' +
              'Product name: "{{title}}"\n' +
              'Product description: "{{content_en}}"\n' +
              'Available parameters JSON (objects with id/label/selectorType/options): {{result}}\n\n' +
              'Rules:\n' +
              '1. Return ONLY valid JSON array.\n' +
              '2. Output schema per item: {"parameterId":"<id>","value":"<english value>"}.\n' +
              '3. parameterId MUST exactly match an "id" from Available parameters JSON.\n' +
              '4. Never invent semantic IDs like "size", "material", "color".\n' +
              '5. Skip parameters you cannot infer confidently.\n' +
              '6. No markdown, no explanations, no code fences.\n' +
              '7. If nothing can be inferred, return [].\n' +
              '8. For any multi-value parameter, return ONE string joined with "|" and no spaces around "|", e.g. "Black|Red|Blue".\n' +
              '9. Capitalize value tokens in Title Case (e.g. "Black", "Stainless Steel").',
          },
        },
      },
      {
        type: 'model',
        title: 'Model',
        description: 'Run vision model to infer parameters.',
        inputs: ['prompt', 'images', 'context'],
        outputs: ['result', 'jobId'],
        id: 'node-model-params',
        position: { x: 1540, y: 560 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          model: {
            modelId: 'gemma3:12b',
            temperature: 0.2,
            maxTokens: 900,
            vision: true,
            waitForResult: true,
          },
        },
      },
      {
        type: 'regex',
        title: 'Regex JSON Extract',
        description: 'Extract JSON array from model response.',
        inputs: ['value', 'prompt', 'regexCallback'],
        outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
        id: 'node-regex-params',
        position: { x: 2000, y: 560 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          regex: {
            pattern: '\\[[\\s\\S]*\\]',
            flags: '',
            mode: 'extract_json',
            matchMode: 'first_overall',
            groupBy: 'match',
            outputMode: 'object',
            includeUnmatched: false,
            unmatchedKey: '__unmatched__',
            splitLines: false,
            sampleText: '',
            aiPrompt: '',
            aiAutoRun: false,
          },
          runtime: { waitForInputs: true },
        },
      },
      {
        type: 'database',
        title: 'Database Query',
        description: 'Update product parameters with inferred values.',
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
        id: 'node-update-params',
        position: { x: 2460, y: 560 },
        createdAt: timestamp,
        updatedAt: timestamp,
        config: {
          database: {
            operation: 'update',
            entityType: 'product',
            idField: 'entityId',
            mode: 'replace',
            updateStrategy: 'one',
            useMongoActions: true,
            actionCategory: 'update',
            action: 'updateOne',
            mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
            updatePayloadMode: 'custom',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'custom',
              preset: 'by_id',
              field: '_id',
              idType: 'string',
              queryTemplate: '{\n  "id": "{{entityId}}"\n}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
            writeSource: 'bundle',
            writeSourcePath: '',
            dryRun: false,
            distinctField: '',
            updateTemplate:
              '{\n' +
              '  "$set": {\n' +
              '    "parameters": {{value}}\n' +
              '  }\n' +
              '}',
            skipEmpty: true,
            trimStrings: false,
            aiPrompt: '',
            validationRuleIds: [],
            parameterInferenceGuard: {
              enabled: true,
              targetPath: 'parameters',
              definitionsPort: 'result',
              definitionsPath: '',
              enforceOptionLabels: false,
              allowUnknownParameterIds: false,
            },
          },
          runtime: { waitForInputs: true },
        },
      },
    ],
    edges: [
      {
        id: 'edge-params-trigger-fetcher',
        from: 'node-trigger-params',
        to: 'node-fetcher-params',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-params-00',
        from: 'node-parser-params',
        to: 'node-query-params',
        fromPort: 'bundle',
        toPort: 'bundle',
      },
      {
        id: 'edge-params-01',
        from: 'node-fetcher-params',
        to: 'node-parser-params',
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-params-02',
        from: 'node-fetcher-params',
        to: 'node-query-params',
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-params-03',
        from: 'node-query-params',
        to: 'node-prompt-template-params',
        fromPort: 'result',
        toPort: 'result',
      },
      {
        id: 'edge-params-04',
        from: 'node-prompt-template-params',
        to: 'node-model-template-params',
        fromPort: 'prompt',
        toPort: 'prompt',
      },
      {
        id: 'edge-params-05',
        from: 'node-model-template-params',
        to: 'node-vp-template-params',
        fromPort: 'result',
        toPort: 'result',
      },
      {
        id: 'edge-params-vp-lc',
        from: 'node-vp-template-params',
        to: 'node-lc-template-params',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-params-lc-router-valid',
        from: 'node-lc-template-params',
        to: 'node-router-seed-params',
        fromPort: 'valid',
        toPort: 'valid',
      },
      {
        id: 'edge-params-vp-router-value',
        from: 'node-vp-template-params',
        to: 'node-router-seed-params',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-params-router-seed',
        from: 'node-router-seed-params',
        to: 'node-seed-params',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-params-07',
        from: 'node-fetcher-params',
        to: 'node-seed-params',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
      {
        id: 'edge-params-08',
        from: 'node-fetcher-params',
        to: 'node-seed-params',
        fromPort: 'entityType',
        toPort: 'entityType',
      },
      {
        id: 'edge-params-09',
        from: 'node-parser-params',
        to: 'node-prompt-params',
        fromPort: 'bundle',
        toPort: 'bundle',
      },
      {
        id: 'edge-params-10',
        from: 'node-query-params',
        to: 'node-prompt-params',
        fromPort: 'result',
        toPort: 'result',
      },
      {
        id: 'edge-params-11',
        from: 'node-prompt-params',
        to: 'node-model-params',
        fromPort: 'prompt',
        toPort: 'prompt',
      },
      {
        id: 'edge-params-12',
        from: 'node-prompt-params',
        to: 'node-model-params',
        fromPort: 'images',
        toPort: 'images',
      },
      {
        id: 'edge-params-13',
        from: 'node-model-params',
        to: 'node-regex-params',
        fromPort: 'result',
        toPort: 'value',
      },
      {
        id: 'edge-params-14',
        from: 'node-regex-params',
        to: 'node-update-params',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-params-15',
        from: 'node-fetcher-params',
        to: 'node-update-params',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
      {
        id: 'edge-params-16',
        from: 'node-fetcher-params',
        to: 'node-update-params',
        fromPort: 'entityType',
        toPort: 'entityType',
      },
      {
        id: 'edge-params-17',
        from: 'node-query-params',
        to: 'node-update-params',
        fromPort: 'result',
        toPort: 'result',
      },
      {
        id: 'edge-params-fetcher-update-ctx',
        from: 'node-fetcher-params',
        to: 'node-update-params',
        fromPort: 'context',
        toPort: 'context',
      },
    ],
    updatedAt: timestamp,
    isLocked: false,
    isActive: true,
    parserSamples: {},
    updaterSamples: {},
  };
  const normalizedNodes = normalizeNodes(config.nodes);
  return JSON.stringify({
    ...config,
    nodes: normalizedNodes,
    edges: sanitizeEdges(normalizedNodes, config.edges),
  });
};

export const needsParameterInferenceConfigUpgrade = (
  raw: string | undefined
): boolean => {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return true;

    const version = typeof parsed['version'] === 'number' ? parsed['version'] : 0;
    const nodes = Array.isArray(parsed['nodes'])
      ? (parsed['nodes'] as Array<Record<string, unknown>>)
      : [];
    const edges = Array.isArray(parsed['edges'])
      ? (parsed['edges'] as Array<Record<string, unknown>>)
      : [];

    // Version 12+ configs: verify the key structural nodes are present.
    if (version >= 12) {
      const hasFetcher = nodes.some((node) => node?.['type'] === 'fetcher');
      if (!hasFetcher) return true;
      // VP node must be present (replaced the old regex template node at v12).
      if (!nodes.some((node) => node?.['id'] === 'node-vp-template-params')) return true;
      return false;
    }

    // Version 11: needs upgrade to 12 if missing the VP node, still has old regex node,
    // or is missing the bug-fix context edge from fetcher to update.
    if (version >= 11) {
      const hasFetcher = nodes.some((node) => node?.['type'] === 'fetcher');
      if (!hasFetcher) return true;
      if (nodes.some((node) => node?.['id'] === 'node-regex-template-params')) return true;
      if (!nodes.some((node) => node?.['id'] === 'node-vp-template-params')) return true;
      const hasCtxEdge = edges.some(
        (edge) =>
          edge?.['from'] === 'node-fetcher-params' &&
          edge?.['to'] === 'node-update-params' &&
          edge?.['fromPort'] === 'context' &&
          edge?.['toPort'] === 'context'
      );
      if (!hasCtxEdge) return true;
      return false;
    }

    if (nodes.some((node) => node?.['id'] === 'node-sim-params')) return true;

    const triggerNode = nodes.find(
      (node) => node?.['id'] === 'node-trigger-params'
    );
    const triggerEvent =
      triggerNode &&
      typeof triggerNode === 'object' &&
      triggerNode['config'] &&
      typeof triggerNode['config'] === 'object' &&
      (triggerNode['config'] as Record<string, unknown>)['trigger'] &&
      typeof (triggerNode['config'] as Record<string, unknown>)['trigger'] ===
        'object'
        ? (
          (triggerNode['config'] as Record<string, unknown>)[
            'trigger'
          ] as Record<string, unknown>
        )['event']
        : null;
    if (triggerEvent !== PARAMETER_INFERENCE_TRIGGER_BUTTON_ID) return true;

    const updateNode = nodes.find(
      (node) => node?.['id'] === 'node-update-params'
    );
    const updateDatabase =
      updateNode &&
      typeof updateNode === 'object' &&
      updateNode['config'] &&
      typeof updateNode['config'] === 'object' &&
      (updateNode['config'] as Record<string, unknown>)['database'] &&
      typeof (updateNode['config'] as Record<string, unknown>)['database'] ===
        'object'
        ? ((updateNode['config'] as Record<string, unknown>)[
          'database'
        ] as Record<string, unknown>)
        : null;
    const guardEnabled =
      updateDatabase &&
      typeof updateDatabase['parameterInferenceGuard'] === 'object' &&
      updateDatabase['parameterInferenceGuard'] !== null
        ? (
          updateDatabase['parameterInferenceGuard'] as Record<string, unknown>
        )['enabled'] === true
        : false;
    if (!guardEnabled) return true;
    const guardTargetPath =
      updateDatabase &&
      typeof updateDatabase['parameterInferenceGuard'] === 'object' &&
      updateDatabase['parameterInferenceGuard'] !== null
        ? (
          updateDatabase['parameterInferenceGuard'] as Record<string, unknown>
        )['targetPath']
        : null;
    if (guardTargetPath !== 'parameters') return true;
    const updateMappings = Array.isArray(updateDatabase?.['mappings'])
      ? (updateDatabase['mappings'] as Array<Record<string, unknown>>)
      : [];
    const writesSimpleParameters = updateMappings.some((mapping) => {
      if (!mapping || typeof mapping !== 'object') return false;
      return mapping['targetPath'] === 'parameters';
    });
    if (!writesSimpleParameters) return true;
    const updatePayloadMode =
      typeof updateDatabase?.['updatePayloadMode'] === 'string'
        ? updateDatabase['updatePayloadMode']
        : null;
    if (updatePayloadMode !== 'custom') return true;
    const updateQueryConfig =
      updateDatabase &&
      typeof updateDatabase['query'] === 'object' &&
      updateDatabase['query'] !== null
        ? (updateDatabase['query'] as Record<string, unknown>)
        : null;
    const updateQueryCollection =
      updateQueryConfig && typeof updateQueryConfig['collection'] === 'string'
        ? updateQueryConfig['collection'].trim().toLowerCase()
        : '';
    if (updateQueryCollection !== 'products') return true;
    const updateQueryMode =
      updateQueryConfig && typeof updateQueryConfig['mode'] === 'string'
        ? updateQueryConfig['mode']
        : null;
    if (updateQueryMode !== 'custom') return true;
    const updateQueryTemplate =
      updateQueryConfig &&
      typeof updateQueryConfig['queryTemplate'] === 'string'
        ? updateQueryConfig['queryTemplate'].trim()
        : '';
    if (!updateQueryTemplate) return true;
    if (
      !updateQueryTemplate.includes('"id"') ||
      !updateQueryTemplate.includes('{{entityId}}')
    ) {
      return true;
    }
    const updateTemplate =
      typeof updateDatabase?.['updateTemplate'] === 'string'
        ? updateDatabase['updateTemplate'].trim()
        : '';
    if (!updateTemplate) return true;
    if (
      !updateTemplate.includes('"$set"') ||
      !updateTemplate.includes('"parameters"') ||
      !updateTemplate.includes('{{value}}')
    ) {
      return true;
    }

    const queryNode = nodes.find((node) => node?.['id'] === 'node-query-params');
    const queryType = queryNode?.['type'];
    if (queryType !== 'database') return true;
    const queryDatabase =
      queryNode &&
      typeof queryNode === 'object' &&
      queryNode['config'] &&
      typeof queryNode['config'] === 'object' &&
      (queryNode['config'] as Record<string, unknown>)['database'] &&
      typeof (queryNode['config'] as Record<string, unknown>)['database'] ===
        'object'
        ? ((queryNode['config'] as Record<string, unknown>)[
          'database'
        ] as Record<string, unknown>)
        : null;
    const queryConfig =
      queryDatabase &&
      typeof queryDatabase['query'] === 'object' &&
      queryDatabase['query'] !== null
        ? (queryDatabase['query'] as Record<string, unknown>)
        : null;
    const queryMode =
      queryConfig && typeof queryConfig['mode'] === 'string'
        ? queryConfig['mode']
        : null;
    if (queryMode !== 'custom') return true;
    const queryCollection =
      queryConfig && typeof queryConfig['collection'] === 'string'
        ? queryConfig['collection'].trim().toLowerCase()
        : null;
    if (queryCollection !== 'product_parameters') return true;
    const queryTemplate =
      queryConfig && typeof queryConfig['queryTemplate'] === 'string'
        ? queryConfig['queryTemplate'].trim()
        : null;
    if (
      !queryTemplate ||
      !queryTemplate.includes('catalogId') ||
      !queryTemplate.includes('{{bundle.catalogId}}')
    ) {
      return true;
    }

    const promptNode = nodes.find((node) => node?.['id'] === 'node-prompt-params');
    const promptTemplate =
      promptNode &&
      typeof promptNode === 'object' &&
      promptNode['config'] &&
      typeof promptNode['config'] === 'object' &&
      (promptNode['config'] as Record<string, unknown>)['prompt'] &&
      typeof (promptNode['config'] as Record<string, unknown>)['prompt'] ===
        'object'
        ? (
          (promptNode['config'] as Record<string, unknown>)[
            'prompt'
          ] as Record<string, unknown>
        )['template']
        : null;
    if (
      typeof promptTemplate !== 'string' ||
      !promptTemplate.includes('"Black|Red|Blue"') ||
      !promptTemplate.includes('Title Case')
    ) {
      return true;
    }

    const templatePromptNode = nodes.find(
      (node) => node?.['id'] === 'node-prompt-template-params'
    );
    const templatePromptTemplate =
      templatePromptNode &&
      typeof templatePromptNode === 'object' &&
      templatePromptNode['config'] &&
      typeof templatePromptNode['config'] === 'object' &&
      (templatePromptNode['config'] as Record<string, unknown>)['prompt'] &&
      typeof (templatePromptNode['config'] as Record<string, unknown>)[
        'prompt'
      ] === 'object'
        ? (
          (templatePromptNode['config'] as Record<string, unknown>)[
            'prompt'
          ] as Record<string, unknown>
        )['template']
        : null;
    if (
      typeof templatePromptTemplate !== 'string' ||
      !templatePromptTemplate.includes(
        '{"parameterId":"<id>","value":""}'
      ) ||
      !templatePromptTemplate.includes('If input has no valid definitions')
    ) {
      return true;
    }

    const templateRegexNode = nodes.find(
      (node) => node?.['id'] === 'node-regex-template-params'
    );
    const templateRegexMode =
      templateRegexNode &&
      typeof templateRegexNode === 'object' &&
      templateRegexNode['config'] &&
      typeof templateRegexNode['config'] === 'object' &&
      (templateRegexNode['config'] as Record<string, unknown>)['regex'] &&
      typeof (templateRegexNode['config'] as Record<string, unknown>)['regex'] ===
        'object'
        ? (
          (templateRegexNode['config'] as Record<string, unknown>)[
            'regex'
          ] as Record<string, unknown>
        )['mode']
        : null;
    if (templateRegexMode !== 'extract') return true;

    const seedNode = nodes.find((node) => node?.['id'] === 'node-seed-params');
    if (seedNode?.['type'] !== 'database') return true;
    const seedDatabase =
      seedNode &&
      typeof seedNode === 'object' &&
      seedNode['config'] &&
      typeof seedNode['config'] === 'object' &&
      (seedNode['config'] as Record<string, unknown>)['database'] &&
      typeof (seedNode['config'] as Record<string, unknown>)['database'] ===
        'object'
        ? ((seedNode['config'] as Record<string, unknown>)[
          'database'
        ] as Record<string, unknown>)
        : null;
    const seedQueryConfig =
      seedDatabase &&
      typeof seedDatabase['query'] === 'object' &&
      seedDatabase['query'] !== null
        ? (seedDatabase['query'] as Record<string, unknown>)
        : null;
    const seedQueryCollection =
      seedQueryConfig && typeof seedQueryConfig['collection'] === 'string'
        ? seedQueryConfig['collection'].trim().toLowerCase()
        : '';
    if (seedQueryCollection !== 'products') return true;
    const seedQueryMode =
      seedQueryConfig && typeof seedQueryConfig['mode'] === 'string'
        ? seedQueryConfig['mode']
        : null;
    if (seedQueryMode !== 'custom') return true;
    const seedQueryTemplate =
      seedQueryConfig && typeof seedQueryConfig['queryTemplate'] === 'string'
        ? seedQueryConfig['queryTemplate'].trim()
        : '';
    if (
      !seedQueryTemplate ||
      !seedQueryTemplate.includes('{{entityId}}') ||
      !seedQueryTemplate.includes('"parameters"') ||
      !seedQueryTemplate.includes('"$exists"') ||
      !seedQueryTemplate.includes('"$size"')
    ) {
      return true;
    }
    const seedUpdatePayloadMode =
      typeof seedDatabase?.['updatePayloadMode'] === 'string'
        ? seedDatabase['updatePayloadMode']
        : null;
    if (seedUpdatePayloadMode !== 'custom') return true;
    const seedAction =
      typeof seedDatabase?.['action'] === 'string'
        ? seedDatabase['action']
        : null;
    if (seedAction !== 'findOneAndUpdate') return true;
    const seedUpdateTemplate =
      typeof seedDatabase?.['updateTemplate'] === 'string'
        ? seedDatabase['updateTemplate'].trim()
        : '';
    if (
      !seedUpdateTemplate.includes('"$set"') ||
      !seedUpdateTemplate.includes('"parameters"') ||
      !seedUpdateTemplate.includes('{{value}}')
    ) {
      return true;
    }

    const hasDefinitionsEdgeToUpdater = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-query-params' &&
        edge['to'] === 'node-update-params' &&
        edge['fromPort'] === 'result' &&
        edge['toPort'] === 'result'
      );
    });
    if (!hasDefinitionsEdgeToUpdater) return true;

    const hasDefinitionsEdgeToPrompt = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-query-params' &&
        edge['to'] === 'node-prompt-params' &&
        edge['fromPort'] === 'result' &&
        edge['toPort'] === 'result'
      );
    });
    if (!hasDefinitionsEdgeToPrompt) return true;

    const hasDefinitionsEdgeToTemplatePrompt = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-query-params' &&
        edge['to'] === 'node-prompt-template-params' &&
        edge['fromPort'] === 'result' &&
        edge['toPort'] === 'result'
      );
    });
    if (!hasDefinitionsEdgeToTemplatePrompt) return true;

    const hasTemplateWriteEdgeToSeed = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-regex-template-params' &&
        edge['to'] === 'node-seed-params' &&
        edge['fromPort'] === 'value' &&
        edge['toPort'] === 'value'
      );
    });
    if (!hasTemplateWriteEdgeToSeed) return true;

    const hasSeedDependencyEdgeToUpdater = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-seed-params' &&
        edge['to'] === 'node-update-params' &&
        edge['fromPort'] === 'bundle' &&
        edge['toPort'] === 'bundle'
      );
    });
    if (!hasSeedDependencyEdgeToUpdater) return true;
    const hasLegacySeedDependencyEdgeToUpdater = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-seed-params' &&
        edge['to'] === 'node-update-params' &&
        edge['fromPort'] === 'result' &&
        edge['toPort'] === 'bundle'
      );
    });
    if (hasLegacySeedDependencyEdgeToUpdater) return true;

    const parserNode = nodes.find(
      (node) => node?.['id'] === 'node-parser-params'
    );
    const parserMappings =
      parserNode &&
      typeof parserNode['config'] === 'object' &&
      parserNode['config'] !== null &&
      typeof (parserNode['config'] as Record<string, unknown>)['parser'] ===
        'object'
        ? (
          (parserNode['config'] as Record<string, unknown>)[
            'parser'
          ] as Record<string, unknown>
        )['mappings']
        : null;
    const catalogIdMapping =
      parserMappings &&
      typeof parserMappings === 'object' &&
      'catalogId' in (parserMappings)
        ? (parserMappings as Record<string, unknown>)['catalogId']
        : undefined;
    if (
      !parserMappings ||
      typeof parserMappings !== 'object' ||
      typeof catalogIdMapping !== 'string' ||
      !catalogIdMapping.trim()
    )
      return true;

    const hasLegacyCatalogIdEdge = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-parser-params' &&
        edge['to'] === 'node-query-params' &&
        edge['fromPort'] === 'catalogId' &&
        edge['toPort'] === 'catalogId'
      );
    });
    if (hasLegacyCatalogIdEdge) return true;

    const hasBundleEdgeToQuery = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-parser-params' &&
        edge['to'] === 'node-query-params' &&
        edge['fromPort'] === 'bundle' &&
        edge['toPort'] === 'bundle'
      );
    });
    return !hasBundleEdgeToQuery;
  } catch {
    return true;
  }
};

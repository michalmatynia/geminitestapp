import { PARAMETER_INFERENCE_TRIGGER_BUTTON_ID } from '../settings-store-parameter-inference';

export const getParameterInferenceNodes = (timestamp: string) => [
  {
    type: 'trigger',
    title: 'Trigger: Infer Parameters',
    description: `User trigger button (${PARAMETER_INFERENCE_TRIGGER_BUTTON_ID}).`,
    inputs: [],
    outputs: ['trigger', 'triggerName'],
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
          queryTemplate: `{
  "catalogId": "{{bundle.catalogId}}"
}`,
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
        template: `You create PRODUCT parameter template rows from parameter definitions JSON.
Parameter definitions JSON (array): {{result}}

Rules:
1. Return ONLY valid JSON array.
2. Output one item per definition with id.
3. Item schema: {"parameterId":"<id>","value":""}.
4. parameterId must exactly match definition id.
5. Skip definitions with missing/empty id.
6. Do not include extra keys.
7. No markdown, no explanations, no code fences.
8. If input has no valid definitions, return [].`,
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
    description:
      'Clean raw model JSON output by stripping markdown fences and surrounding text.',
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
            pattern: '^\\[^\\[]+',
            flags: '',
            autofix: {
              enabled: true,
              operations: [
                {
                  kind: 'replace' as const,
                  pattern: '^\\[^\\[]+',
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
          queryTemplate: `{
  "id": "{{entityId}}",
  "$or": [
    { "parameters": { "$exists": false } },
    { "parameters": { "$size": 0 } }
  ]
}`,
          limit: 1,
          sort: '',
          projection: '',
          single: true,
        },
        writeSource: 'bundle',
        writeSourcePath: '',
        dryRun: false,
        distinctField: '',
        updateTemplate: `{
  "$set": {
    "parameters": {{value}}
  }
}`,
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
        template: `Infer product PARAMETERS in ENGLISH from the product data below.
Product name: "{{title}}"
Product description: "{{content_en}}"
Available parameters JSON (objects with id/label/selectorType/options): {{result}}

Rules:
1. Return ONLY valid JSON array.
2. Output schema per item: {"parameterId":"<id>","value":"<english value>"}.
3. parameterId MUST exactly match an "id" from Available parameters JSON.
4. Never invent semantic IDs like "size", "material", "color".
5. Skip parameters you cannot infer confidently.
6. No markdown, no explanations, no code fences.
7. If nothing can be inferred, return [].
8. For any multi-value parameter, return ONE string joined with "|" and no spaces around "|", e.g. "Black|Red|Blue".
9. Capitalize value tokens in Title Case (e.g. "Black", "Stainless Steel").`,
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
          queryTemplate: `{
  "id": "{{entityId}}"
}`,
          limit: 1,
          sort: '',
          projection: '',
          single: true,
        },
        writeSource: 'bundle',
        writeSourcePath: '',
        dryRun: false,
        distinctField: '',
        updateTemplate: `{
  "$set": {
    "parameters": {{value}}
  }
}`,
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
];

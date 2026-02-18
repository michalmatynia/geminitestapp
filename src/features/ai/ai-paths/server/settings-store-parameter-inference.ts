export const PARAMETER_INFERENCE_PATH_ID = 'path_syr8f4';
export const PARAMETER_INFERENCE_PATH_NAME = 'Parameter Inference';
export const PARAMETER_INFERENCE_TRIGGER_BUTTON_ID = '0ef40981-7ac6-416e-9205-7200289f851c';
export const PARAMETER_INFERENCE_TRIGGER_BUTTON_NAME = 'Infer Parameters';

const LEGACY_PARAMETER_INFERENCE_PATH_NAME = 'Category Inference';

export const isLegacyParameterInferencePathName = (value: unknown): boolean =>
  typeof value === 'string' &&
  value.trim().toLowerCase() === LEGACY_PARAMETER_INFERENCE_PATH_NAME.toLowerCase();

export const buildParameterInferencePathConfigValue = (timestamp: string): string =>
  JSON.stringify({
    id: PARAMETER_INFERENCE_PATH_ID,
    version: 3,
    name: PARAMETER_INFERENCE_PATH_NAME,
    description:
      'Infer product parameter values from name and images, then update product parameters.',
    trigger: 'Product Modal - Infer Parameters',
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'block',
    nodes: [
      {
        type: 'trigger',
        title: 'Trigger: Infer Parameters',
        description: `User trigger button (${PARAMETER_INFERENCE_TRIGGER_BUTTON_ID}).`,
        inputs: ['context'],
        outputs: [
          'trigger',
          'triggerName',
          'context',
          'meta',
          'entityId',
          'entityType',
        ],
        config: {
          trigger: {
            event: PARAMETER_INFERENCE_TRIGGER_BUTTON_ID,
          },
        },
        id: 'node-trigger-params',
        position: { x: 24, y: 480 },
      },
      {
        type: 'parser',
        title: 'JSON Parser',
        description: 'Extract fields into outputs or a single bundle.',
        inputs: ['entityJson', 'context'],
        outputs: ['bundle', 'images'],
        id: 'node-parser-params',
        position: { x: 540, y: 470 },
        config: {
          parser: {
            mappings: {
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
        type: 'http',
        title: 'HTTP Fetch',
        description: 'Load available parameters for product catalog.',
        inputs: [
          'context',
          'bundle',
          'prompt',
          'result',
          'value',
          'entityId',
          'entityType',
        ],
        outputs: ['value', 'bundle'],
        id: 'node-query-params',
        position: { x: 560, y: 110 },
        config: {
          http: {
            url: '/api/products/parameters?catalogId={{context.entity.catalogId}}',
            method: 'GET',
            headers: '{}',
            bodyTemplate: '',
            responseMode: 'json',
            responsePath: '',
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
        position: { x: 1080, y: 260 },
        config: {
          prompt: {
            template:
              'Infer product PARAMETERS in ENGLISH from the product data below.\n' +
              'Product name: "{{title}}"\n' +
              'Product description: "{{content_en}}"\n' +
              'Available parameters JSON: {{result}}\n\n' +
              'Rules:\n' +
              '1. Return ONLY valid JSON array.\n' +
              '2. Output schema per item: {"parameterId":"<id>","value":"<english value>"}.\n' +
              '3. Use only parameterId values that exist in the provided parameter list.\n' +
              '4. Skip parameters you cannot infer confidently.\n' +
              '5. No markdown, no explanations, no code fences.\n' +
              '6. If nothing can be inferred, return [].',
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
        position: { x: 1540, y: 520 },
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
        position: { x: 2000, y: 520 },
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
        position: { x: 2460, y: 520 },
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
            updateTemplate: '',
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
        id: 'edge-params-01',
        from: 'node-trigger-params',
        to: 'node-parser-params',
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-params-02',
        from: 'node-trigger-params',
        to: 'node-query-params',
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-params-03',
        from: 'node-parser-params',
        to: 'node-prompt-params',
        fromPort: 'bundle',
        toPort: 'bundle',
      },
      {
        id: 'edge-params-04',
        from: 'node-query-params',
        to: 'node-prompt-params',
        fromPort: 'value',
        toPort: 'result',
      },
      {
        id: 'edge-params-05',
        from: 'node-prompt-params',
        to: 'node-model-params',
        fromPort: 'prompt',
        toPort: 'prompt',
      },
      {
        id: 'edge-params-06',
        from: 'node-prompt-params',
        to: 'node-model-params',
        fromPort: 'images',
        toPort: 'images',
      },
      {
        id: 'edge-params-07',
        from: 'node-model-params',
        to: 'node-regex-params',
        fromPort: 'result',
        toPort: 'value',
      },
      {
        id: 'edge-params-08',
        from: 'node-regex-params',
        to: 'node-update-params',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-params-09',
        from: 'node-trigger-params',
        to: 'node-update-params',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
      {
        id: 'edge-params-10',
        from: 'node-trigger-params',
        to: 'node-update-params',
        fromPort: 'entityType',
        toPort: 'entityType',
      },
      {
        id: 'edge-params-11',
        from: 'node-query-params',
        to: 'node-update-params',
        fromPort: 'value',
        toPort: 'result',
      },
    ],
    updatedAt: timestamp,
    isLocked: false,
    isActive: true,
    parserSamples: {},
    updaterSamples: {},
  });

export const needsParameterInferenceConfigUpgrade = (
  raw: string | undefined
): boolean => {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return true;

    const currentName = parsed['name'];
    if (isLegacyParameterInferencePathName(currentName)) return true;

    const nodes = Array.isArray(parsed['nodes'])
      ? (parsed['nodes'] as Array<Record<string, unknown>>)
      : [];
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

    const queryNode = nodes.find((node) => node?.['id'] === 'node-query-params');
    const queryType = queryNode?.['type'];
    if (queryType !== 'http') return true;
    const queryHttp =
      queryNode &&
      typeof queryNode === 'object' &&
      queryNode['config'] &&
      typeof queryNode['config'] === 'object' &&
      (queryNode['config'] as Record<string, unknown>)['http'] &&
      typeof (queryNode['config'] as Record<string, unknown>)['http'] ===
        'object'
        ? ((queryNode['config'] as Record<string, unknown>)[
          'http'
        ] as Record<string, unknown>)
        : null;
    const queryUrl =
      queryHttp && typeof queryHttp['url'] === 'string'
        ? queryHttp['url']
        : null;
    if (
      !queryUrl ||
      !queryUrl.includes('/api/products/parameters') ||
      !queryUrl.includes('catalogId=')
    ) {
      return true;
    }

    const edges = Array.isArray(parsed['edges'])
      ? (parsed['edges'] as Array<Record<string, unknown>>)
      : [];
    const hasDefinitionsEdge = edges.some((edge) => {
      if (!edge || typeof edge !== 'object') return false;
      return (
        edge['from'] === 'node-query-params' &&
        edge['to'] === 'node-update-params' &&
        edge['fromPort'] === 'value' &&
        edge['toPort'] === 'result'
      );
    });
    return !hasDefinitionsEdge;
  } catch {
    return true;
  }
};

export const DESCRIPTION_INFERENCE_LITE_PATH_ID = 'path_descv3lite';
export const DESCRIPTION_INFERENCE_LITE_PATH_NAME = 'Description Inference v3 Lite';
export const DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID = '4c07d35b-ea92-4d1f-b86b-c586359f68de';
export const DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_NAME = 'Infer Description Lite';

export const buildDescriptionInferenceLitePathConfigValue = (timestamp: string): string =>
  JSON.stringify({
    id: DESCRIPTION_INFERENCE_LITE_PATH_ID,
    version: 4,
    name: DESCRIPTION_INFERENCE_LITE_PATH_NAME,
    description:
      'Single-model, evidence-first ecommerce description workflow optimized for laptop runtime.',
    trigger: 'Product Modal - Infer Description Lite',
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'block',
    strictFlowMode: true,
    nodes: [
      {
        type: 'trigger',
        title: 'Trigger: Infer Description Lite',
        description: `User trigger button (${DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID}).`,
        inputs: [],
        outputs: ['trigger', 'triggerName'],
        config: {
          trigger: {
            event: DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID,
          },
        },
        id: 'node-trigger-desc-lite',
        position: { x: 24, y: 520 },
      },
      {
        type: 'fetcher',
        title: 'Fetcher: Trigger Context',
        description: 'Resolve context, metadata, and entity identity from trigger input.',
        inputs: ['trigger', 'context', 'meta', 'entityId', 'entityType'],
        outputs: ['context', 'meta', 'entityId', 'entityType'],
        id: 'node-fetcher-desc-lite',
        position: { x: 220, y: 520 },
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
      },
      {
        type: 'parser',
        title: 'JSON Parser',
        description: 'Extract product fields for prompt context.',
        inputs: ['entityJson', 'context'],
        outputs: ['bundle', 'images', 'title', 'entityId'],
        id: 'node-parser-desc-lite',
        position: { x: 430, y: 520 },
        config: {
          parser: {
            mappings: {
              productId: '',
              entityId: '',
              sku: '',
              title: '',
              content_en: '',
              categoryId: '',
              catalogId: '',
              parameters: '',
              images: '',
            },
            outputMode: 'bundle',
            presetId: 'product_core',
          },
          notes: {
            text: 'Use product context as primary truth source.',
          },
        },
      },
      {
        type: 'http',
        title: 'HTTP Fetch',
        description: 'Single metadata call (category + parameter definitions).',
        inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'entityId', 'entityType'],
        outputs: ['value', 'bundle'],
        id: 'node-metadata-desc-lite',
        position: { x: 430, y: 180 },
        config: {
          http: {
            url: '/api/products/ai-paths/description-context?catalogId={{bundle.catalogId}}&categoryId={{bundle.categoryId}}',
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
        type: 'constant',
        title: 'Constant',
        description: 'Editable policy controls (tone, length, threshold, claim safety).',
        inputs: [],
        outputs: ['value'],
        id: 'node-controls-desc-lite',
        position: { x: 420, y: 350 },
        config: {
          constant: {
            valueType: 'json',
            value: JSON.stringify({
              language: 'en',
              tone: 'clear, factual, ecommerce',
              targetWordCount: 120,
              maxWordCount: 180,
              minQualityScore: 0.8,
              forbiddenClaims: [
                'brand or franchise claims unless explicit in title, fields, or clearly visible image text',
                'character names unless explicit evidence exists',
                'material or dimensions unless explicit evidence exists',
              ],
              modelCallBudget: 1,
              metadataFetchBudget: 1,
            }),
          },
        },
      },
      {
        type: 'bundle',
        title: 'Bundle',
        description: 'Combine product data, metadata lookup, and controls for one prompt pass.',
        inputs: [
          'context',
          'meta',
          'trigger',
          'triggerName',
          'result',
          'entityJson',
          'entityId',
          'entityType',
          'value',
          'errors',
          'valid',
          'description_en',
          'prompt',
          'bundle',
        ],
        outputs: ['bundle'],
        id: 'node-bundle-desc-lite',
        position: { x: 830, y: 330 },
        config: {
          bundle: {
            includePorts: ['bundle', 'result', 'value', 'meta', 'entityId', 'entityType'],
          },
        },
      },
      {
        type: 'prompt',
        title: 'Prompt',
        description: 'Single-call grounded generation contract (JSON response).',
        inputs: ['bundle', 'title', 'images', 'result', 'entityId'],
        outputs: ['prompt', 'images'],
        id: 'node-prompt-desc-lite',
        position: { x: 1250, y: 330 },
        config: {
          prompt: {
            template:
              'You are an ecommerce description generator.\\n' +
              'Output language: English only.\\n' +
              'Use only evidence from product data, metadata, and images.\\n\\n' +
              'Product JSON:\\n{{bundle.bundle}}\\n\\n' +
              'Metadata JSON:\\n{{bundle.result}}\\n\\n' +
              'Controls JSON:\\n{{bundle.value}}\\n\\n' +
              'Return ONLY valid JSON object with this exact schema:\\n' +
              '{"facts":[{"text":"","source":"title|existing_field|metadata|image","confidence":0.0}],"finalDescription":"","fallbackDescription":"","qualityScore":0.0,"unsupportedClaims":[],"selectedDescription":""}\\n\\n' +
              'Rules:\\n' +
              '1. No markdown, no commentary, JSON only.\\n' +
              '2. No unsupported brand/franchise/character/material/dimension claims.\\n' +
              '3. selectedDescription MUST be deterministic:\\n' +
              '   if qualityScore >= {{bundle.value.minQualityScore}} use finalDescription, else fallbackDescription.\\n' +
              '4. Keep finalDescription concise and shopper-friendly (~{{bundle.value.targetWordCount}} words, hard max {{bundle.value.maxWordCount}}).',
          },
        },
      },
      {
        type: 'model',
        title: 'Model',
        description: 'Single Ollama call for extraction + generation.',
        inputs: ['prompt', 'images', 'context'],
        outputs: ['result', 'jobId'],
        id: 'node-model-desc-lite',
        position: { x: 1660, y: 500 },
        config: {
          model: {
            modelId: 'gemma3:12b',
            temperature: 0.1,
            maxTokens: 1100,
            vision: true,
            waitForResult: true,
          },
        },
      },
      {
        type: 'regex',
        title: 'Regex JSON Extract',
        description: 'Parse model JSON envelope.',
        inputs: ['value', 'prompt', 'regexCallback'],
        outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
        id: 'node-regex-desc-lite',
        position: { x: 2030, y: 500 },
        config: {
          regex: {
            pattern: '\\{[\\s\\S]*\\}',
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
        type: 'mapper',
        title: 'JSON Mapper',
        description: 'Map selected description and scoring payload.',
        inputs: ['context', 'result', 'bundle', 'value'],
        outputs: ['result', 'value', 'bundle'],
        id: 'node-mapper-desc-lite',
        position: { x: 2410, y: 500 },
        config: {
          mapper: {
            outputs: ['result', 'value', 'bundle'],
            mappings: {
              result: 'value.selectedDescription',
              value: 'value.qualityScore',
              bundle: 'value',
            },
          },
        },
      },
      {
        type: 'compare',
        title: 'Compare',
        description: 'Quality monitor (observability only).',
        inputs: ['value'],
        outputs: ['value', 'valid', 'errors'],
        id: 'node-compare-desc-lite',
        position: { x: 2780, y: 500 },
        config: {
          compare: {
            operator: 'gte',
            compareTo: '0.80',
            caseSensitive: false,
            message: 'qualityScore below 0.80',
          },
        },
      },
      {
        type: 'database',
        title: 'Database Query',
        description: 'Update product description_en using selectedDescription.',
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
        id: 'node-update-desc-lite',
        position: { x: 3160, y: 500 },
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
            mappings: [{ targetPath: 'description_en', sourcePort: 'result' }],
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
            trimStrings: true,
            aiPrompt: '',
            validationRuleIds: [],
          },
          runtime: { waitForInputs: true },
        },
      },
      {
        type: 'viewer',
        title: 'Result Viewer',
        description: 'Inspect output JSON, selected text, score, and quality monitor.',
        inputs: [
          'result',
          'value',
          'bundle',
          'valid',
          'errors',
          'context',
          'meta',
          'trigger',
          'triggerName',
          'entityId',
          'entityType',
          'entityJson',
          'description_en',
          'prompt',
        ],
        outputs: [],
        id: 'node-view-desc-lite',
        position: { x: 3520, y: 500 },
        config: {
          viewer: {
            outputs: {
              result: '',
              value: '',
              bundle: '',
              valid: '',
              errors: '',
            },
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge-desc-lite-00',
        from: 'node-trigger-desc-lite',
        to: 'node-fetcher-desc-lite',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: 'edge-desc-lite-01',
        from: 'node-fetcher-desc-lite',
        to: 'node-parser-desc-lite',
        fromPort: 'context',
        toPort: 'context',
      },
      {
        id: 'edge-desc-lite-02',
        from: 'node-parser-desc-lite',
        to: 'node-metadata-desc-lite',
        fromPort: 'bundle',
        toPort: 'bundle',
      },
      {
        id: 'edge-desc-lite-03',
        from: 'node-parser-desc-lite',
        to: 'node-bundle-desc-lite',
        fromPort: 'bundle',
        toPort: 'bundle',
      },
      {
        id: 'edge-desc-lite-04',
        from: 'node-metadata-desc-lite',
        to: 'node-bundle-desc-lite',
        fromPort: 'value',
        toPort: 'result',
      },
      {
        id: 'edge-desc-lite-05',
        from: 'node-controls-desc-lite',
        to: 'node-bundle-desc-lite',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-desc-lite-06',
        from: 'node-fetcher-desc-lite',
        to: 'node-bundle-desc-lite',
        fromPort: 'meta',
        toPort: 'meta',
      },
      {
        id: 'edge-desc-lite-07',
        from: 'node-fetcher-desc-lite',
        to: 'node-bundle-desc-lite',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
      {
        id: 'edge-desc-lite-08',
        from: 'node-fetcher-desc-lite',
        to: 'node-bundle-desc-lite',
        fromPort: 'entityType',
        toPort: 'entityType',
      },
      {
        id: 'edge-desc-lite-09',
        from: 'node-bundle-desc-lite',
        to: 'node-prompt-desc-lite',
        fromPort: 'bundle',
        toPort: 'bundle',
      },
      {
        id: 'edge-desc-lite-10',
        from: 'node-parser-desc-lite',
        to: 'node-prompt-desc-lite',
        fromPort: 'images',
        toPort: 'images',
      },
      {
        id: 'edge-desc-lite-11',
        from: 'node-parser-desc-lite',
        to: 'node-prompt-desc-lite',
        fromPort: 'title',
        toPort: 'title',
      },
      {
        id: 'edge-desc-lite-12',
        from: 'node-fetcher-desc-lite',
        to: 'node-prompt-desc-lite',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
      {
        id: 'edge-desc-lite-13',
        from: 'node-prompt-desc-lite',
        to: 'node-model-desc-lite',
        fromPort: 'prompt',
        toPort: 'prompt',
      },
      {
        id: 'edge-desc-lite-14',
        from: 'node-prompt-desc-lite',
        to: 'node-model-desc-lite',
        fromPort: 'images',
        toPort: 'images',
      },
      {
        id: 'edge-desc-lite-15',
        from: 'node-model-desc-lite',
        to: 'node-regex-desc-lite',
        fromPort: 'result',
        toPort: 'value',
      },
      {
        id: 'edge-desc-lite-16',
        from: 'node-regex-desc-lite',
        to: 'node-mapper-desc-lite',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-desc-lite-17',
        from: 'node-mapper-desc-lite',
        to: 'node-compare-desc-lite',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-desc-lite-18',
        from: 'node-mapper-desc-lite',
        to: 'node-update-desc-lite',
        fromPort: 'result',
        toPort: 'result',
      },
      {
        id: 'edge-desc-lite-19',
        from: 'node-fetcher-desc-lite',
        to: 'node-update-desc-lite',
        fromPort: 'entityId',
        toPort: 'entityId',
      },
      {
        id: 'edge-desc-lite-20',
        from: 'node-fetcher-desc-lite',
        to: 'node-update-desc-lite',
        fromPort: 'entityType',
        toPort: 'entityType',
      },
      {
        id: 'edge-desc-lite-21',
        from: 'node-regex-desc-lite',
        to: 'node-view-desc-lite',
        fromPort: 'value',
        toPort: 'bundle',
      },
      {
        id: 'edge-desc-lite-22',
        from: 'node-mapper-desc-lite',
        to: 'node-view-desc-lite',
        fromPort: 'result',
        toPort: 'result',
      },
      {
        id: 'edge-desc-lite-23',
        from: 'node-mapper-desc-lite',
        to: 'node-view-desc-lite',
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-desc-lite-24',
        from: 'node-mapper-desc-lite',
        to: 'node-view-desc-lite',
        fromPort: 'bundle',
        toPort: 'context',
      },
      {
        id: 'edge-desc-lite-25',
        from: 'node-compare-desc-lite',
        to: 'node-view-desc-lite',
        fromPort: 'valid',
        toPort: 'valid',
      },
      {
        id: 'edge-desc-lite-26',
        from: 'node-compare-desc-lite',
        to: 'node-view-desc-lite',
        fromPort: 'errors',
        toPort: 'errors',
      },
      {
        id: 'edge-desc-lite-27',
        from: 'node-update-desc-lite',
        to: 'node-view-desc-lite',
        fromPort: 'result',
        toPort: 'meta',
      },
    ],
    updatedAt: timestamp,
    isLocked: false,
    isActive: true,
    parserSamples: {},
    updaterSamples: {},
  });

export const needsDescriptionInferenceLiteConfigUpgrade = (raw: string | undefined): boolean => {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return true;
    const version = typeof parsed['version'] === 'number' ? parsed['version'] : 0;
    if (version < 4) return true;

    const nodes = Array.isArray(parsed['nodes'])
      ? (parsed['nodes'] as Array<Record<string, unknown>>)
      : [];
    if (nodes.length === 0) return true;

    const hasMatchingTriggerEvent = nodes.some((node: Record<string, unknown>) => {
      if (node['type'] !== 'trigger') return false;
      const config =
        node['config'] && typeof node['config'] === 'object'
          ? (node['config'] as Record<string, unknown>)
          : null;
      const trigger =
        config?.['trigger'] && typeof config['trigger'] === 'object'
          ? (config['trigger'] as Record<string, unknown>)
          : null;
      return trigger?.['event'] === DESCRIPTION_INFERENCE_LITE_TRIGGER_BUTTON_ID;
    });
    const hasFetcher = nodes.some((node: Record<string, unknown>): boolean => {
      return node?.['type'] === 'fetcher';
    });
    return !hasMatchingTriggerEvent || !hasFetcher;
  } catch {
    return true;
  }
};

export const DESCRIPTION_INFERENCE_V2_PATH_ID = 'path_descv2';
export const DESCRIPTION_INFERENCE_V2_PATH_NAME = 'Description Inference v2';
export const DESCRIPTION_INFERENCE_V2_TRIGGER_BUTTON_ID = 'f1e0b86f-524f-4ef8-b8b0-a7c37def7f54';
export const DESCRIPTION_INFERENCE_V2_TRIGGER_BUTTON_NAME = 'Infer Description v2';

export const buildDescriptionInferenceV2PathConfigValue = (
  timestamp: string
): string =>
  JSON.stringify({
    id: DESCRIPTION_INFERENCE_V2_PATH_ID,
    version: 1,
    name: DESCRIPTION_INFERENCE_V2_PATH_NAME,
    description:
      'Evidence-first ecommerce description generation with fact extraction, grounding validation, and quality-gated fallback.',
    trigger: 'Product Modal - Infer Description v2',
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'block',
    nodes: [
      {
        type: 'trigger',
        title: 'Trigger: Infer Description v2',
        description: `User trigger button (${DESCRIPTION_INFERENCE_V2_TRIGGER_BUTTON_ID}).`,
        inputs: ['context'],
        outputs: ['trigger', 'triggerName', 'context', 'meta', 'entityId', 'entityType'],
        config: {
          trigger: {
            event: DESCRIPTION_INFERENCE_V2_TRIGGER_BUTTON_ID,
          },
        },
        id: 'node-trigger-desc-v2',
        position: { x: 20, y: 640 },
      },
      {
        type: 'parser',
        title: 'JSON Parser',
        description: 'Extract product fields required by the evidence pipeline.',
        inputs: ['entityJson', 'context'],
        outputs: ['bundle', 'images', 'title', 'entityId'],
        id: 'node-parser-desc-v2',
        position: { x: 430, y: 640 },
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
            text: 'Source of truth from product context; no assumptions.',
          },
        },
      },
      {
        type: 'http',
        title: 'HTTP Fetch',
        description: 'Fetch simple parameter definitions for the product catalog.',
        inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'entityId', 'entityType'],
        outputs: ['value', 'bundle'],
        id: 'node-fetch-simple-params-v2',
        position: { x: 430, y: 230 },
        config: {
          http: {
            url: '/api/products/simple-parameters?catalogId={{bundle.catalogId}}',
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
        type: 'http',
        title: 'HTTP Fetch',
        description: 'Fetch category list for product catalog context.',
        inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'entityId', 'entityType'],
        outputs: ['value', 'bundle'],
        id: 'node-fetch-categories-v2',
        position: { x: 430, y: 30 },
        config: {
          http: {
            url: '/api/products/categories?catalogId={{bundle.catalogId}}',
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
        description: 'Editable generation policy controls (fully configurable in UI).',
        inputs: [],
        outputs: ['value'],
        id: 'node-controls-desc-v2',
        position: { x: 420, y: 440 },
        config: {
          constant: {
            valueType: 'json',
            value: JSON.stringify({
              language: 'en',
              tone: 'clear, factual, ecommerce',
              targetWordCount: 120,
              maxWordCount: 180,
              minQualityScore: 0.78,
              seoKeywords: [],
              forbiddenClaims: [
                'brand or franchise claims unless explicitly visible in title or image text',
                'character names unless clearly provided in source data',
                'material or sizing claims unless evidenced',
                'feature claims not visible in image or provided fields',
              ],
            }),
          },
        },
      },
      {
        type: 'bundle',
        title: 'Bundle',
        description: 'Aggregate core product data, controls, and reference catalogs.',
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
        id: 'node-bundle-evidence-v2',
        position: { x: 860, y: 380 },
        config: {
          bundle: {
            includePorts: [
              'bundle',
              'result',
              'value',
              'context',
              'meta',
              'entityId',
              'entityType',
            ],
          },
        },
      },
      {
        type: 'prompt',
        title: 'Prompt',
        description: 'Vision fact extractor (JSON-only evidence output).',
        inputs: ['bundle', 'title', 'images', 'result', 'entityId'],
        outputs: ['prompt', 'images'],
        id: 'node-prompt-facts-v2',
        position: { x: 1320, y: 360 },
        config: {
          prompt: {
            template:
              'You are a product evidence extractor for ecommerce descriptions.\n' +
              'Target language: English.\n\n' +
              'Product core JSON:\n{{bundle.bundle}}\n\n' +
              'Simple parameter definitions JSON:\n{{bundle.result}}\n\n' +
              'Category list JSON:\n{{bundle.value}}\n\n' +
              'Controls JSON:\n{{bundle.context}}\n\n' +
              'Task:\n' +
              '1. Analyze images + provided product fields.\n' +
              '2. Output ONLY evidence-backed facts.\n' +
              '3. Never infer franchise, character, brand, material, dimensions, or features unless explicit.\n\n' +
              'Return ONLY valid JSON object:\n' +
              '{"inferredProductType":"","facts":[{"fact":"","source":"image|title|existing_field|parameter|category","confidence":0.0}],"highConfidenceFacts":[{"fact":"","source":"","confidence":0.0}],"excludedClaims":[],"imageQuality":"good|medium|poor"}\n\n' +
              'Rules:\n' +
              '- confidence must be in [0,1]\n' +
              '- If uncertain, exclude the claim\n' +
              '- No markdown, no commentary, JSON only.',
          },
        },
      },
      {
        type: 'model',
        title: 'Model',
        description: 'Extract grounded product evidence from images and metadata.',
        inputs: ['prompt', 'images', 'context'],
        outputs: ['result', 'jobId'],
        id: 'node-model-facts-v2',
        position: { x: 1780, y: 550 },
        config: {
          model: {
            modelId: 'gemma3:12b',
            temperature: 0.1,
            maxTokens: 1400,
            vision: true,
            waitForResult: true,
          },
        },
      },
      {
        type: 'regex',
        title: 'Regex JSON Extract',
        description: 'Extract structured evidence JSON from model output.',
        inputs: ['value', 'prompt', 'regexCallback'],
        outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
        id: 'node-regex-facts-v2',
        position: { x: 2180, y: 550 },
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
        type: 'prompt',
        title: 'Prompt',
        description: 'Generate first-pass description from grounded facts only.',
        inputs: ['bundle', 'title', 'images', 'result', 'entityId'],
        outputs: ['prompt', 'images'],
        id: 'node-prompt-draft-v2',
        position: { x: 2580, y: 300 },
        config: {
          prompt: {
            template:
              'You are an ecommerce copywriter.\n' +
              'Write an English description using ONLY grounded facts.\n\n' +
              'Controls JSON:\n{{bundle.context}}\n\n' +
              'Product core JSON:\n{{bundle.bundle}}\n\n' +
              'Grounded facts JSON:\n{{result}}\n\n' +
              'Rules:\n' +
              '1. Do not invent franchise/character/brand/material/sizing claims.\n' +
              '2. Skip any uncertain detail.\n' +
              '3. Keep it shopper-focused, factual, and concise.\n' +
              '4. Target around {{bundle.context.targetWordCount}} words, hard max {{bundle.context.maxWordCount}}.\n' +
              '5. Output plain text only (no markdown).',
          },
        },
      },
      {
        type: 'model',
        title: 'Model',
        description: 'Draft description from evidence.',
        inputs: ['prompt', 'images', 'context'],
        outputs: ['result', 'jobId'],
        id: 'node-model-draft-v2',
        position: { x: 3000, y: 300 },
        config: {
          model: {
            modelId: 'gemma3:12b',
            temperature: 0.2,
            maxTokens: 520,
            vision: false,
            waitForResult: true,
          },
        },
      },
      {
        type: 'bundle',
        title: 'Bundle',
        description: 'Aggregate evidence + draft for validation stage.',
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
        id: 'node-bundle-validate-v2',
        position: { x: 3380, y: 490 },
        config: {
          bundle: {
            includePorts: ['bundle', 'result', 'value'],
          },
        },
      },
      {
        type: 'prompt',
        title: 'Prompt',
        description: 'Validate and rewrite draft; compute grounded quality score.',
        inputs: ['bundle', 'title', 'images', 'result', 'entityId'],
        outputs: ['prompt', 'images'],
        id: 'node-prompt-validate-v2',
        position: { x: 3760, y: 490 },
        config: {
          prompt: {
            template:
              'You are a strict grounding validator for ecommerce copy.\n\n' +
              'Controls JSON:\n{{bundle.bundle.context}}\n\n' +
              'Product core JSON:\n{{bundle.bundle.bundle}}\n\n' +
              'Grounded facts JSON:\n{{bundle.result}}\n\n' +
              'Draft description:\n{{bundle.value}}\n\n' +
              'Task:\n' +
              '- Remove or rewrite unsupported claims.\n' +
              '- Keep only evidence-grounded content.\n' +
              '- Produce a conservative fallback text from high-confidence facts only.\n\n' +
              'Return ONLY valid JSON object:\n' +
              '{"finalDescription":"","fallbackDescription":"","qualityScore":0.0,"unsupportedClaims":[],"reasons":[],"usedFacts":[]}\n\n' +
              'Rules:\n' +
              '- qualityScore in [0,1]\n' +
              '- finalDescription and fallbackDescription in English\n' +
              '- no markdown, no commentary.',
          },
        },
      },
      {
        type: 'model',
        title: 'Model',
        description: 'Grounding validator + cleaner.',
        inputs: ['prompt', 'images', 'context'],
        outputs: ['result', 'jobId'],
        id: 'node-model-validate-v2',
        position: { x: 4140, y: 710 },
        config: {
          model: {
            modelId: 'gemma3:12b',
            temperature: 0.1,
            maxTokens: 900,
            vision: false,
            waitForResult: true,
          },
        },
      },
      {
        type: 'regex',
        title: 'Regex JSON Extract',
        description: 'Extract validation JSON payload.',
        inputs: ['value', 'prompt', 'regexCallback'],
        outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
        id: 'node-regex-validate-v2',
        position: { x: 4520, y: 710 },
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
        description: 'Map validated payload into final/fallback/score channels.',
        inputs: ['context', 'result', 'bundle', 'value'],
        outputs: ['result', 'value', 'bundle'],
        id: 'node-mapper-final-v2',
        position: { x: 4900, y: 710 },
        config: {
          mapper: {
            outputs: ['result', 'value', 'bundle'],
            mappings: {
              result: 'value.finalDescription',
              value: 'value.fallbackDescription',
              bundle: 'value.qualityScore',
            },
          },
        },
      },
      {
        type: 'compare',
        title: 'Compare',
        description: 'Quality gate: choose final text only when score is high enough.',
        inputs: ['value'],
        outputs: ['value', 'valid', 'errors'],
        id: 'node-compare-quality-v2',
        position: { x: 5280, y: 710 },
        config: {
          compare: {
            operator: 'gte',
            compareTo: '0.78',
            caseSensitive: false,
            message: 'Quality score below threshold - fallback description selected.',
          },
        },
      },
      {
        type: 'router',
        title: 'Router',
        description: 'Pass final description when quality gate succeeds.',
        inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
        outputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
        id: 'node-router-pass-v2',
        position: { x: 5640, y: 560 },
        config: {
          router: {
            mode: 'valid',
            matchMode: 'truthy',
            compareTo: '',
          },
        },
      },
      {
        type: 'router',
        title: 'Router',
        description: 'Pass fallback description when quality gate fails.',
        inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
        outputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
        id: 'node-router-fallback-v2',
        position: { x: 5640, y: 860 },
        config: {
          router: {
            mode: 'valid',
            matchMode: 'falsy',
            compareTo: '',
          },
        },
      },
      {
        type: 'database',
        title: 'Database Query',
        description: 'Write quality-approved final description to product.description_en.',
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
        id: 'node-update-desc-final-v2',
        position: { x: 6040, y: 540 },
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
        type: 'database',
        title: 'Database Query',
        description: 'Write conservative fallback description when quality is low.',
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
        id: 'node-update-desc-fallback-v2',
        position: { x: 6040, y: 900 },
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
            mappings: [{ targetPath: 'description_en', sourcePort: 'value' }],
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
        description: 'Inspect validation payload, quality score, and gate result.',
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
        id: 'node-view-desc-v2',
        position: { x: 6480, y: 700 },
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
      { id: 'edge-desc-v2-01', from: 'node-trigger-desc-v2', to: 'node-parser-desc-v2', fromPort: 'context', toPort: 'context' },
      { id: 'edge-desc-v2-02', from: 'node-parser-desc-v2', to: 'node-fetch-simple-params-v2', fromPort: 'bundle', toPort: 'bundle' },
      { id: 'edge-desc-v2-03', from: 'node-parser-desc-v2', to: 'node-fetch-categories-v2', fromPort: 'bundle', toPort: 'bundle' },
      { id: 'edge-desc-v2-04', from: 'node-parser-desc-v2', to: 'node-bundle-evidence-v2', fromPort: 'bundle', toPort: 'bundle' },
      { id: 'edge-desc-v2-05', from: 'node-fetch-simple-params-v2', to: 'node-bundle-evidence-v2', fromPort: 'value', toPort: 'result' },
      { id: 'edge-desc-v2-06', from: 'node-fetch-categories-v2', to: 'node-bundle-evidence-v2', fromPort: 'value', toPort: 'value' },
      { id: 'edge-desc-v2-07', from: 'node-controls-desc-v2', to: 'node-bundle-evidence-v2', fromPort: 'value', toPort: 'context' },
      { id: 'edge-desc-v2-08', from: 'node-trigger-desc-v2', to: 'node-bundle-evidence-v2', fromPort: 'meta', toPort: 'meta' },
      { id: 'edge-desc-v2-09', from: 'node-trigger-desc-v2', to: 'node-bundle-evidence-v2', fromPort: 'entityId', toPort: 'entityId' },
      { id: 'edge-desc-v2-10', from: 'node-trigger-desc-v2', to: 'node-bundle-evidence-v2', fromPort: 'entityType', toPort: 'entityType' },
      { id: 'edge-desc-v2-11', from: 'node-bundle-evidence-v2', to: 'node-prompt-facts-v2', fromPort: 'bundle', toPort: 'bundle' },
      { id: 'edge-desc-v2-12', from: 'node-parser-desc-v2', to: 'node-prompt-facts-v2', fromPort: 'images', toPort: 'images' },
      { id: 'edge-desc-v2-13', from: 'node-parser-desc-v2', to: 'node-prompt-facts-v2', fromPort: 'title', toPort: 'title' },
      { id: 'edge-desc-v2-14', from: 'node-trigger-desc-v2', to: 'node-prompt-facts-v2', fromPort: 'entityId', toPort: 'entityId' },
      { id: 'edge-desc-v2-15', from: 'node-prompt-facts-v2', to: 'node-model-facts-v2', fromPort: 'prompt', toPort: 'prompt' },
      { id: 'edge-desc-v2-16', from: 'node-prompt-facts-v2', to: 'node-model-facts-v2', fromPort: 'images', toPort: 'images' },
      { id: 'edge-desc-v2-17', from: 'node-model-facts-v2', to: 'node-regex-facts-v2', fromPort: 'result', toPort: 'value' },
      { id: 'edge-desc-v2-18', from: 'node-bundle-evidence-v2', to: 'node-prompt-draft-v2', fromPort: 'bundle', toPort: 'bundle' },
      { id: 'edge-desc-v2-19', from: 'node-regex-facts-v2', to: 'node-prompt-draft-v2', fromPort: 'value', toPort: 'result' },
      { id: 'edge-desc-v2-20', from: 'node-parser-desc-v2', to: 'node-prompt-draft-v2', fromPort: 'title', toPort: 'title' },
      { id: 'edge-desc-v2-21', from: 'node-prompt-draft-v2', to: 'node-model-draft-v2', fromPort: 'prompt', toPort: 'prompt' },
      { id: 'edge-desc-v2-22', from: 'node-model-draft-v2', to: 'node-bundle-validate-v2', fromPort: 'result', toPort: 'value' },
      { id: 'edge-desc-v2-23', from: 'node-bundle-evidence-v2', to: 'node-bundle-validate-v2', fromPort: 'bundle', toPort: 'bundle' },
      { id: 'edge-desc-v2-24', from: 'node-regex-facts-v2', to: 'node-bundle-validate-v2', fromPort: 'value', toPort: 'result' },
      { id: 'edge-desc-v2-25', from: 'node-bundle-validate-v2', to: 'node-prompt-validate-v2', fromPort: 'bundle', toPort: 'bundle' },
      { id: 'edge-desc-v2-26', from: 'node-prompt-validate-v2', to: 'node-model-validate-v2', fromPort: 'prompt', toPort: 'prompt' },
      { id: 'edge-desc-v2-27', from: 'node-model-validate-v2', to: 'node-regex-validate-v2', fromPort: 'result', toPort: 'value' },
      { id: 'edge-desc-v2-28', from: 'node-regex-validate-v2', to: 'node-mapper-final-v2', fromPort: 'value', toPort: 'value' },
      { id: 'edge-desc-v2-29', from: 'node-mapper-final-v2', to: 'node-compare-quality-v2', fromPort: 'bundle', toPort: 'value' },
      { id: 'edge-desc-v2-30', from: 'node-mapper-final-v2', to: 'node-router-pass-v2', fromPort: 'result', toPort: 'result' },
      { id: 'edge-desc-v2-31', from: 'node-compare-quality-v2', to: 'node-router-pass-v2', fromPort: 'valid', toPort: 'valid' },
      { id: 'edge-desc-v2-32', from: 'node-mapper-final-v2', to: 'node-router-fallback-v2', fromPort: 'value', toPort: 'value' },
      { id: 'edge-desc-v2-33', from: 'node-compare-quality-v2', to: 'node-router-fallback-v2', fromPort: 'valid', toPort: 'valid' },
      { id: 'edge-desc-v2-34', from: 'node-router-pass-v2', to: 'node-update-desc-final-v2', fromPort: 'result', toPort: 'result' },
      { id: 'edge-desc-v2-35', from: 'node-trigger-desc-v2', to: 'node-update-desc-final-v2', fromPort: 'entityId', toPort: 'entityId' },
      { id: 'edge-desc-v2-36', from: 'node-trigger-desc-v2', to: 'node-update-desc-final-v2', fromPort: 'entityType', toPort: 'entityType' },
      { id: 'edge-desc-v2-37', from: 'node-router-fallback-v2', to: 'node-update-desc-fallback-v2', fromPort: 'value', toPort: 'value' },
      { id: 'edge-desc-v2-38', from: 'node-trigger-desc-v2', to: 'node-update-desc-fallback-v2', fromPort: 'entityId', toPort: 'entityId' },
      { id: 'edge-desc-v2-39', from: 'node-trigger-desc-v2', to: 'node-update-desc-fallback-v2', fromPort: 'entityType', toPort: 'entityType' },
      { id: 'edge-desc-v2-40', from: 'node-regex-validate-v2', to: 'node-view-desc-v2', fromPort: 'value', toPort: 'result' },
      { id: 'edge-desc-v2-41', from: 'node-mapper-final-v2', to: 'node-view-desc-v2', fromPort: 'bundle', toPort: 'value' },
      { id: 'edge-desc-v2-42', from: 'node-compare-quality-v2', to: 'node-view-desc-v2', fromPort: 'valid', toPort: 'valid' },
      { id: 'edge-desc-v2-43', from: 'node-compare-quality-v2', to: 'node-view-desc-v2', fromPort: 'errors', toPort: 'errors' },
      { id: 'edge-desc-v2-44', from: 'node-update-desc-final-v2', to: 'node-view-desc-v2', fromPort: 'result', toPort: 'bundle' },
      { id: 'edge-desc-v2-45', from: 'node-update-desc-fallback-v2', to: 'node-view-desc-v2', fromPort: 'result', toPort: 'context' },
    ],
    updatedAt: timestamp,
    isLocked: false,
    isActive: true,
    parserSamples: {},
    updaterSamples: {},
  });

export const needsDescriptionInferenceV2ConfigUpgrade = (
  raw: string | undefined
): boolean => {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return true;

    const nodes = Array.isArray(parsed['nodes'])
      ? (parsed['nodes'] as Array<Record<string, unknown>>)
      : [];
    const version =
      typeof parsed['version'] === 'number' ? parsed['version'] : 0;
    if (version < 1) return true;

    const triggerNode = nodes.find(
      (node: Record<string, unknown>) => node?.['id'] === 'node-trigger-desc-v2'
    );
    if (!triggerNode) return true;
    const triggerConfig =
      triggerNode['config'] &&
      typeof triggerNode['config'] === 'object'
        ? (triggerNode['config'] as Record<string, unknown>)
        : null;
    const triggerEvent =
      triggerConfig &&
      triggerConfig['trigger'] &&
      typeof triggerConfig['trigger'] === 'object'
        ? (triggerConfig['trigger'] as Record<string, unknown>)['event']
        : null;
    if (triggerEvent !== DESCRIPTION_INFERENCE_V2_TRIGGER_BUTTON_ID) return true;

    const extractMappings = (node: Record<string, unknown> | undefined): Array<Record<string, unknown>> => {
      if (!node || typeof node !== 'object') return [];
      const config =
        node['config'] && typeof node['config'] === 'object'
          ? (node['config'] as Record<string, unknown>)
          : null;
      const database =
        config &&
        config['database'] &&
        typeof config['database'] === 'object'
          ? (config['database'] as Record<string, unknown>)
          : null;
      return Array.isArray(database?.['mappings'])
        ? (database?.['mappings'] as Array<Record<string, unknown>>)
        : [];
    };
    const hasDescriptionWriter = nodes.some((node: Record<string, unknown>) =>
      extractMappings(node).some(
        (mapping: Record<string, unknown>) =>
          mapping['targetPath'] === 'description_en'
      )
    );
    return !hasDescriptionWriter;
  } catch {
    return true;
  }
};

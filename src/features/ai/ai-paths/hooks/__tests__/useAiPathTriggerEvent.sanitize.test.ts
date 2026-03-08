import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { buildTriggerContext } from '@/shared/lib/ai-paths/hooks/trigger-event-context';
import { sanitizeTriggerPathConfig } from '@/shared/lib/ai-paths/core/normalization/trigger-normalization';

const buildTriggerNode = (): AiNode =>
  ({
    id: 'node-trigger-test',
    type: 'trigger',
    title: 'Trigger',
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: [],
    outputs: ['trigger'],
    config: { trigger: { event: 'manual' } },
    createdAt: '2026-03-02T05:57:46.562Z',
    updatedAt: null,
  }) as AiNode;

describe('sanitizeTriggerPathConfig', () => {
  it('rejects unsupported database snapshot and provider payloads', () => {
    const baseConfig = createDefaultPathConfig('path_legacy_trigger');
    const legacyConfig = {
      ...baseConfig,
      nodes: [
        {
          id: 'node-regex-legacy',
          type: 'regex',
          title: 'Regex JSON Extract',
          description: '',
          position: { x: 0, y: 0 },
          data: {},
          inputs: ['value', 'prompt', 'regexCallback'],
          outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
          createdAt: '2026-03-02T05:57:46.562Z',
          updatedAt: null,
        },
        {
          id: 'node-database-legacy',
          type: 'database',
          title: 'Database Query',
          description: '',
          position: { x: 320, y: 0 },
          data: {},
          inputs: ['entityId', 'entityType', 'value', 'result', 'bundle'],
          outputs: ['result', 'bundle'],
          config: {
            database: {
              operation: 'query',
              query: {
                provider: 'all',
                collection: 'products',
                mode: 'custom',
                preset: 'by_id',
                field: '_id',
                idType: 'string',
                queryTemplate: '{"_id":"{{value}}"}',
                limit: 20,
                sort: '',
                projection: '',
                single: false,
              },
              schemaSnapshot: {
                provider: 'all',
                collections: [],
              },
            },
          },
          createdAt: '2026-03-02T05:57:46.562Z',
          updatedAt: null,
        },
      ] as unknown as AiNode[],
      edges: [
        {
          id: 'edge-legacy-regex-db',
          from: 'node-regex-legacy',
          to: 'node-database-legacy',
          fromPort: 'value',
          toPort: 'value',
        },
      ],
    };

    expect(() => sanitizeTriggerPathConfig(legacyConfig)).toThrowError(
      /(?:unsupported|deprecated) database/i
    );
  });

  it('keeps canonical trigger configs unchanged', () => {
    const config = createDefaultPathConfig('path_translation_v2');

    const snapshotBeforeSanitize = structuredClone(config);
    const sanitized = sanitizeTriggerPathConfig(config);

    expect(sanitized).toEqual(snapshotBeforeSanitize);
  });

  it('rejects unsupported parameter inference target path aliases in trigger payloads', () => {
    const config = createDefaultPathConfig('path_trigger_param_guard');
    config.nodes = [
      {
        id: 'node-trigger-param-guard',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        position: { x: 0, y: 0 },
        data: {},
        inputs: [],
        outputs: ['trigger'],
        config: {
          trigger: { event: 'trigger-param-guard' },
        },
        createdAt: '2026-03-02T05:57:46.562Z',
        updatedAt: null,
      } as AiNode,
      {
        id: 'node-db-param-guard',
        type: 'database',
        title: 'Database Update',
        description: '',
        position: { x: 320, y: 0 },
        data: {},
        inputs: ['trigger', 'entityId', 'value'],
        outputs: ['result', 'bundle'],
        config: {
          database: {
            operation: 'update',
            entityType: 'product',
            query: {
              provider: 'mongodb',
              collection: 'products',
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{"id":"{{entityId}}"}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
            parameterInferenceGuard: {
              enabled: true,
              targetPath: 'simpleParameters',
            },
          },
        },
        createdAt: '2026-03-02T05:57:46.562Z',
        updatedAt: null,
      } as AiNode,
    ];
    config.edges = [
      {
        id: 'edge-trigger-param-guard',
        from: 'node-trigger-param-guard',
        to: 'node-db-param-guard',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    expect(() => sanitizeTriggerPathConfig(config)).toThrowError(
      /unsupported parameter inference target path/i
    );
  });

  it('rejects unsupported trigger data edges in trigger payloads', () => {
    const config = createDefaultPathConfig('path_trigger_data_guard');
    config.nodes = normalizeNodes([
      {
        id: 'node-trigger-data-guard',
        type: 'trigger',
        title: 'Trigger',
        description: '',
        position: { x: 0, y: 0 },
        data: {},
        inputs: [],
        outputs: ['trigger', 'context'],
        config: {
          trigger: { event: 'trigger-data-guard' },
        },
        createdAt: '2026-03-02T05:57:46.562Z',
        updatedAt: null,
      } as AiNode,
      {
        id: 'node-context-data-guard',
        type: 'context',
        title: 'Context Filter',
        description: '',
        position: { x: 320, y: 0 },
        data: {},
        inputs: ['context'],
        outputs: ['entityJson'],
        config: {
          context: {
            mode: 'passthrough',
          },
        },
        createdAt: '2026-03-02T05:57:46.562Z',
        updatedAt: null,
      } as AiNode,
    ]);
    const triggerNode = config.nodes[0];
    const downstreamNode = config.nodes[1];
    if (!triggerNode || !downstreamNode) {
      throw new Error('Expected normalized trigger fixtures to include two nodes.');
    }
    config.edges = [
      {
        id: 'edge-trigger-data-guard',
        from: triggerNode.id,
        to: downstreamNode.id,
        fromPort: 'context',
        toPort: downstreamNode.inputs?.[0] ?? 'context',
      },
    ];

    expect(() => sanitizeTriggerPathConfig(config)).toThrowError(
      /unsupported trigger (output ports|data edges)/i
    );
  });
});

describe('buildTriggerContext', () => {
  it('omits persisted product snapshots from trigger payloads', () => {
    const context = buildTriggerContext({
      triggerNode: buildTriggerNode(),
      triggerEventId: 'trigger-product-row',
      triggerLabel: 'Run Product Path',
      entityType: 'product',
      entityId: 'product-123',
      entityJson: {
        id: 'product-123',
        name_en: 'Milk Bar Stool',
        imageBase64s: ['data:image/png;base64,AAAA'],
      },
      source: { location: 'product_row' },
    });

    expect(context).toMatchObject({
      entityId: 'product-123',
      entityType: 'product',
    });
    expect(context['entity']).toBeNull();
    expect(context['entityJson']).toBeUndefined();
    expect(context['product']).toBeUndefined();
    expect(context['productId']).toBeUndefined();
  });

  it('sanitizes embedded draft snapshots before enqueue', () => {
    const context = buildTriggerContext({
      triggerNode: buildTriggerNode(),
      triggerEventId: 'trigger-product-draft',
      triggerLabel: 'Run Draft Path',
      entityType: 'product',
      entityJson: {
        name_en: 'Draft Product',
        imageBase64s: ['raw-base64-payload'],
        imageLinks: ['https://cdn.example.test/image.jpg', 'data:image/png;base64,BBBB'],
        nested: {
          base64: 'nested-b64',
          keep: 'value',
          file: {
            buffer: 'buffer-payload',
            filename: 'photo.jpg',
          },
        },
      },
    });

    expect(context['entity']).toEqual({
      name_en: 'Draft Product',
      imageLinks: ['https://cdn.example.test/image.jpg', '[omitted_large_field]'],
      nested: {
        keep: 'value',
        file: {
          filename: 'photo.jpg',
        },
      },
    });
    expect(context['entityJson']).toBeUndefined();
    expect(context['product']).toBeUndefined();
  });
});

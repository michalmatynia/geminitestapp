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

const buildSanitizeTestTriggerNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-trigger-sanitize',
    type: 'trigger',
    title: 'Trigger',
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: [],
    outputs: ['trigger'],
    config: {
      trigger: { event: 'manual' },
    },
    createdAt: '2026-03-02T05:57:46.562Z',
    updatedAt: null,
    ...patch,
  }) as AiNode;

const buildSanitizeTestDatabaseNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-database-sanitize',
    type: 'database',
    title: 'Database Query',
    description: '',
    position: { x: 320, y: 0 },
    data: {},
    inputs: ['entityId', 'entityType', 'value', 'result', 'bundle'],
    outputs: ['result', 'bundle'],
    createdAt: '2026-03-02T05:57:46.562Z',
    updatedAt: null,
    ...patch,
  }) as AiNode;

const buildSanitizePathConfig = ({
  edges,
  nodes,
  pathId,
}: {
  edges: NonNullable<ReturnType<typeof createDefaultPathConfig>['edges']>;
  nodes: AiNode[];
  pathId: string;
}) => {
  const config = createDefaultPathConfig(pathId);
  config.nodes = nodes;
  config.edges = edges;
  return config;
};

const buildTriggerDatabasePathConfig = ({
  databaseNode,
  edgeId,
  pathId,
  triggerNode,
}: {
  databaseNode: AiNode;
  edgeId: string;
  pathId: string;
  triggerNode: AiNode;
}) =>
  buildSanitizePathConfig({
    pathId,
    nodes: [triggerNode, databaseNode],
    edges: [
      {
        id: edgeId,
        from: triggerNode.id,
        to: databaseNode.id,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ],
  });

describe('sanitizeTriggerPathConfig', () => {
  it('rejects unsupported database snapshot and provider payloads', () => {
    const legacyConfig = buildSanitizePathConfig({
      pathId: 'path_legacy_trigger',
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
        } as AiNode,
        buildSanitizeTestDatabaseNode({
          id: 'node-database-legacy',
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
        }),
      ],
      edges: [
        {
          id: 'edge-legacy-regex-db',
          from: 'node-regex-legacy',
          to: 'node-database-legacy',
          fromPort: 'value',
          toPort: 'value',
        },
      ],
    });

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

  it.each(['simulation_required', 'simulation_preferred'] as const)(
    'rejects removed legacy trigger context mode %s in trigger payloads',
    (contextMode) => {
      const config = createDefaultPathConfig(`path_trigger_context_${contextMode}`);
      const seedNode = config.nodes[0] as AiNode | undefined;
      if (!seedNode) {
        throw new Error('Expected default path fixture to include at least one node.');
      }
      config.nodes = [
        {
          ...seedNode,
          type: 'trigger',
          title: 'Trigger',
          inputs: ['context'],
          outputs: ['trigger', 'context', 'entityId', 'entityType'],
          config: {
            trigger: {
              event: 'manual',
              contextMode,
            },
          },
        } as AiNode,
      ];
      config.edges = [];

      expect(() => sanitizeTriggerPathConfig(config)).toThrowError(
        /removed legacy Trigger context modes/i
      );
    }
  );

  it('rejects unsupported parameter inference target path aliases in trigger payloads', () => {
    const config = buildTriggerDatabasePathConfig({
      pathId: 'path_trigger_param_guard',
      edgeId: 'edge-trigger-param-guard',
      triggerNode: buildSanitizeTestTriggerNode({
        id: 'node-trigger-param-guard',
        config: {
          trigger: { event: 'trigger-param-guard' },
        },
      }),
      databaseNode: buildSanitizeTestDatabaseNode({
        id: 'node-db-param-guard',
        title: 'Database Update',
        inputs: ['trigger', 'entityId', 'value'],
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
      }),
    });

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
          triggerEventId: 'trigger-product-list',
          triggerLabel: 'Run Product Path',
          entityType: 'product',
          entityId: 'product-123',
          entityJson: {
            id: 'product-123',
            name_en: 'Milk Bar Stool',
            imageBase64s: ['data:image/png;base64,AAAA'],
          },
          source: { location: 'product_list' },
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
    expect(context['entityJson']).toEqual(context['entity']);
    expect(context['product']).toBeUndefined();
  });
});

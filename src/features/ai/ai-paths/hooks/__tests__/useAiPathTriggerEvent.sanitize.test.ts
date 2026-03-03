import { describe, expect, it } from 'vitest';

import { aiNodeSchema, type AiNode } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { sanitizeTriggerPathConfig } from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';

describe('sanitizeTriggerPathConfig', () => {
  it('backfills legacy node timestamps and repairs stale database query config for enqueue', () => {
    const fallbackTimestamp = '2026-03-02T05:57:46.562Z';
    const baseConfig = createDefaultPathConfig('path_legacy_trigger');
    const legacyConfig = {
      ...baseConfig,
      updatedAt: fallbackTimestamp,
      nodes: [
        {
          id: 'node-regex-legacy',
          type: 'regex',
          position: { x: 0, y: 0 },
        },
        {
          id: 'node-database-legacy',
          type: 'database',
          position: { x: 320, y: 0 },
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
                queryTemplate: '{\"_id\":\"{{value}}\"}',
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

    const sanitized = sanitizeTriggerPathConfig(legacyConfig);
    const regexNode = sanitized.nodes.find((node: AiNode) => node.type === 'regex');
    const databaseNode = sanitized.nodes.find((node: AiNode) => node.type === 'database');

    expect(regexNode).toBeTruthy();
    expect(databaseNode).toBeTruthy();
    expect(regexNode?.createdAt).toBe(fallbackTimestamp);
    expect(regexNode?.updatedAt).toBeNull();
    expect(databaseNode?.createdAt).toBe(fallbackTimestamp);
    expect(databaseNode?.updatedAt).toBeNull();
    expect(databaseNode?.config?.database?.query?.provider).toBe('auto');
    expect(databaseNode?.config?.database).not.toHaveProperty('schemaSnapshot');

    sanitized.nodes.forEach((node: AiNode) => {
      const parsed = aiNodeSchema.safeParse(node);
      expect(parsed.success).toBe(true);
    });
  });

  it('does not rewrite renamed legacy EN->PL translation paths before trigger preflight', () => {
    const config = createDefaultPathConfig('path_translation_v2');
    config.name = 'Translation EN->PL Description + Parameters v2';
    config.nodes = [
      {
        id: 'node-regex-translate-en-pl',
        type: 'regex',
        title: 'Regex JSON Extract',
        description: '',
        position: { x: 0, y: 0 },
        data: {},
        inputs: ['value', 'prompt', 'regexCallback'],
        outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
      } as AiNode,
      {
        id: 'node-db-update-translate-en-pl',
        type: 'database',
        title: 'Database Query',
        description: '',
        position: { x: 320, y: 0 },
        data: {},
        inputs: ['entityId', 'entityType', 'value', 'result', 'bundle'],
        outputs: ['result', 'bundle'],
        config: {
          database: {
            operation: 'update',
            entityType: 'product',
            updatePayloadMode: 'mapping',
            updateTemplate: '',
            query: {
              provider: 'auto',
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
          },
        },
      } as AiNode,
    ];
    config.edges = [
      {
        id: 'edge-legacy-regex-db',
        from: 'node-regex-translate-en-pl',
        to: 'node-db-update-translate-en-pl',
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const sanitized = sanitizeTriggerPathConfig(config);
    const databaseNode = sanitized.nodes.find(
      (node: AiNode): boolean => node.id === 'node-db-update-translate-en-pl'
    );

    expect(databaseNode?.config?.database?.updatePayloadMode).not.toBe('custom');
    expect(String(databaseNode?.config?.database?.updateTemplate ?? '')).not.toContain(
      '"description_pl": "{{value.description_pl}}"'
    );
    expect(String(databaseNode?.config?.database?.updateTemplate ?? '')).not.toContain(
      '"parameters": {{value.parameters}}'
    );
  });
});

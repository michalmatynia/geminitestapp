import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { sanitizeTriggerPathConfig } from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';

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
        createdAt: '2026-03-02T05:57:46.562Z',
        updatedAt: null,
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
        createdAt: '2026-03-02T05:57:46.562Z',
        updatedAt: null,
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

    const snapshotBeforeSanitize = JSON.parse(JSON.stringify(config));
    const sanitized = sanitizeTriggerPathConfig(config);
    const databaseNode = sanitized.nodes.find(
      (node: AiNode): boolean => node.id === 'node-db-update-translate-en-pl'
    );

    expect(sanitized).toEqual(snapshotBeforeSanitize);
    expect(databaseNode?.config?.database?.updatePayloadMode).not.toBe('custom');
    expect(String(databaseNode?.config?.database?.updateTemplate ?? '')).not.toContain(
      '"description_pl": "{{value.description_pl}}"'
    );
    expect(String(databaseNode?.config?.database?.updateTemplate ?? '')).not.toContain(
      '"parameters": {{value.parameters}}'
    );
  });
});

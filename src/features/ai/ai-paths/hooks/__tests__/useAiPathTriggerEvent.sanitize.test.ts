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
});

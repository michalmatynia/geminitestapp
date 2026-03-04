import { describe, expect, it } from 'vitest';

import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';
import { migratePathConfigCollections } from '@/shared/lib/ai-paths/core/utils/collection-names';

const buildDbQuery = (collection: string) => ({
  provider: 'auto' as const,
  collection,
  mode: 'custom' as const,
  preset: 'by_id' as const,
  field: '_id',
  idType: 'string' as const,
  queryTemplate: '',
  limit: 20,
  sort: '',
  projection: '',
  single: false,
});

const buildNode = (config: Record<string, unknown>): AiNode =>
  ({
    id: 'node-db',
    type: 'database',
    title: 'Database',
    description: '',
    position: { x: 0, y: 0 },
    inputs: ['query'],
    outputs: ['result'],
    config,
    data: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
  }) as AiNode;

const buildPathConfig = (nodeConfig: Record<string, unknown>): PathConfig =>
  ({
    id: 'path-1',
    version: 1,
    name: 'Path 1',
    description: '',
    trigger: 'manual',
    executionMode: 'manual',
    nodes: [buildNode(nodeConfig)],
    edges: [],
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as PathConfig;

describe('collection name migration', () => {
  it('canonicalizes collection aliases in canonical config locations', () => {
    const source = buildPathConfig({
      database: {
        operation: 'query',
        query: buildDbQuery('integration_connection'),
      },
      poll: {
        intervalMs: 1000,
        maxAttempts: 5,
        mode: 'database',
        dbQuery: buildDbQuery('product_tag'),
      },
      db_schema: {
        provider: 'auto',
        mode: 'selected',
        collections: ['product_draft', 'settings'],
        includeFields: true,
        includeRelations: true,
        formatAs: 'text',
      },
    });

    const migrated = migratePathConfigCollections(source);

    expect(migrated.changed).toBe(true);
    const node = migrated.config.nodes[0];
    expect(node?.config?.database?.query?.collection).toBe('integration_connections');
    expect(node?.config?.poll?.dbQuery?.collection).toBe('product_tags');
    expect(node?.config?.db_schema?.collections).toEqual(['product_drafts', 'settings']);
  });

  it('ignores legacy top-level dbQuery compatibility payloads', () => {
    const source = buildPathConfig({
      dbQuery: buildDbQuery('integration_connection'),
      database: {
        operation: 'query',
      },
    });

    const migrated = migratePathConfigCollections(source);
    const migratedDbQuery = (migrated.config.nodes[0]?.config as Record<string, unknown>)['dbQuery'] as
      | Record<string, unknown>
      | undefined;

    expect(migrated.changed).toBe(false);
    expect(migratedDbQuery?.['collection']).toBe('integration_connection');
  });
});

import { describe, expect, it } from 'vitest';

import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';
import {
  canonicalizeAiPathsCollectionName,
  findPathConfigCollectionAliasIssues,
} from '@/shared/lib/ai-paths/core/utils/collection-names';

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

describe('collection name canonicalization', () => {
  it('reports collection alias issues only for canonical database query location', () => {
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

    const issues = findPathConfigCollectionAliasIssues(source);
    expect(issues).toEqual([
      {
        nodeId: 'node-db',
        location: 'database.query.collection',
        value: 'integration_connection',
        canonical: 'integration_connections',
      },
    ]);
  });

  it('ignores top-level dbQuery compatibility payloads in alias issue detection', () => {
    const source = buildPathConfig({
      dbQuery: buildDbQuery('integration_connection'),
      database: {
        operation: 'query',
      },
    });

    const issues = findPathConfigCollectionAliasIssues(source);
    expect(issues).toEqual([]);
  });

  it('canonicalizes recognized aliases and leaves unknown values unchanged', () => {
    expect(canonicalizeAiPathsCollectionName('integration_connection')).toBe(
      'integration_connections'
    );
    expect(canonicalizeAiPathsCollectionName('product_tags')).toBe('product_tags');
    expect(canonicalizeAiPathsCollectionName('unknown_collection')).toBe('unknown_collection');
  });
});

import { describe, expect, it } from 'vitest';

import { normalizeNodes } from '@/shared/lib/ai-paths/core/normalization';
import type { AiNode } from '@/shared/contracts/ai-paths';

const buildDatabaseNode = (config: Record<string, unknown>): AiNode =>
  ({
    id: 'database-node-1',
    type: 'database',
    title: 'Database',
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['result'],
    outputs: ['result'],
    config,
  }) as AiNode;

describe('database node normalization', () => {
  it('uses canonical database.query config', () => {
    const [normalized] = normalizeNodes([
      buildDatabaseNode({
        database: {
          operation: 'query',
          query: {
            provider: 'mongodb',
            collection: 'settings',
            mode: 'custom',
            preset: 'by_id',
            field: '_id',
            idType: 'objectId',
            queryTemplate: '{"_id":"abc"}',
            limit: 3,
            sort: '{"createdAt":-1}',
            projection: '{"_id":1}',
            single: true,
          },
        },
      }),
    ]);

    expect(normalized?.config?.database?.query).toMatchObject({
      provider: 'mongodb',
      collection: 'settings',
      idType: 'objectId',
      queryTemplate: '{"_id":"abc"}',
      limit: 3,
      sort: '{"createdAt":-1}',
      projection: '{"_id":1}',
      single: true,
    });
  });

  it('ignores legacy top-level dbQuery fallback config', () => {
    const [normalized] = normalizeNodes([
      buildDatabaseNode({
        dbQuery: {
          provider: 'mongodb',
          collection: 'settings',
          mode: 'custom',
          preset: 'by_id',
          field: '_id',
          idType: 'objectId',
          queryTemplate: '{"_id":"abc"}',
          limit: 3,
          sort: '{"createdAt":-1}',
          projection: '{"_id":1}',
          single: true,
        },
        database: {
          operation: 'query',
        },
      }),
    ]);

    expect(normalized?.config?.database?.query).toMatchObject({
      provider: 'auto',
      collection: 'products',
      mode: 'custom',
      preset: 'by_id',
      field: '_id',
      idType: 'string',
      queryTemplate: '',
      limit: 20,
      sort: '',
      projection: '',
      single: false,
    });
    expect(normalized?.config?.database?.query?.collection).not.toBe('settings');
  });

  it('does not auto-migrate canonical mongodb provider to auto', () => {
    const [normalized] = normalizeNodes([
      buildDatabaseNode({
        database: {
          operation: 'query',
          query: {
            provider: 'mongodb',
            collection: 'products',
            mode: 'preset',
            preset: 'by_id',
            field: '_id',
            idType: 'string',
            queryTemplate: '{\\n  "_id": "{{value}}"\\n}',
            limit: 20,
            sort: '',
            projection: '',
            single: false,
          },
        },
      }),
    ]);

    expect(normalized?.config?.database?.query).toMatchObject({
      provider: 'mongodb',
      collection: 'products',
      mode: 'preset',
      preset: 'by_id',
      field: '_id',
      idType: 'string',
      queryTemplate: '{\n  "_id": "{{value}}"\n}',
      limit: 20,
      sort: '',
      projection: '',
      single: false,
    });
  });
});

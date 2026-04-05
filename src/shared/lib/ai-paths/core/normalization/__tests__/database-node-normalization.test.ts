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

const buildDbSchemaNode = (config: Record<string, unknown>): AiNode =>
  ({
    id: 'db-schema-node-1',
    type: 'db_schema',
    title: 'Database Schema',
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: [],
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

  it('converts simple custom update templates with direct token mappings into mapping mode', () => {
    const [normalized] = normalizeNodes([
      buildDatabaseNode({
        database: {
          operation: 'update',
          updatePayloadMode: 'custom',
          updateTemplate:
            '{\n' +
            '  "$set": {\n' +
            '    "description_pl": "{{value.description_pl}}",\n' +
            '    "parameters": {{result.parameters}}\n' +
            '  }\n' +
            '}',
          mappings: [
            {
              targetPath: '__translation_description_payload__',
              sourcePort: 'value',
            },
            {
              targetPath: '__translation_parameters_payload__',
              sourcePort: 'result',
            },
          ],
        },
      }),
    ]);

    expect(normalized?.config?.database?.updatePayloadMode).toBe('mapping');
    expect(normalized?.config?.database?.mappings).toEqual([
      {
        targetPath: 'description_pl',
        sourcePort: 'value',
        sourcePath: 'description_pl',
      },
      {
        targetPath: 'parameters',
        sourcePort: 'result',
        sourcePath: 'parameters',
      },
    ]);
  });

  it('keeps custom update mode when the template is not a direct token-only $set payload', () => {
    const [normalized] = normalizeNodes([
      buildDatabaseNode({
        database: {
          operation: 'update',
          updatePayloadMode: 'custom',
          updateTemplate:
            '{\n' + '  "$set": {\n' + '    "slug": "pl-{{value.slug}}"\n' + '  }\n' + '}',
          mappings: [
            {
              targetPath: 'slug',
              sourcePort: 'value',
            },
          ],
        },
      }),
    ]);

    expect(normalized?.config?.database?.updatePayloadMode).toBe('custom');
    expect(normalized?.config?.database?.mappings).toEqual([
      {
        targetPath: 'slug',
        sourcePort: 'value',
      },
    ]);
  });

  it('keeps custom update mode for mongo-action update nodes even when the template is a direct token-only $set payload', () => {
    const [normalized] = normalizeNodes([
      buildDatabaseNode({
        database: {
          operation: 'update',
          updatePayloadMode: 'custom',
          useMongoActions: true,
          actionCategory: 'update',
          action: 'updateOne',
          updateTemplate:
            '{\n' + '  "$set": {\n' + '    "parameters": {{value}}\n' + '  }\n' + '}',
          mappings: [
            {
              targetPath: 'parameters',
              sourcePort: 'value',
            },
          ],
        },
      }),
    ]);

    expect(normalized?.config?.database?.updatePayloadMode).toBe('custom');
    expect(normalized?.config?.database?.mappings).toEqual([
      {
        targetPath: 'parameters',
        sourcePort: 'value',
      },
    ]);
  });

  it('normalizes db_schema nodes with defaults and canonical provider aliases', () => {
    const [normalized] = normalizeNodes([
      buildDbSchemaNode({
        db_schema: {
          provider: 'all',
          mode: 'selected',
          collections: ['products'],
          includeFields: false,
          includeRelations: false,
          formatAs: 'json',
        },
      }),
    ]);

    expect(normalized?.config?.db_schema).toEqual({
      provider: 'auto',
      mode: 'selected',
      collections: ['products'],
      includeFields: false,
      includeRelations: false,
      formatAs: 'json',
    });
  });
});

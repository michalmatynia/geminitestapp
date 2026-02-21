import { describe, it, expect } from 'vitest';

import {
  buildMongoUpdateDebugPayload,
  buildMongoUpdatesFromMappings,
  extractMissingTemplatePorts,
  resolveMongoUpdateFilter,
} from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-mongo-update-plan-helpers';

describe('Mongo update plan helpers', () => {
  it('resolves filter from parsed query template object', () => {
    const result = resolveMongoUpdateFilter({
      filter: { id: 'original' },
      queryTemplate: '{"id":"{{entityId}}"}',
      parseJsonTemplate: () => ({ id: 'resolved' }),
    });

    expect(result).toEqual({ id: 'resolved' });
  });

  it('falls back to provided filter when parsed template is not an object', () => {
    const result = resolveMongoUpdateFilter({
      filter: { id: 'original' },
      queryTemplate: '{"id":"{{entityId}}"}',
      parseJsonTemplate: () => ['not-object'],
    });

    expect(result).toEqual({ id: 'original' });
  });

  it('includes collection in debug payload', () => {
    const payload = buildMongoUpdateDebugPayload({
      actionCategory: 'update',
      action: 'updateOne',
      collection: 'products',
      resolvedFilter: { id: 'p-1' },
      updateTemplate: '',
      idType: 'string',
      resolvedInputs: {
        entityId: 'p-1',
        productId: 'p-1',
        entityType: 'product',
      },
    });

    expect(payload).toEqual(
      expect.objectContaining({
        mode: 'mongo',
        collection: 'products',
        filter: { id: 'p-1' },
      }),
    );
  });

  it('blocks mapping-based update construction', () => {
    expect(() =>
      buildMongoUpdatesFromMappings({
        dbConfig: {
          mappings: [{ targetPath: 'parameters', sourcePort: 'result' }],
        } as any,
        nodeInputPorts: ['result'],
        templateInputs: { result: [] },
        parameterTargetPath: 'parameters',
      })
    ).toThrow(
      'Mapping-based database updates are disabled. Use an explicit update template instead.'
    );
  });

  it('extracts missing template root ports while ignoring value/current', () => {
    const missing = extractMissingTemplatePorts(
      '{"a":"{{result.text}}","b":"{{value}}","c":"{{current}}","d":"{{missing.id}}"}',
      { result: { text: 'ok' } },
    );

    expect(missing).toEqual(['missing']);
  });
});

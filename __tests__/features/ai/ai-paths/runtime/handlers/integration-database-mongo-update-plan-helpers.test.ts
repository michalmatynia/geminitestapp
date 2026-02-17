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

  it('preserves array mapping for parameter target when guard is enabled', () => {
    const sourceArray = [{ parameterId: 'p_color', value: 'Blue' }];
    const result = buildMongoUpdatesFromMappings({
      dbConfig: {
        mappings: [{ targetPath: 'parameters', sourcePort: 'result' }],
        parameterInferenceGuard: {
          enabled: true,
          targetPath: 'parameters',
        },
      } as any,
      nodeInputPorts: ['result'],
      templateInputs: { result: sourceArray },
      parameterTargetPath: 'parameters',
    });

    expect(result.updates).toEqual({ parameters: sourceArray });
    expect(result.missingSourcePorts).toEqual([]);
    expect(result.unresolvedSourcePorts).toEqual([]);
  });

  it('marks unresolved result source path when nested path is missing', () => {
    const result = buildMongoUpdatesFromMappings({
      dbConfig: {
        mappings: [{ targetPath: 'content_en', sourcePort: 'result', sourcePath: 'payload.text' }],
      } as any,
      nodeInputPorts: ['result'],
      templateInputs: { result: { payload: {} } },
      parameterTargetPath: 'parameters',
    });

    expect(result.updates).toEqual({});
    expect(result.unresolvedSourcePorts).toEqual(['result']);
  });

  it('extracts missing template root ports while ignoring value/current', () => {
    const missing = extractMissingTemplatePorts(
      '{"a":"{{result.text}}","b":"{{value}}","c":"{{current}}","d":"{{missing.id}}"}',
      { result: { text: 'ok' } },
    );

    expect(missing).toEqual(['missing']);
  });
});

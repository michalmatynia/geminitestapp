import { describe, expect, it, vi } from 'vitest';

import { prepareDatabaseTemplateContext } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-template-context';

describe('prepareDatabaseTemplateContext catalogId canonical wiring', () => {
  it('does not promote catalogId from nested context entity data', () => {
    const { templateInputs, templateContext } = prepareDatabaseTemplateContext({
      resolvedInputs: {
        context: {
          entity: {
            catalogs: [{ catalogId: 'catalog-1' }],
          },
        },
      },
      dbConfig: {
        operation: 'query',
        entityType: 'product',
        idField: 'entityId',
        mode: 'replace',
        query: {
          provider: 'auto',
          collection: 'product_parameters',
          mode: 'custom',
          preset: 'by_id',
          field: 'id',
          idType: 'string',
          queryTemplate: '{"catalogId":"{{catalogId}}"}',
          limit: 20,
          sort: '',
          projection: '',
          single: false,
        },
        writeSource: 'bundle',
        writeSourcePath: '',
        dryRun: false,
      },
      aiPromptTemplate: '',
      simulationEntityType: null,
      fallbackEntityId: null,
      fetchEntityCached: vi.fn(async () => null),
      schemaData: null,
    });

    expect(templateInputs['catalogId']).toBeUndefined();
    expect(templateContext['catalogId']).toBeUndefined();

    const context = templateInputs['context'] as Record<string, unknown>;
    expect(context['catalogId']).toBeUndefined();
    expect((context['entity'] as Record<string, unknown>)['catalogId']).toBeUndefined();
  });

  it('preserves explicitly provided catalogId input', () => {
    const { templateInputs, templateContext } = prepareDatabaseTemplateContext({
      resolvedInputs: {
        catalogId: 'catalog-canonical',
        context: {
          entity: {
            catalogs: [{ catalogId: 'catalog-1' }],
          },
        },
      },
      dbConfig: {
        operation: 'query',
        entityType: 'product',
        idField: 'entityId',
        mode: 'replace',
        query: {
          provider: 'auto',
          collection: 'product_parameters',
          mode: 'custom',
          preset: 'by_id',
          field: 'id',
          idType: 'string',
          queryTemplate: '{"catalogId":"{{catalogId}}"}',
          limit: 20,
          sort: '',
          projection: '',
          single: false,
        },
        writeSource: 'bundle',
        writeSourcePath: '',
        dryRun: false,
      },
      aiPromptTemplate: '',
      simulationEntityType: null,
      fallbackEntityId: null,
      fetchEntityCached: vi.fn(async () => null),
      schemaData: null,
    });

    expect(templateInputs['catalogId']).toBe('catalog-canonical');
    expect(templateContext['catalogId']).toBe('catalog-canonical');
  });
});

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

  it('hydrates existing parameter context even when translated result parameters are already present', async () => {
    const fetchEntityCached = vi.fn(async () => ({
      id: 'product-1',
      parameters: [{ parameterId: 'color', value: 'Blue' }],
    }));

    const { templateInputs, ensureExistingParameterTemplateContext } = prepareDatabaseTemplateContext({
      resolvedInputs: {
        entityId: 'product-1',
        entityType: 'product',
        result: {
          parameters: [{ parameterId: 'color', valuesByLanguage: { pl: 'Niebieski' } }],
        },
      },
      dbConfig: {
        operation: 'update',
        entityType: 'product',
      } as never,
      aiPromptTemplate: '',
      simulationEntityType: null,
      fallbackEntityId: null,
      fetchEntityCached,
      schemaData: null,
    });

    await ensureExistingParameterTemplateContext('parameters');

    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'product-1');
    expect(templateInputs['context']).toEqual(
      expect.objectContaining({
        entity: expect.objectContaining({
          parameters: [{ parameterId: 'color', value: 'Blue' }],
        }),
        entityId: 'product-1',
        entityType: 'product',
        productId: 'product-1',
      })
    );
  });

  it('rehydrates product parameters when trigger context only carries scalar parameter values', async () => {
    const fetchEntityCached = vi.fn(async () => ({
      id: 'product-1',
      parameters: [
        {
          parameterId: 'color',
          value: 'Blue',
          valuesByLanguage: { en: 'Blue' },
        },
      ],
    }));

    const { templateInputs, ensureExistingParameterTemplateContext } = prepareDatabaseTemplateContext({
      resolvedInputs: {
        entityId: 'product-1',
        entityType: 'product',
        context: {
          entity: {
            parameters: [{ parameterId: 'color', value: 'Blue' }],
          },
          entityJson: {
            parameters: [{ parameterId: 'color', value: 'Blue' }],
          },
        },
        result: {
          parameters: [{ parameterId: 'color', value: 'Niebieski' }],
        },
      },
      dbConfig: {
        operation: 'update',
        entityType: 'product',
      } as never,
      aiPromptTemplate: '',
      simulationEntityType: null,
      fallbackEntityId: null,
      fetchEntityCached,
      schemaData: null,
    });

    await ensureExistingParameterTemplateContext('parameters');

    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'product-1');
    expect(templateInputs['context']).toEqual(
      expect.objectContaining({
        entity: expect.objectContaining({
          parameters: [
            {
              parameterId: 'color',
              value: 'Blue',
              valuesByLanguage: {
                en: 'Blue',
              },
            },
          ],
        }),
        entityJson: expect.objectContaining({
          parameters: [
            {
              parameterId: 'color',
              value: 'Blue',
              valuesByLanguage: {
                en: 'Blue',
              },
            },
          ],
        }),
      })
    );
  });

  it('forces canonical product parameter rehydration for translation merges even when modal context carries localized rows', async () => {
    const fetchEntityCached = vi.fn(async () => ({
      id: 'product-1',
      parameters: [
        {
          parameterId: 'color',
          value: 'Blue',
          valuesByLanguage: { en: 'Blue' },
        },
      ],
    }));

    const { templateInputs, ensureExistingParameterTemplateContext } = prepareDatabaseTemplateContext({
      resolvedInputs: {
        entityId: 'product-1',
        entityType: 'product',
        context: {
          entity: {
            parameters: [
              {
                parameterId: 'color',
                value: 'Blue',
                valuesByLanguage: { pl: 'Niebieski' },
              },
            ],
          },
          entityJson: {
            parameters: [
              {
                parameterId: 'color',
                value: 'Blue',
                valuesByLanguage: { pl: 'Niebieski' },
              },
            ],
          },
        },
        result: {
          parameters: [{ parameterId: 'color', value: 'Niebieski' }],
        },
      },
      dbConfig: {
        operation: 'update',
        entityType: 'product',
      } as never,
      aiPromptTemplate: '',
      simulationEntityType: null,
      fallbackEntityId: null,
      fetchEntityCached,
      schemaData: null,
    });

    await ensureExistingParameterTemplateContext('parameters', {
      forceHydrateRichParameters: true,
    });

    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'product-1');
    expect(templateInputs['context']).toEqual(
      expect.objectContaining({
        entity: expect.objectContaining({
          parameters: [
            {
              parameterId: 'color',
              value: 'Blue',
              valuesByLanguage: { en: 'Blue' },
            },
          ],
        }),
        entityJson: expect.objectContaining({
          parameters: [
            {
              parameterId: 'color',
              value: 'Blue',
              valuesByLanguage: { en: 'Blue' },
            },
          ],
        }),
      })
    );
  });

  it('formats schema placeholders with normalized primitive aliases', () => {
    const { templateContext } = prepareDatabaseTemplateContext({
      resolvedInputs: {},
      dbConfig: {
        operation: 'query',
        entityType: 'product',
      } as never,
      aiPromptTemplate: '',
      simulationEntityType: null,
      fallbackEntityId: null,
      fetchEntityCached: vi.fn(async () => null),
      schemaData: {
        collections: [
          {
            name: 'product_variants',
            fields: [
              { name: 'price', type: 'decimal' },
              { name: 'enabled', type: 'bool' },
              { name: 'payload', type: 'json' },
              { name: 'createdAt', type: 'datetime' },
            ],
          },
        ],
      } as never,
    });

    expect(templateContext['Collection: product_variants']).toBe(
      'interface Product Variant {\n' +
        '  price: number;\n' +
        '  enabled: boolean;\n' +
        '  payload: Record<string, unknown>;\n' +
        '  createdAt: string;\n' +
        '}'
    );
  });
});

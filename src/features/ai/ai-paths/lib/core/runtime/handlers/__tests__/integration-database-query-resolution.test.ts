import { describe, expect, it, vi } from 'vitest';

import { resolveDatabaseQuery } from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration-database-query-resolution';

const baseQueryConfig = {
  provider: 'auto' as const,
  collection: 'products',
  mode: 'custom' as const,
  preset: 'by_id' as const,
  field: '_id',
  idType: 'string' as const,
  queryTemplate: '{"id":"{{value}}"}',
  limit: 20,
  sort: '',
  projection: '',
  single: false,
};

describe('resolveDatabaseQuery guardrails', () => {
  it('blocks empty custom query templates', () => {
    const toast = vi.fn();

    const result = resolveDatabaseQuery({
      nodeInputs: {},
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      queryConfig: {
        ...baseQueryConfig,
        queryTemplate: '',
      },
      templateInputValue: '',
      templateContext: {},
      aiPrompt: 'test',
    });

    expect('output' in result).toBe(true);
    if (!('output' in result)) {
      throw new Error('Expected guardrail output.');
    }

    expect(result.output.bundle).toEqual(
      expect.objectContaining({
        error: 'Custom query template is empty. Use {} explicitly for full collection scans.',
        guardrail: 'query-resolution',
        querySource: 'customTemplate',
      })
    );
    expect(toast).toHaveBeenCalledWith(
      'Custom query template is empty. Use {} explicitly for full collection scans.',
      { variant: 'error' }
    );
  });

  it('blocks invalid query templates', () => {
    const toast = vi.fn();

    const result = resolveDatabaseQuery({
      nodeInputs: {},
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      queryConfig: {
        ...baseQueryConfig,
        queryTemplate: '{"id":"{{value}}"',
      },
      templateInputValue: 'abc-1',
      templateContext: {
        value: 'abc-1',
      },
      aiPrompt: 'test',
    });

    expect('output' in result).toBe(true);
    if (!('output' in result)) {
      throw new Error('Expected guardrail output.');
    }

    expect(result.output.bundle).toEqual(
      expect.objectContaining({
        error: 'Query template must render to a valid JSON object.',
        guardrail: 'query-resolution',
      })
    );
  });

  it('blocks templates that depend on missing ports', () => {
    const toast = vi.fn();

    const result = resolveDatabaseQuery({
      nodeInputs: {},
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      queryConfig: {
        ...baseQueryConfig,
        queryTemplate: '{"id":"{{entityId}}"}',
      },
      templateInputValue: 'ignored',
      templateContext: {
        value: 'fallback-id',
      },
      aiPrompt: 'test',
    });

    expect('output' in result).toBe(true);
    if (!('output' in result)) {
      throw new Error('Expected guardrail output.');
    }

    expect(result.output.bundle).toEqual(
      expect.objectContaining({
        error: 'Query template is missing connected inputs: entityId.',
        guardrail: 'query-resolution',
      })
    );
  });

  it('keeps explicit query input as highest priority source', () => {
    const toast = vi.fn();

    const result = resolveDatabaseQuery({
      nodeInputs: {
        query: {
          id: 'explicit-id',
          status: 'active',
        },
      },
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      queryConfig: {
        ...baseQueryConfig,
        queryTemplate: '{"id":"{{value}}"}',
      },
      templateInputValue: 'template-id',
      templateContext: {
        value: 'template-id',
      },
      aiPrompt: 'test',
    });

    expect('output' in result).toBe(false);
    if ('output' in result) {
      throw new Error('Expected parsed query result.');
    }

    expect(result.query).toEqual({
      id: 'explicit-id',
      status: 'active',
    });
    expect(result.querySource).toBe('input');
  });

  it('does not treat JSON array syntax in templates as missing input ports', () => {
    const toast = vi.fn();

    const result = resolveDatabaseQuery({
      nodeInputs: {},
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      resolvedInputs: {},
      queryConfig: {
        ...baseQueryConfig,
        collection: 'product_parameters',
        queryTemplate:
          '{\n' +
          '  "$or": [\n' +
          '    { "catalogId": "{{context.entity.catalogId}}" },\n' +
          '    { "catalogId": "{{context.entity.catalogs[0].catalogId}}" }\n' +
          '  ]\n' +
          '}',
      },
      templateInputValue: '',
      templateContext: {
        context: {
          entity: {
            catalogId: 'catalog-1',
            catalogs: [{ catalogId: 'catalog-1' }],
          },
        },
      },
      aiPrompt: 'test',
    });

    expect('output' in result).toBe(false);
    if ('output' in result) {
      throw new Error('Expected parsed query result.');
    }

    expect(result.query).toEqual({
      $or: [{ catalogId: 'catalog-1' }, { catalogId: 'catalog-1' }],
    });
    expect(result.querySource).toBe('customTemplate');
  });
});

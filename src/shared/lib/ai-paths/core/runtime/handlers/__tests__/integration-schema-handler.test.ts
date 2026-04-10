import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, NodeHandlerContext } from '@/shared/contracts/ai-paths-core';

const { schemaMock, browseMock } = vi.hoisted(() => ({
  schemaMock: vi.fn(),
  browseMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  dbApi: {
    schema: schemaMock,
    browse: browseMock,
  },
}));

const buildNode = (dbSchema: Record<string, unknown>): AiNode =>
  ({
    id: 'node-db-schema',
    type: 'db_schema',
    title: 'Database Schema',
    description: 'Database schema node',
    position: { x: 0, y: 0 },
    data: {},
    inputs: [],
    outputs: ['schema', 'context'],
    config: {
      db_schema: dbSchema,
    },
  }) as AiNode;

const buildContext = (node: AiNode): NodeHandlerContext =>
  ({
    node,
    nodeInputs: {},
    prevOutputs: {},
    edges: [],
    nodes: [node],
    nodeById: new Map([[node.id, node]]),
    runId: 'run-1',
    runStartedAt: new Date().toISOString(),
    activePathId: 'path-1',
    now: new Date().toISOString(),
    allOutputs: {},
    allInputs: {},
    fetchEntityCached: async () => null,
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    simulationEntityType: null,
    simulationEntityId: null,
    resolvedEntity: null,
    fallbackEntityId: null,
    strictFlowMode: true,
    executed: {
      notification: new Set<string>(),
      updater: new Set<string>(),
      http: new Set<string>(),
      delay: new Set<string>(),
      poll: new Set<string>(),
      ai: new Set<string>(),
      schema: new Set<string>(),
      mapper: new Set<string>(),
    },
  }) as NodeHandlerContext;

const buildContextWithInputs = (
  node: AiNode,
  nodeInputs: Record<string, unknown>
): NodeHandlerContext =>
  ({
    ...buildContext(node),
    nodeInputs,
  }) as NodeHandlerContext;

describe('handleDbSchema', () => {
  beforeEach(() => {
    vi.resetModules();
    schemaMock.mockReset();
    browseMock.mockReset();
  });

  it('filters provider-qualified collection selections and emits schema context text', async () => {
    schemaMock.mockResolvedValue({
      ok: true,
      data: {
        provider: 'multi',
        collections: [
          {
            name: 'product_categories',
            provider: 'mongodb',
            fields: [{ name: 'name_en', type: 'string' }],
          },
          {
            name: 'orders',
            provider: 'mongodb',
            fields: [{ name: 'status', type: 'string' }],
          },
        ],
      },
    });

    const { handleDbSchema } = await import(
      '@/shared/lib/ai-paths/core/runtime/handlers/integration-schema-handler'
    );

    const result = await handleDbSchema(
      buildContext(
        buildNode({
          mode: 'selected',
          collections: ['mongodb:product_categories'],
          includeFields: true,
          includeRelations: true,
          formatAs: 'text',
        })
      )
    );

    expect(result['schema']).toEqual(
      expect.objectContaining({
        collections: [
          expect.objectContaining({
            name: 'product_categories',
          }),
        ],
      })
    );
    expect(result['context']).toEqual(
      expect.objectContaining({
        sourceMode: 'schema',
        contextText: expect.stringContaining('Collection: product_categories'),
      })
    );
    expect(browseMock).not.toHaveBeenCalled();
  });

  it('loads live collection context and refreshes it across runs', async () => {
    schemaMock.mockResolvedValue({
      ok: true,
      data: {
        provider: 'mongodb',
        collections: [
          {
            name: 'product_categories',
            fields: [{ name: 'name_en', type: 'string' }],
          },
        ],
      },
    });
    browseMock
      .mockResolvedValueOnce({
        ok: true,
        data: {
          provider: 'mongodb',
          collection: 'product_categories',
          documents: [{ _id: 'cat-1', name_en: 'Lighting' }],
          total: 1,
          limit: 5,
          skip: 0,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          provider: 'mongodb',
          collection: 'product_categories',
          documents: [{ _id: 'cat-2', name_en: 'Decor' }],
          total: 1,
          limit: 5,
          skip: 0,
        },
      });

    const { handleDbSchema } = await import(
      '@/shared/lib/ai-paths/core/runtime/handlers/integration-schema-handler'
    );

    const node = buildNode({
      mode: 'selected',
      collections: ['product_categories'],
      sourceMode: 'schema_and_live_context',
      contextCollections: ['product_categories'],
      contextQuery: '{"catalogId":"catalog-1"}',
      contextLimit: 5,
      includeFields: true,
      includeRelations: true,
      formatAs: 'json',
    });

    const firstRun = await handleDbSchema(buildContext(node));
    const secondRun = await handleDbSchema(buildContext(node));

    expect(browseMock).toHaveBeenCalledTimes(2);
    expect(firstRun['context']).toEqual(
      expect.objectContaining({
        liveContext: expect.objectContaining({
          selectedCollections: ['product_categories'],
          query: '{"catalogId":"catalog-1"}',
        }),
      })
    );
    expect(
      (
        firstRun['context'] as {
          liveContext: { collectionMap: Record<string, { documents: Array<Record<string, unknown>> }> };
        }
      ).liveContext.collectionMap['product_categories'].documents[0]?.['name_en']
    ).toBe('Lighting');
    expect(
      (
        secondRun['context'] as {
          liveContext: { collectionMap: Record<string, { documents: Array<Record<string, unknown>> }> };
        }
      ).liveContext.collectionMap['product_categories'].documents[0]?.['name_en']
    ).toBe('Decor');
    expect(String((firstRun['context'] as { contextText: string }).contextText)).toContain(
      '"liveContext"'
    );
  });

  it('renders runtime query templates from connected db_schema inputs', async () => {
    schemaMock.mockResolvedValue({
      ok: true,
      data: {
        provider: 'mongodb',
        collections: [
          {
            name: 'product_categories',
            fields: [{ name: 'name_en', type: 'string' }],
          },
        ],
      },
    });
    browseMock.mockResolvedValueOnce({
      ok: true,
      data: {
        provider: 'mongodb',
        collection: 'product_categories',
        documents: [{ _id: 'cat-1', catalogId: 'catalog-1', name_en: 'Pins' }],
        total: 1,
        limit: 25,
        skip: 0,
      },
    });

    const { handleDbSchema } = await import(
      '@/shared/lib/ai-paths/core/runtime/handlers/integration-schema-handler'
    );

    const node = buildNode({
      mode: 'selected',
      collections: ['product_categories'],
      sourceMode: 'live_context',
      contextCollections: ['product_categories'],
      contextQuery: '{\n  "catalogId": "{{context.catalogId}}"\n}',
      contextLimit: 25,
      includeFields: true,
      includeRelations: true,
      formatAs: 'json',
    });

    const result = await handleDbSchema(
      buildContextWithInputs(node, {
        context: {
          catalogId: 'catalog-1',
          categoryId: 'category-2',
        },
      })
    );

    expect(browseMock).toHaveBeenCalledWith(
      'product_categories',
      expect.objectContaining({
        provider: 'auto',
        limit: 25,
        query: '{\n  "catalogId": "catalog-1"\n}',
      })
    );
    expect(result['context']).toEqual(
      expect.objectContaining({
        liveContext: expect.objectContaining({
          query: '{\n  "catalogId": "catalog-1"\n}',
        }),
      })
    );
  });
});

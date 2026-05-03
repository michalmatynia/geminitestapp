import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  assertDatabaseEngineManageAccessOrAiPathsInternal: vi.fn(),
  isCollectionAllowed: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccessOrAiPathsInternal:
    mocks.assertDatabaseEngineManageAccessOrAiPathsInternal,
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  isCollectionAllowed: mocks.isCollectionAllowed,
}));

describe('database schema handler', () => {
  beforeEach(() => {
    mocks.assertDatabaseEngineManageAccessOrAiPathsInternal
      .mockReset()
      .mockResolvedValue({ isInternal: true });
    mocks.isCollectionAllowed
      .mockReset()
      .mockImplementation((collection: string) => collection === 'product_categories');
    mocks.getMongoDb.mockReset().mockResolvedValue({
      listCollections: () => ({
        toArray: async () => [
          { name: 'product_categories' },
          { name: 'secret_collection' },
        ],
      }),
      collection: (name: string) => ({
        find: () => ({
          limit: () => ({
            toArray: async () =>
              name === 'product_categories'
                ? [{ _id: 'cat-1', name_en: 'Keychains' }]
                : [{ _id: 'secret-1', token: 'hidden' }],
          }),
        }),
        estimatedDocumentCount: async () => 1,
      }),
    });
  });

  it('filters internal schema responses to the AI-path allowlist', async () => {
    const { getDatabasesSchemaHandler } = await import('./handler');

    const response = await getDatabasesSchemaHandler({} as never, {
      query: { provider: 'all' },
    } as never);

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      provider: string;
      collections: Array<{ name: string }>;
      sources?: { mongodb?: { collections?: Array<{ name: string }> } };
    };

    expect(payload.provider).toBe('multi');
    expect(payload.collections.map((collection) => collection.name)).toEqual(['product_categories']);
    expect(payload.sources?.mongodb?.collections?.map((collection) => collection.name)).toEqual([
      'product_categories',
    ]);
  });
});

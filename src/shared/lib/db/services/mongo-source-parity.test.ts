/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { verifyMongoSourceParity } from './mongo-source-parity';

type FakeCollectionEntry = {
  name: string;
  type?: string;
  options?: Record<string, unknown>;
};

type FakeMongoDbInput = {
  collections: FakeCollectionEntry[];
  documents?: Record<string, Array<Record<string, unknown>>>;
  indexes?: Record<string, Array<Record<string, unknown>>>;
};

const makeAsyncIterable = (documents: Array<Record<string, unknown>>) => ({
  async *[Symbol.asyncIterator]() {
    for (const document of documents) {
      yield document;
    }
  },
});

const makeFakeMongoDb = (input: FakeMongoDbInput) => ({
  listCollections: () => ({
    toArray: async () => input.collections,
  }),
  collection: (name: string) => ({
    listIndexes: () => ({
      toArray: async () => input.indexes?.[name] ?? [{ name: '_id_', key: { _id: 1 } }],
    }),
    find: () => ({
      sort: () => makeAsyncIterable(input.documents?.[name] ?? []),
    }),
  }),
});

describe('mongo-source-parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes when source and target collections, indexes, options, and documents match canonically', async () => {
    const sourceDb = makeFakeMongoDb({
      collections: [{ name: 'products', type: 'collection', options: { capped: false } }],
      documents: {
        products: [{ _id: '1', name: { en: 'Lamp', pl: 'Lampa' }, stock: 3 }],
      },
      indexes: {
        products: [{ name: '_id_', key: { _id: 1 }, v: 2 }],
      },
    });
    const targetDb = makeFakeMongoDb({
      collections: [{ name: 'products', type: 'collection', options: { capped: false } }],
      documents: {
        products: [{ stock: 3, name: { pl: 'Lampa', en: 'Lamp' }, _id: '1' }],
      },
      indexes: {
        products: [{ v: 2, key: { _id: 1 }, name: '_id_' }],
      },
    });
    mocks.getMongoDb.mockImplementation(async (source: string) =>
      source === 'local' ? sourceDb : targetDb
    );

    const result = await verifyMongoSourceParity({
      source: 'local',
      target: 'cloud',
      sourceDbName: 'app_local',
      targetDbName: 'app_cloud',
    });

    expect(result.status).toBe('passed');
    expect(result.mismatches).toEqual([]);
    expect(result.collections[0]).toEqual(
      expect.objectContaining({
        name: 'products',
        sourceCount: 1,
        targetCount: 1,
        documentsMatch: true,
        indexesMatch: true,
        optionsMatch: true,
      })
    );
  });

  it('fails when target has extra collections or document hashes diverge', async () => {
    const sourceDb = makeFakeMongoDb({
      collections: [{ name: 'products', type: 'collection', options: {} }],
      documents: {
        products: [{ _id: '1', stock: 3 }],
      },
    });
    const targetDb = makeFakeMongoDb({
      collections: [
        { name: 'products', type: 'collection', options: {} },
        { name: 'orphaned', type: 'collection', options: {} },
      ],
      documents: {
        products: [{ _id: '1', stock: 2 }],
        orphaned: [{ _id: 'extra' }],
      },
    });
    mocks.getMongoDb.mockImplementation(async (source: string) =>
      source === 'local' ? sourceDb : targetDb
    );

    const result = await verifyMongoSourceParity({
      source: 'local',
      target: 'cloud',
      sourceDbName: 'app_local',
      targetDbName: 'app_cloud',
    });

    expect(result.status).toBe('failed');
    expect(result.mismatches).toEqual(
      expect.arrayContaining([
        'Collection "products" document mismatch: count 1 != 1.',
        'Target has extra collection "orphaned".',
      ])
    );
    expect(result.collections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'products',
          documentsMatch: false,
        }),
        expect.objectContaining({
          name: 'orphaned',
          sourceExists: false,
          targetExists: true,
        }),
      ])
    );
  });
});

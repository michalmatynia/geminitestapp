import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

const createCategoryMappingDoc = (overrides: Partial<Record<string, unknown>> = {}) => ({
  _id: 'mapping-1',
  connectionId: 'conn-1',
  externalCategoryId: 'legacy-external-doc-id',
  internalCategoryId: 'internal-category-1',
  catalogId: 'catalog-1',
  isActive: true,
  createdAt: new Date('2026-03-22T00:00:00.000Z'),
  updatedAt: new Date('2026-03-22T00:00:00.000Z'),
  ...overrides,
});

const createExternalCategoryDoc = (overrides: Partial<Record<string, unknown>> = {}) => ({
  _id: 'legacy-external-doc-id',
  connectionId: 'conn-1',
  externalId: 'base-category-42',
  name: 'Desk Lamps',
  parentExternalId: null,
  path: 'Desk Lamps',
  depth: 0,
  isLeaf: true,
  metadata: null,
  fetchedAt: new Date('2026-03-22T00:00:00.000Z'),
  createdAt: new Date('2026-03-22T00:00:00.000Z'),
  updatedAt: new Date('2026-03-22T00:00:00.000Z'),
  ...overrides,
});

const createInternalCategoryDoc = (overrides: Partial<Record<string, unknown>> = {}) => ({
  _id: 'internal-category-1',
  name: 'Desk Lamps',
  description: null,
  color: null,
  parentId: null,
  catalogId: 'catalog-1',
  createdAt: new Date('2026-03-22T00:00:00.000Z'),
  updatedAt: new Date('2026-03-22T00:00:00.000Z'),
  ...overrides,
});

describe('mongoCategoryMappingImpl canonical external ids', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns canonical marketplace external ids from listByConnection for legacy mappings', async () => {
    const mappingsToArrayMock = vi.fn().mockResolvedValue([createCategoryMappingDoc()]);
    const mappingsFindMock = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: mappingsToArrayMock,
      }),
    });
    const externalFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([createExternalCategoryDoc()]),
    });
    const internalFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([createInternalCategoryDoc()]),
    });
    const connectionFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: 'conn-1' }]),
    });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'integration_connections') {
          return { find: connectionFindMock };
        }
        if (name === 'category_mappings') {
          return { find: mappingsFindMock };
        }
        if (name === 'external_categories') {
          return { find: externalFindMock };
        }
        if (name === 'product_categories') {
          return { find: internalFindMock };
        }
        throw new Error(`Unexpected collection ${name}`);
      }),
    });

    const { mongoCategoryMappingImpl } = await import('./mongo-impl');
    const result = await mongoCategoryMappingImpl.listByConnection('conn-1', 'catalog-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      externalCategoryId: 'base-category-42',
      externalCategory: {
        id: 'legacy-external-doc-id',
        externalId: 'base-category-42',
        name: 'Desk Lamps',
      },
      internalCategoryId: 'internal-category-1',
      internalCategory: {
        id: 'internal-category-1',
        name: 'Desk Lamps',
      },
    });
    expect(mappingsFindMock).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      catalogId: 'catalog-1',
    });
  });

  it('migrates legacy external-category aliases to canonical externalId on lookup', async () => {
    const legacyMapping = createCategoryMappingDoc();
    const migratedMapping = createCategoryMappingDoc({
      externalCategoryId: 'base-category-42',
      updatedAt: new Date('2026-03-22T01:00:00.000Z'),
    });

    const mappingFindOneMock = vi.fn().mockResolvedValue(legacyMapping);
    const mappingFindOneAndUpdateMock = vi.fn().mockResolvedValue(migratedMapping);
    const externalFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([createExternalCategoryDoc()]),
    });
    const connectionFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: 'conn-1' }]),
    });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'integration_connections') {
          return { find: connectionFindMock };
        }
        if (name === 'category_mappings') {
          return {
            findOne: mappingFindOneMock,
            findOneAndUpdate: mappingFindOneAndUpdateMock,
          };
        }
        if (name === 'external_categories') {
          return { find: externalFindMock };
        }
        throw new Error(`Unexpected collection ${name}`);
      }),
    });

    const { mongoCategoryMappingImpl } = await import('./mongo-impl');
    const result = await mongoCategoryMappingImpl.getByExternalCategory(
      'conn-1',
      'base-category-42',
      'catalog-1'
    );

    expect(mappingFindOneMock).toHaveBeenCalledWith(
      {
        connectionId: 'conn-1',
        catalogId: 'catalog-1',
        externalCategoryId: {
          $in: ['base-category-42', 'legacy-external-doc-id'],
        },
      },
      {
        sort: { updatedAt: -1, createdAt: -1 },
      }
    );
    expect(mappingFindOneAndUpdateMock).toHaveBeenCalledWith(
      { _id: 'mapping-1' },
      {
        $set: {
          externalCategoryId: 'base-category-42',
          updatedAt: expect.any(Date),
        },
      },
      { returnDocument: 'after' }
    );
    expect(result).toMatchObject({
      id: 'mapping-1',
      externalCategoryId: 'base-category-42',
      internalCategoryId: 'internal-category-1',
    });
  });

  it('omits mappings whose integration connection no longer exists', async () => {
    const activeMapping = createCategoryMappingDoc();
    const orphanedMapping = createCategoryMappingDoc({
      _id: 'mapping-deleted-connection',
      connectionId: 'deleted-conn',
      externalCategoryId: 'deleted-external-category',
    });
    const mappingsFindMock = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([activeMapping, orphanedMapping]),
      }),
    });
    const connectionFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: 'conn-1' }]),
    });
    const externalFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([createExternalCategoryDoc()]),
    });
    const internalFindMock = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([createInternalCategoryDoc()]),
    });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'integration_connections') {
          return { find: connectionFindMock };
        }
        if (name === 'category_mappings') {
          return { find: mappingsFindMock };
        }
        if (name === 'external_categories') {
          return { find: externalFindMock };
        }
        if (name === 'product_categories') {
          return { find: internalFindMock };
        }
        throw new Error(`Unexpected collection ${name}`);
      }),
    });

    const { mongoCategoryMappingImpl } = await import('./mongo-impl');
    const result = await mongoCategoryMappingImpl.listByInternalCategory(
      'internal-category-1',
      'catalog-1'
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.connectionId).toBe('conn-1');
    expect(result[0]?.id).toBe('mapping-1');
  });
});

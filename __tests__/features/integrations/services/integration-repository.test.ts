import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
import type {
  ConnectionCreateInputDto,
  ConnectionUpdateInputDto,
} from '@/shared/contracts/integrations';

const {
  mockCollection,
  mockFind,
  mockFindOne,
  mockInsertOne,
  mockDeleteMany,
  mockCountDocuments,
  mockUpdateMany,
  mockFindOneAndUpdate,
} = vi.hoisted(() => {
  const mockInsertOne = vi.fn();
  const mockFindOne = vi.fn();
  const mockFind = vi.fn();
  const mockDeleteMany = vi.fn();
  const mockCountDocuments = vi.fn();
  const mockUpdateMany = vi.fn();
  const mockFindOneAndUpdate = vi.fn();

  const mockCollection = vi.fn(() => ({
    findOne: mockFindOne,
    find: mockFind,
    insertOne: mockInsertOne,
    deleteMany: mockDeleteMany,
    countDocuments: mockCountDocuments,
    updateMany: mockUpdateMany,
    findOneAndUpdate: mockFindOneAndUpdate,
  }));

  return {
    mockCollection,
    mockFind,
    mockFindOne,
    mockInsertOne,
    mockDeleteMany,
    mockCountDocuments,
    mockUpdateMany,
    mockFindOneAndUpdate,
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: mockCollection,
  }),
  getMongoClient: vi.fn(),
}));

describe('Integration Repository', () => {
  const now = new Date('2026-03-12T00:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists integrations from mongo', async () => {
    const docs = [{ _id: '1', name: 'Int 1', slug: 'int-1', createdAt: now, updatedAt: now }];
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue(docs),
    });

    const repo = await getIntegrationRepository();
    const result = await repo.listIntegrations();

    expect(mockCollection).toHaveBeenCalledWith('integrations');
    expect(mockFind).toHaveBeenCalledWith();
    expect(result).toEqual([
      expect.objectContaining({
        id: '1',
        name: 'Int 1',
        slug: 'int-1',
      }),
    ]);
  });

  it('creates connections in mongo', async () => {
    mockInsertOne.mockResolvedValue({ insertedId: 'c1' });

    const repo = await getIntegrationRepository();
    const result = await repo.createConnection('int-1', {
      name: 'Conn 1',
      username: 'user',
      password: 'pass',
    } as ConnectionCreateInputDto);

    expect(mockCollection).toHaveBeenCalledWith('integration_connections');
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationId: 'int-1',
        name: 'Conn 1',
        username: 'user',
        password: 'pass',
      })
    );
    expect(result.id).toBe('c1');
  });

  it('tolerates legacy string timestamps when listing connections', async () => {
    const iso = '2026-02-26T21:00:00.000Z';
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([
        {
          _id: 'c1',
          integrationId: 'int-1',
          name: 'Conn 1',
          username: 'user',
          password: 'pass',
          createdAt: iso,
          updatedAt: iso,
          baseTokenUpdatedAt: iso,
        },
      ]),
    });

    const repo = await getIntegrationRepository();
    const result = await repo.listConnections('int-1');

    expect(mockCollection).toHaveBeenCalledWith('integration_connections');
    expect(result[0]?.id).toBe('c1');
    expect(result[0]?.createdAt).toBe(iso);
    expect(result[0]?.baseTokenUpdatedAt).toBe(iso);
  });

  it('matches both string and ObjectId candidates when reading a connection by id', async () => {
    const legacyId = '69a0bd1222b8b6a199060c3c';
    mockFindOne.mockResolvedValue({
      _id: legacyId,
      integrationId: 'int-1',
      name: 'Conn 1',
      username: '',
      password: 'pass',
      createdAt: now,
      updatedAt: now,
    });

    const repo = await getIntegrationRepository();
    const result = await repo.getConnectionById(legacyId);

    expect(result?.id).toBe(legacyId);
    expect(mockFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.objectContaining({
          $in: expect.arrayContaining([legacyId]),
        }),
      })
    );
    const filter = mockFindOne.mock.calls[0]?.[0] as { _id?: { $in?: unknown[] } };
    expect(filter._id?.$in).toHaveLength(2);
    expect(String(filter._id?.$in?.[1])).toBe(legacyId);
  });

  it('matches both string and ObjectId candidates when updating a connection', async () => {
    const legacyId = '69a0bd1222b8b6a199060c3c';
    mockFindOneAndUpdate.mockResolvedValue({
      _id: legacyId,
      integrationId: 'int-1',
      name: 'Conn Updated',
      username: '',
      password: 'pass',
      createdAt: now,
      updatedAt: now,
    });

    const repo = await getIntegrationRepository();
    await repo.updateConnection(legacyId, {
      name: 'Conn Updated',
    } as ConnectionUpdateInputDto);

    const filter = mockFindOneAndUpdate.mock.calls[0]?.[0] as { _id?: { $in?: unknown[] } };
    expect(filter._id?.$in).toHaveLength(2);
    expect(filter._id?.$in?.[0]).toBe(legacyId);
    expect(String(filter._id?.$in?.[1])).toBe(legacyId);
  });

  it('upserts integrations in mongo', async () => {
    mockFindOneAndUpdate.mockResolvedValue({
      _id: '1',
      slug: 'int-1',
      name: 'New',
      createdAt: now,
      updatedAt: now,
    });

    const repo = await getIntegrationRepository();
    const result = await repo.upsertIntegration({ name: 'New', slug: 'int-1' });

    expect(mockCollection).toHaveBeenCalledWith('integrations');
    expect(mockFindOneAndUpdate).toHaveBeenCalled();
    expect(result.name).toBe('New');
  });

  it('removes related mongo records when deleting a non-base connection', async () => {
    mockFindOne
      .mockResolvedValueOnce({
        _id: 'c1',
        integrationId: 'int-1',
        name: 'Conn 1',
        username: '',
        password: 'enc',
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        _id: 'int-1',
        slug: 'allegro',
        name: 'Allegro',
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockDeleteMany.mockResolvedValue({ deletedCount: 1 });

    const repo = await getIntegrationRepository();
    await repo.deleteConnection('c1');

    expect(mockCollection).toHaveBeenCalledWith('product_listings');
    expect(mockCollection).toHaveBeenCalledWith('integration_connections');
    expect(mockDeleteMany).toHaveBeenCalledTimes(8);
    expect(mockDeleteMany).toHaveBeenLastCalledWith({
      _id: { $in: ['c1'] },
    });
  });

  it('reassigns dependent mongo records when deleting a base connection with a replacement', async () => {
    mockFindOne
      .mockResolvedValueOnce({
        _id: 'c1',
        integrationId: 'int-base',
        name: 'Base conn',
        username: '',
        password: 'enc',
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        _id: 'int-base',
        slug: 'baselinker',
        name: 'Base',
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockCountDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([{ _id: 'c2', integrationId: 'int-base' }]),
    });
    mockUpdateMany.mockResolvedValue({ modifiedCount: 1 });
    mockDeleteMany.mockResolvedValue({ deletedCount: 1 });

    const repo = await getIntegrationRepository();
    await repo.deleteConnection('c1');

    expect(mockUpdateMany).toHaveBeenCalled();
    expect(mockDeleteMany).toHaveBeenLastCalledWith({
      _id: { $in: ['c1'] },
    });
  });

  it('throws when deleting a base connection would orphan dependent records', async () => {
    mockFindOne
      .mockResolvedValueOnce({
        _id: 'c1',
        integrationId: 'int-base',
        name: 'Base conn',
        username: '',
        password: 'enc',
        createdAt: now,
        updatedAt: now,
      })
      .mockResolvedValueOnce({
        _id: 'int-base',
        slug: 'base',
        name: 'Base',
        createdAt: now,
        updatedAt: now,
      });
    mockCountDocuments
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    });

    const repo = await getIntegrationRepository();

    await expect(repo.deleteConnection('c1')).rejects.toThrow(
      'Deleting this Base.com connection would orphan listing and mapping status links'
    );
    expect(mockDeleteMany).not.toHaveBeenCalledWith({
      _id: { $in: ['c1'] },
    });
  });
});

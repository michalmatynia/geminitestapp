import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Integration, IntegrationConnection } from '@prisma/client';

import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import prisma from '@/shared/lib/db/prisma';
import {
  ConnectionCreateInputDto,
  ConnectionUpdateInputDto,
} from '@/shared/contracts/integrations';

// Mocks
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    integration: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    integrationConnection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productListing: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    categoryMapping: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    externalCategory: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    producerMapping: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    externalProducer: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    tagMapping: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    externalTag: {
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    setting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const {
  mockCollection,
  mockFind,
  mockFindOne,
  mockInsertOne,
  mockDeleteMany,
  mockFindOneAndUpdate,
} = vi.hoisted(() => {
  const mockInsertOne = vi.fn();
  const mockFindOne = vi.fn();
  const mockFind = vi.fn();
  const mockDeleteOne = vi.fn();
  const mockDeleteMany = vi.fn();
  const mockCountDocuments = vi.fn();
  const mockUpdateMany = vi.fn();
  const mockUpdateOne = vi.fn();
  const mockFindOneAndUpdate = vi.fn();

  const mockCollection = vi.fn(() => ({
    findOne: mockFindOne,
    find: mockFind,
    insertOne: mockInsertOne,
    deleteOne: mockDeleteOne,
    deleteMany: mockDeleteMany,
    countDocuments: mockCountDocuments,
    updateMany: mockUpdateMany,
    updateOne: mockUpdateOne,
    findOneAndUpdate: mockFindOneAndUpdate,
    sort: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
  }));
  return {
    mockCollection,
    mockInsertOne,
    mockFindOne,
    mockFind,
    mockDeleteOne,
    mockDeleteMany,
    mockCountDocuments,
    mockUpdateMany,
    mockUpdateOne,
    mockFindOneAndUpdate,
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: mockCollection,
  }),
  getMongoClient: vi.fn(),
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn(),
}));

describe('Integration Repository', () => {
  const now = new Date();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Prisma Provider', () => {
    beforeEach(() => {
      vi.mocked(getAppDbProvider).mockResolvedValue('prisma');
    });

    it('listIntegrations calls prisma.integration.findMany', async () => {
      const mockIntegrations = [
        { id: '1', name: 'Int 1', slug: 'int-1', createdAt: now, updatedAt: now },
      ];
      vi.mocked(prisma.integration.findMany).mockResolvedValue(
        mockIntegrations as unknown as Integration[]
      );

      const repo = await getIntegrationRepository();
      const result = await repo.listIntegrations();

      expect(prisma.integration.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result[0]!.name).toBe('Int 1');
    });

    it('createConnection calls prisma.integrationConnection.create', async () => {
      const mockConnection = { id: 'c1', name: 'Conn 1', createdAt: now, updatedAt: now };
      vi.mocked(prisma.integrationConnection.create).mockResolvedValue(
        mockConnection as unknown as IntegrationConnection
      );

      const repo = await getIntegrationRepository();
      const result = await repo.createConnection('int-1', {
        name: 'Conn 1',
        username: 'user',
        password: 'pass',
      } as ConnectionCreateInputDto);

      expect(prisma.integrationConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          integration: { connect: { id: 'int-1' } },
          name: 'Conn 1',
        }),
      });
      expect(result.id).toBe('c1');
    });

    it('upsertIntegration calls prisma.integration.upsert', async () => {
      const mockIntegration = {
        id: '1',
        name: 'Updated',
        slug: 'int-1',
        createdAt: now,
        updatedAt: now,
      };
      vi.mocked(prisma.integration.upsert).mockResolvedValue(
        mockIntegration as unknown as Integration
      );

      const repo = await getIntegrationRepository();
      const result = await repo.upsertIntegration({ name: 'Updated', slug: 'int-1' });

      expect(prisma.integration.upsert).toHaveBeenCalledWith({
        where: { slug: 'int-1' },
        update: { name: 'Updated' },
        create: { name: 'Updated', slug: 'int-1' },
      });
      expect(result.name).toBe('Updated');
    });

    it('deleteConnection removes dependent records for non-base integrations', async () => {
      vi.mocked(prisma.integrationConnection.findUnique).mockResolvedValue({
        id: 'c1',
        integrationId: 'int-1',
      } as unknown as IntegrationConnection);
      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        id: 'int-1',
        slug: 'allegro',
      } as unknown as Integration);
      vi.mocked(prisma.setting.findUnique).mockResolvedValue(null);
      const repo = await getIntegrationRepository();
      await repo.deleteConnection('c1');

      expect(prisma.productListing.deleteMany).toHaveBeenCalledWith({
        where: { connectionId: 'c1' },
      });
      expect(prisma.categoryMapping.deleteMany).toHaveBeenCalledWith({
        where: { connectionId: 'c1' },
      });
      expect(prisma.externalCategory.deleteMany).toHaveBeenCalledWith({
        where: { connectionId: 'c1' },
      });
      expect(prisma.integrationConnection.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
    });

    it('deleteConnection reassigns base dependencies when replacement exists', async () => {
      vi.mocked(prisma.integrationConnection.findUnique).mockResolvedValue({
        id: 'c1',
        integrationId: 'int-base',
      } as unknown as IntegrationConnection);
      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        id: 'int-base',
        slug: 'baselinker',
      } as unknown as Integration);
      vi.mocked(prisma.productListing.count).mockResolvedValue(1);
      vi.mocked(prisma.categoryMapping.count).mockResolvedValue(0);
      vi.mocked(prisma.externalCategory.count).mockResolvedValue(0);
      vi.mocked(prisma.producerMapping.count).mockResolvedValue(0);
      vi.mocked(prisma.externalProducer.count).mockResolvedValue(0);
      vi.mocked(prisma.tagMapping.count).mockResolvedValue(0);
      vi.mocked(prisma.externalTag.count).mockResolvedValue(0);
      vi.mocked(prisma.integrationConnection.findFirst).mockResolvedValue({
        id: 'c2',
      } as unknown as IntegrationConnection);
      vi.mocked(prisma.setting.findUnique).mockResolvedValue(null);

      const repo = await getIntegrationRepository();
      await repo.deleteConnection('c1');

      expect(prisma.productListing.updateMany).toHaveBeenCalledWith({
        where: { connectionId: 'c1' },
        data: { connectionId: 'c2' },
      });
      expect(prisma.integrationConnection.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
    });

    it('deleteConnection throws conflict for base connection without replacement', async () => {
      vi.mocked(prisma.integrationConnection.findUnique).mockResolvedValue({
        id: 'c1',
        integrationId: 'int-base',
      } as unknown as IntegrationConnection);
      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        id: 'int-base',
        slug: 'base',
      } as unknown as Integration);
      vi.mocked(prisma.productListing.count).mockResolvedValue(2);
      vi.mocked(prisma.categoryMapping.count).mockResolvedValue(0);
      vi.mocked(prisma.externalCategory.count).mockResolvedValue(0);
      vi.mocked(prisma.producerMapping.count).mockResolvedValue(0);
      vi.mocked(prisma.externalProducer.count).mockResolvedValue(0);
      vi.mocked(prisma.tagMapping.count).mockResolvedValue(0);
      vi.mocked(prisma.externalTag.count).mockResolvedValue(0);
      vi.mocked(prisma.integrationConnection.findFirst).mockResolvedValue(null);

      const repo = await getIntegrationRepository();
      await expect(repo.deleteConnection('c1')).rejects.toThrow(
        'Deleting this Base.com connection would orphan listing and mapping status links'
      );
      expect(prisma.integrationConnection.delete).not.toHaveBeenCalled();
    });
  });

  describe('MongoDB Provider', () => {
    beforeEach(() => {
      vi.mocked(getAppDbProvider).mockResolvedValue('mongodb');
    });

    it('listIntegrations calls mongo collection find', async () => {
      const mockDocs = [{ _id: '1', name: 'Int 1', slug: 'int-1', createdAt: now, updatedAt: now }];
      mockFind.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockDocs),
      });

      const repo = await getIntegrationRepository();
      const result = await repo.listIntegrations();

      expect(mockCollection).toHaveBeenCalledWith('integrations');
      expect(mockFind).toHaveBeenCalled();
      expect(result[0]!.id).toBe('1');
    });

    it('createConnection inserts into mongo collection', async () => {
      mockInsertOne.mockResolvedValue({ insertedId: 'c1' });

      const repo = await getIntegrationRepository();
      await repo.createConnection('int-1', {
        name: 'Conn 1',
        username: 'user',
        password: 'pass',
      } as ConnectionCreateInputDto);

      expect(mockCollection).toHaveBeenCalledWith('integration_connections');
      expect(mockInsertOne).toHaveBeenCalled();
    });

    it('listConnections tolerates legacy string timestamps', async () => {
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
      expect(result[0]!.id).toBe('c1');
      expect(result[0]!.createdAt).toBe(iso);
      expect(result[0]!.baseTokenUpdatedAt).toBe(iso);
    });

    it('getConnectionById matches both string and ObjectId candidates', async () => {
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
      const filter = mockFindOne.mock.calls[0]?.[0] as {
        _id?: { $in?: unknown[] };
      };
      expect(filter._id?.$in).toHaveLength(2);
      expect(String(filter._id?.$in?.[1])).toBe(legacyId);
    });

    it('updateConnection matches both string and ObjectId candidates', async () => {
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

      const filter = mockFindOneAndUpdate.mock.calls[0]?.[0] as {
        _id?: { $in?: unknown[] };
      };
      expect(filter._id?.$in).toHaveLength(2);
      expect(filter._id?.$in?.[0]).toBe(legacyId);
      expect(String(filter._id?.$in?.[1])).toBe(legacyId);
    });

    it('upsertIntegration updates existing in mongo', async () => {
      const existing = { _id: '1', slug: 'int-1', name: 'New', createdAt: now, updatedAt: now };
      mockFindOneAndUpdate.mockResolvedValue(existing);

      const repo = await getIntegrationRepository();
      const result = await repo.upsertIntegration({ name: 'New', slug: 'int-1' });

      expect(mockCollection).toHaveBeenCalledWith('integrations');
      expect(mockFindOneAndUpdate).toHaveBeenCalled();
      expect(result.name).toBe('New');
    });

    it('deleteConnection removes related data and connection in mongo', async () => {
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
  });
});

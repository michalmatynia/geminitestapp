import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import prisma from '@/shared/lib/db/prisma';

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
  },
}));

const { 
  mockCollection, 
  mockFind, 
  mockInsertOne, 
  mockDeleteOne, 
  mockFindOneAndUpdate 
} = vi.hoisted(() => {
  const mockInsertOne = vi.fn();
  const mockFindOne = vi.fn();
  const mockFind = vi.fn();
  const mockDeleteOne = vi.fn();
  const mockUpdateOne = vi.fn();
  const mockFindOneAndUpdate = vi.fn();
  
  const mockCollection = vi.fn(() => ({
    findOne: mockFindOne,
    find: mockFind,
    insertOne: mockInsertOne,
    deleteOne: mockDeleteOne,
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
    mockUpdateOne, 
    mockFindOneAndUpdate 
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
      const mockIntegrations = [{ id: '1', name: 'Int 1', slug: 'int-1', createdAt: now, updatedAt: now }];
      vi.mocked(prisma.integration.findMany).mockResolvedValue(mockIntegrations as any);

      const repo = await getIntegrationRepository();
      const result = await repo.listIntegrations();

      expect(prisma.integration.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result[0]!.name).toBe('Int 1');
    });

    it('createConnection calls prisma.integrationConnection.create', async () => {
      const mockConnection = { id: 'c1', name: 'Conn 1', createdAt: now, updatedAt: now };
      vi.mocked(prisma.integrationConnection.create).mockResolvedValue(mockConnection as any);

      const repo = await getIntegrationRepository();
      const result = await repo.createConnection('int-1', {
        name: 'Conn 1',
        username: 'user',
        password: 'pass',
      } as any);

      expect(prisma.integrationConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          integration: { connect: { id: 'int-1' } },
          name: 'Conn 1',
        }),
      });
      expect(result.id).toBe('c1');
    });

    it('upsertIntegration calls prisma.integration.upsert', async () => {
      const mockIntegration = { id: '1', name: 'Updated', slug: 'int-1', createdAt: now, updatedAt: now };
      vi.mocked(prisma.integration.upsert).mockResolvedValue(mockIntegration as any);

      const repo = await getIntegrationRepository();
      const result = await repo.upsertIntegration({ name: 'Updated', slug: 'int-1' });

      expect(prisma.integration.upsert).toHaveBeenCalledWith({
        where: { slug: 'int-1' },
        update: { name: 'Updated' },
        create: { name: 'Updated', slug: 'int-1' },
      });
      expect(result.name).toBe('Updated');
    });

    it('deleteConnection calls prisma.integrationConnection.delete', async () => {
      const repo = await getIntegrationRepository();
      await repo.deleteConnection('c1');

      expect(prisma.integrationConnection.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
    });
  });

  describe('MongoDB Provider', () => {
    beforeEach(() => {
      vi.mocked(getAppDbProvider).mockResolvedValue('mongodb');
    });

    it('listIntegrations calls mongo collection find', async () => {
      const mockDocs = [
        { _id: '1', name: 'Int 1', slug: 'int-1', createdAt: now, updatedAt: now },
      ];
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
      } as any);

      expect(mockCollection).toHaveBeenCalledWith('integration_connections');
      expect(mockInsertOne).toHaveBeenCalled();
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

    it('deleteConnection calls deleteOne in mongo', async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

      const repo = await getIntegrationRepository();
      await repo.deleteConnection('c1');

      expect(mockCollection).toHaveBeenCalledWith('integration_connections');
      expect(mockDeleteOne).toHaveBeenCalled();
    });
  });
});

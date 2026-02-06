import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getIntegrationDataProvider } from '@/features/integrations/services/integration-provider';
import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
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

const { mockCollection, mockFindOne, mockFind, mockInsertOne } = vi.hoisted(() => {
  const mockInsertOne = vi.fn();
  const mockFindOne = vi.fn();
  const mockFind = vi.fn();
  const mockCollection = vi.fn(() => ({
    findOne: mockFindOne,
    find: mockFind,
    insertOne: mockInsertOne,
    sort: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
  }));
  return { mockCollection, mockInsertOne, mockFindOne, mockFind };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: mockCollection,
  }),
}));

vi.mock('@/features/integrations/services/integration-provider', () => ({
  getIntegrationDataProvider: vi.fn(),
}));

describe('Integration Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Prisma Provider', () => {
    beforeEach(() => {
      vi.mocked(getIntegrationDataProvider).mockResolvedValue('prisma');
    });

    it('listIntegrations calls prisma.integration.findMany', async () => {
      const mockIntegrations = [{ id: '1', name: 'Int 1', slug: 'int-1' }];
      vi.mocked(prisma.integration.findMany).mockResolvedValue(mockIntegrations as any);

      const repo = await getIntegrationRepository();
      const result = await repo.listIntegrations();

      expect(prisma.integration.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockIntegrations);
    });

    it('createConnection calls prisma.integrationConnection.create', async () => {
      const mockConnection = { id: 'c1', name: 'Conn 1' };
      vi.mocked(prisma.integrationConnection.create).mockResolvedValue(mockConnection as any);

      const repo = await getIntegrationRepository();
      const result = await repo.createConnection('int-1', {
        name: 'Conn 1',
        username: 'user',
        password: 'pass',
      } as any);

      expect(prisma.integrationConnection.create).toHaveBeenCalledWith({
        data: {
          integrationId: 'int-1',
          name: 'Conn 1',
          username: 'user',
          password: 'pass',
        },
      });
      expect(result).toEqual(mockConnection);
    });

    it('upsertIntegration calls prisma.integration.upsert', async () => {
      const mockIntegration = { id: '1', name: 'Updated', slug: 'int-1' };
      vi.mocked(prisma.integration.upsert).mockResolvedValue(mockIntegration as any);

      const repo = await getIntegrationRepository();
      const result = await repo.upsertIntegration({ name: 'Updated', slug: 'int-1' });

      expect(prisma.integration.upsert).toHaveBeenCalledWith({
        where: { slug: 'int-1' },
        update: { name: 'Updated' },
        create: { name: 'Updated', slug: 'int-1' },
      });
      expect(result).toEqual(mockIntegration);
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
      vi.mocked(getIntegrationDataProvider).mockResolvedValue('mongodb');
    });

    it('listIntegrations calls mongo collection find', async () => {
      const mockDocs = [
        { _id: '1', name: 'Int 1', slug: 'int-1', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockFind.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockDocs),
      });

      const repo = await getIntegrationRepository();
      const result = await repo.listIntegrations();

      expect(mockCollection).toHaveBeenCalledWith('integrations');
      expect(mockFind).toHaveBeenCalledWith({});
      expect(result[0]!.id).toBe('1');
      expect(result[0]!.name).toBe('Int 1');
    });

    it('createConnection inserts into mongo collection', async () => {
      mockFindOne.mockResolvedValue(null); // No existing connection
      mockInsertOne.mockResolvedValue({ insertedId: 'c1' });

      const repo = await getIntegrationRepository();
      const result = await repo.createConnection('int-1', {
        name: 'Conn 1',
        username: 'user',
        password: 'pass',
      } as any);

      expect(mockCollection).toHaveBeenCalledWith('integration_connections');
      expect(mockInsertOne).toHaveBeenCalled();
      expect(result.name).toBe('Conn 1');
      expect(result.username).toBe('user');
      expect(result.password).toBe('pass');
    });

    it('upsertIntegration updates existing in mongo', async () => {
      const existing = { _id: '1', slug: 'int-1', name: 'Old', createdAt: new Date() };
      mockFindOne.mockResolvedValue(existing);
      const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
      mockCollection.mockReturnValue({
        findOne: mockFindOne,
        updateOne: mockUpdateOne,
      } as any);

      const repo = await getIntegrationRepository();
      const result = await repo.upsertIntegration({ name: 'New', slug: 'int-1' });

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: '1' },
        { $set: expect.objectContaining({ name: 'New' }) }
      );
      expect(result.name).toBe('New');
    });

    it('deleteConnection calls deleteOne in mongo', async () => {
      const mockDeleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
      mockCollection.mockReturnValue({
        deleteOne: mockDeleteOne,
      } as any);

      const repo = await getIntegrationRepository();
      await repo.deleteConnection('c1');

      expect(mockCollection).toHaveBeenCalledWith('integration_connections');
      expect(mockDeleteOne).toHaveBeenCalledWith({ _id: 'c1' });
    });
  });
});

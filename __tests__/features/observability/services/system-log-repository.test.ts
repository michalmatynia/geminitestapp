import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Db } from 'mongodb';

import {
  createSystemLog,
  listSystemLogs,
  getSystemLogMetrics,
  clearSystemLogs,
} from '@/shared/lib/observability/system-log-repository';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    systemLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn(),
}));

describe('system-log-repository', () => {
  const mockMongoCollection = {
    insertOne: vi.fn(),
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
    countDocuments: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn().mockReturnThis(),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };

  const mockMongoDb = {
    collection: vi.fn().mockReturnValue(mockMongoCollection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoDb).mockResolvedValue(mockMongoDb as unknown as Db);
  });

  describe('createSystemLog', () => {
    it('should create a log using Prisma when provider is prisma', async () => {
      vi.mocked(getAppDbProvider).mockResolvedValue('prisma');
      vi.mocked(prisma.systemLog.create).mockResolvedValue({
        id: '1',
        level: 'info',
        message: 'test',
        createdAt: new Date(),
      } as any);

      await createSystemLog({ message: 'test', level: 'info' });

      expect(prisma.systemLog.create).toHaveBeenCalled();
    });

    it('should create a log using MongoDB when provider is mongodb', async () => {
      vi.mocked(getAppDbProvider).mockResolvedValue('mongodb');

      await createSystemLog({ message: 'test', level: 'info' });

      expect(mockMongoCollection.insertOne).toHaveBeenCalled();
    });
  });

  describe('listSystemLogs', () => {
    it('should list logs using Prisma when provider is prisma', async () => {
      vi.mocked(getAppDbProvider).mockResolvedValue('prisma');
      vi.mocked(prisma.systemLog.count).mockResolvedValue(10);
      vi.mocked(prisma.systemLog.findMany).mockResolvedValue([]);

      const result = await listSystemLogs({});

      expect(prisma.systemLog.findMany).toHaveBeenCalled();
      expect(result.total).toBe(10);
    });

    it('should list logs using MongoDB when provider is mongodb', async () => {
      vi.mocked(getAppDbProvider).mockResolvedValue('mongodb');
      mockMongoCollection.countDocuments.mockResolvedValue(5);
      mockMongoCollection.toArray.mockResolvedValue([]);

      const result = await listSystemLogs({});

      expect(mockMongoCollection.find).toHaveBeenCalled();
      expect(result.total).toBe(5);
    });
  });

  describe('getSystemLogMetrics', () => {
    it('should get metrics using Prisma', async () => {
      vi.mocked(getAppDbProvider).mockResolvedValue('prisma');
      vi.mocked(prisma.systemLog.count).mockResolvedValue(100);
      vi.mocked(prisma.systemLog.groupBy).mockResolvedValue([]);

      const result = await getSystemLogMetrics({});

      expect(result.total).toBe(100);
      expect(prisma.systemLog.groupBy).toHaveBeenCalled();
    });
  });

  describe('clearSystemLogs', () => {
    it('should clear logs using Prisma', async () => {
      vi.mocked(getAppDbProvider).mockResolvedValue('prisma');
      vi.mocked(prisma.systemLog.deleteMany).mockResolvedValue({ count: 50 });

      const result = await clearSystemLogs();

      expect(prisma.systemLog.deleteMany).toHaveBeenCalled();
      expect(result.deleted).toBe(50);
    });
  });
});

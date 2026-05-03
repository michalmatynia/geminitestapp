import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from 'mongodb';

import {
  OBSERVABILITY_ACTIVITY_LOG_RETENTION_SECONDS,
  OBSERVABILITY_ACTIVITY_LOG_TTL_INDEX_NAME,
} from '@/shared/lib/observability/observability-retention';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

describe('mongo-activity-repository', () => {
  const collectionMock = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    insertOne: vi.fn().mockResolvedValue({ insertedId: { toString: () => '507f1f77bcf86cd799439011' } }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 3 }),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };

  const dbMock = {
    collection: vi.fn().mockReturnValue(collectionMock),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getMongoDbMock.mockResolvedValue(dbMock as unknown as Db);
  });

  it('ensures activity indexes including TTL before listing activity', async () => {
    const { mongoActivityRepository } = await import('./mongo-activity-repository');

    await mongoActivityRepository.listActivity({});

    expect(collectionMock.createIndex).toHaveBeenCalledWith(
      { createdAt: 1 },
      {
        name: OBSERVABILITY_ACTIVITY_LOG_TTL_INDEX_NAME,
        expireAfterSeconds: OBSERVABILITY_ACTIVITY_LOG_RETENTION_SECONDS,
      }
    );
    expect(collectionMock.find).toHaveBeenCalledWith({});
    expect(collectionMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('clears activity logs after ensuring indexes', async () => {
    const { clearActivityLogs } = await import('./mongo-activity-repository');

    const result = await clearActivityLogs({
      before: new Date('2026-04-01T00:00:00.000Z'),
    });

    expect(collectionMock.deleteMany).toHaveBeenCalledWith({
      createdAt: { $lte: new Date('2026-04-01T00:00:00.000Z') },
    });
    expect(result).toEqual({ deleted: 3 });
  });
});

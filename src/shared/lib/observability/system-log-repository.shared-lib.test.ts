import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Db } from 'mongodb';

import {
  createSystemLog,
  listSystemLogs,
  getSystemLogMetrics,
  clearSystemLogs,
} from '@/shared/lib/observability/system-log-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

describe('system-log-repository', () => {
  const mockMongoCollection = {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
    countDocuments: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn(),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };

  const mockMongoDb = {
    collection: vi.fn().mockReturnValue(mockMongoCollection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoDb).mockResolvedValue(mockMongoDb as unknown as Db);
  });

  it('creates a system log in MongoDB', async () => {
    await createSystemLog({ message: 'test', level: 'info' });

    expect(mockMongoCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'test',
      })
    );
  });

  it('lists logs using Mongo filters and pagination', async () => {
    mockMongoCollection.countDocuments.mockResolvedValue(5);
    mockMongoCollection.toArray.mockResolvedValue([]);

    const result = await listSystemLogs({
      page: 2,
      pageSize: 10,
      requestId: 'req-1',
      statusCode: 500,
      method: 'GET',
      userId: 'user-1',
      fingerprint: 'fp-123',
      category: 'DATABASE',
    });

    expect(result.total).toBe(5);
    expect(mockMongoCollection.find).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        requestId: { $regex: 'req-1', $options: 'i' },
        userId: { $regex: 'user-1', $options: 'i' },
        method: { $regex: '^GET$', $options: 'i' },
        'context.fingerprint': 'fp-123',
        $and: expect.arrayContaining([
          {
            $or: [
              { category: { $regex: '^DATABASE$', $options: 'i' } },
              { 'context.category': 'DATABASE' },
            ],
          },
        ]),
      })
    );
    expect(mockMongoCollection.skip).toHaveBeenCalledWith(10);
    expect(mockMongoCollection.limit).toHaveBeenCalledWith(10);
  });

  it('computes metrics from Mongo aggregates', async () => {
    mockMongoCollection.countDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3);
    mockMongoCollection.aggregate.mockImplementation((pipeline: Array<Record<string, unknown>>) => {
      const groupKey = (pipeline[1]?.['$group'] as { _id?: string } | undefined)?._id;
      if (groupKey === '$level') {
        return {
          toArray: vi.fn().mockResolvedValue([
            { _id: 'info', count: 7 },
            { _id: 'error', count: 3 },
          ]),
        };
      }
      if (groupKey === '$source') {
        return { toArray: vi.fn().mockResolvedValue([{ _id: 'web', count: 10 }]) };
      }
      if (groupKey === '$service') {
        return { toArray: vi.fn().mockResolvedValue([{ _id: 'api', count: 8 }]) };
      }
      if (groupKey === '$path') {
        return { toArray: vi.fn().mockResolvedValue([{ _id: '/api/test', count: 5 }]) };
      }
      return { toArray: vi.fn().mockResolvedValue([]) };
    });

    const result = await getSystemLogMetrics({});

    expect(result.total).toBe(10);
    expect(result.levels.info).toBe(7);
    expect(result.levels.error).toBe(3);
    expect(result.topSources[0]).toEqual({ source: 'web', count: 10 });
    expect(result.topServices[0]).toEqual({ service: 'api', count: 8 });
    expect(result.topPaths[0]).toEqual({ path: '/api/test', count: 5 });
  });

  it('clears logs in MongoDB', async () => {
    mockMongoCollection.deleteMany.mockResolvedValue({ deletedCount: 50 });

    const result = await clearSystemLogs();

    expect(mockMongoCollection.deleteMany).toHaveBeenCalledWith({});
    expect(result.deleted).toBe(50);
  });
});

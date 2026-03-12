import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mongoActivityRepository } from '@/shared/lib/observability/activity-repository/mongo-activity-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

describe('mongoActivityRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list activity logs', async () => {
    const mockLogs = [
      {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        type: 'test',
        description: 'desc',
        userId: 'u1',
        entityId: 'e1',
        entityType: 'type',
        metadata: {},
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-01T10:05:00.000Z'),
      },
    ];
    const toArray = vi.fn().mockResolvedValue(mockLogs);
    const skip = vi.fn().mockReturnValue({ toArray });
    const limit = vi.fn().mockReturnValue({ skip });
    const sort = vi.fn().mockReturnValue({ limit });
    const find = vi.fn().mockReturnValue({ sort });
    const collection = vi.fn().mockReturnValue({ find });
    vi.mocked(getMongoDb).mockResolvedValue({
      collection,
    } as Awaited<ReturnType<typeof getMongoDb>>);

    const result = await mongoActivityRepository.listActivity({ limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('507f1f77bcf86cd799439011');
    expect(find).toHaveBeenCalledWith({});
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limit).toHaveBeenCalledWith(10);
    expect(skip).toHaveBeenCalledWith(0);
  });

  it('should create an activity log', async () => {
    const insertedId = new ObjectId('507f1f77bcf86cd799439012');
    const insertOne = vi.fn().mockResolvedValue({ insertedId });
    const collection = vi.fn().mockReturnValue({ insertOne });
    vi.mocked(getMongoDb).mockResolvedValue({
      collection,
    } as Awaited<ReturnType<typeof getMongoDb>>);

    const result = await mongoActivityRepository.createActivity({
      type: 'test',
      description: 'desc',
      userId: 'u1',
      entityId: 'e1',
      entityType: 'type',
      metadata: { foo: 'bar' },
    });

    expect(result.id).toBe('507f1f77bcf86cd799439012');
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'test',
        description: 'desc',
        userId: 'u1',
        entityId: 'e1',
        entityType: 'type',
        metadata: { foo: 'bar' },
      })
    );
  });
});

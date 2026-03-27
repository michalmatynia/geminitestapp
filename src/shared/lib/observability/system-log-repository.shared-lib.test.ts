import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId, type Db } from 'mongodb';

import {
  createSystemLog,
  listSystemLogs,
  getSystemLogMetrics,
  getSystemLogById,
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
    const createdAt = new Date('2026-03-27T15:00:00.000Z');
    const result = await createSystemLog({
      message: 'test',
      level: 'info',
      category: '  API  ',
      service: '   ',
      traceId: '   ',
      correlationId: '   ',
      spanId: '   ',
      parentSpanId: '   ',
      context: {
        category: 'context-category',
        service: 'worker-service',
        traceId: 'trace-from-context',
        correlationId: 'corr-from-context',
        spanId: 'span-from-context',
        parentSpanId: 'parent-span-from-context',
      },
      createdAt,
    });

    expect(mockMongoCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'test',
        category: 'API',
        service: 'worker-service',
        traceId: 'trace-from-context',
        correlationId: 'corr-from-context',
        spanId: 'span-from-context',
        parentSpanId: 'parent-span-from-context',
        createdAt,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        level: 'info',
        category: 'API',
        service: 'worker-service',
        traceId: 'trace-from-context',
        correlationId: 'corr-from-context',
        spanId: 'span-from-context',
        parentSpanId: 'parent-span-from-context',
        createdAt: '2026-03-27T15:00:00.000Z',
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

  it('clamps pagination and builds duration, service, tracing, query, and date filters', async () => {
    mockMongoCollection.countDocuments.mockResolvedValue(1);
    mockMongoCollection.toArray.mockResolvedValue([
      {
        _id: 'log_1',
        level: 'warn',
        message: 'Slow request',
        category: '',
        service: '',
        traceId: '',
        correlationId: '',
        spanId: '',
        parentSpanId: '',
        context: {
          category: 'HTTP',
          service: 'gateway',
          traceId: 'trace_ctx',
          correlationId: 'corr_ctx',
          spanId: 'span_ctx',
          parentSpanId: 'parent_span_ctx',
        },
        createdAt: 'not-a-date',
      },
    ]);

    const result = await listSystemLogs({
      page: 0,
      pageSize: 999,
      source: 'web-app',
      service: 'gateway',
      minDurationMs: 150,
      traceId: 'trace-123',
      correlationId: 'corr-123',
      query: 'timeout',
      from: new Date('2026-03-20T00:00:00.000Z'),
      to: new Date('2026-03-21T00:00:00.000Z'),
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(200);
    expect(result.logs[0]).toEqual(
      expect.objectContaining({
        category: 'HTTP',
        service: 'gateway',
        traceId: 'trace_ctx',
        correlationId: 'corr_ctx',
        spanId: 'span_ctx',
        parentSpanId: 'parent_span_ctx',
      })
    );
    expect(Date.parse(result.logs[0]!.createdAt)).not.toBeNaN();

    expect(mockMongoCollection.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        source: { $regex: 'web-app', $options: 'i' },
        createdAt: {
          $gte: new Date('2026-03-20T00:00:00.000Z'),
          $lte: new Date('2026-03-21T00:00:00.000Z'),
        },
        $and: expect.arrayContaining([
          {
            $or: [
              { service: { $regex: 'gateway', $options: 'i' } },
              { 'context.service': { $regex: 'gateway', $options: 'i' } },
            ],
          },
          {
            $expr: {
              $gte: [
                {
                  $convert: {
                    input: '$context.durationMs',
                    to: 'double',
                    onError: -1,
                    onNull: -1,
                  },
                },
                150,
              ],
            },
          },
          {
            $or: [
              { traceId: { $regex: 'trace-123', $options: 'i' } },
              { 'context.traceId': { $regex: 'trace-123', $options: 'i' } },
            ],
          },
          {
            $or: [
              { correlationId: { $regex: 'corr-123', $options: 'i' } },
              { 'context.correlationId': { $regex: 'corr-123', $options: 'i' } },
            ],
          },
          {
            $or: [
              { message: { $regex: 'timeout', $options: 'i' } },
              { source: { $regex: 'timeout', $options: 'i' } },
              { service: { $regex: 'timeout', $options: 'i' } },
              { path: { $regex: 'timeout', $options: 'i' } },
              { requestId: { $regex: 'timeout', $options: 'i' } },
              { traceId: { $regex: 'timeout', $options: 'i' } },
              { correlationId: { $regex: 'timeout', $options: 'i' } },
              { userId: { $regex: 'timeout', $options: 'i' } },
            ],
          },
        ]),
      })
    );
    expect(mockMongoCollection.skip).toHaveBeenLastCalledWith(0);
    expect(mockMongoCollection.limit).toHaveBeenLastCalledWith(200);
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

  it('loads logs by id and falls back to context metadata fields', async () => {
    const objectId = new ObjectId('507f1f77bcf86cd799439011');
    mockMongoCollection.findOne.mockResolvedValueOnce({
      _id: objectId,
      level: 'error',
      message: 'Lookup log',
      category: '',
      service: '',
      traceId: '',
      correlationId: '',
      spanId: '',
      parentSpanId: '',
      context: {
        category: 'LOOKUP',
        service: 'lookup-service',
        traceId: 'trace_ctx',
        correlationId: 'corr_ctx',
        spanId: 'span_ctx',
        parentSpanId: 'parent_span_ctx',
      },
      createdAt: new Date('2026-03-27T12:00:00.000Z'),
    });

    await expect(getSystemLogById('507f1f77bcf86cd799439011')).resolves.toEqual(
      expect.objectContaining({
        id: '507f1f77bcf86cd799439011',
        category: 'LOOKUP',
        service: 'lookup-service',
        traceId: 'trace_ctx',
        correlationId: 'corr_ctx',
        spanId: 'span_ctx',
        parentSpanId: 'parent_span_ctx',
      })
    );
    expect(mockMongoCollection.findOne).toHaveBeenCalledWith({
      $or: [{ _id: objectId }, { id: '507f1f77bcf86cd799439011' }],
    });

    mockMongoCollection.findOne.mockResolvedValueOnce(null);
    await expect(getSystemLogById('missing-log')).resolves.toBeNull();
  });

  it('clears logs in MongoDB with optional before and level filters', async () => {
    mockMongoCollection.deleteMany.mockResolvedValue({ deletedCount: 50 });

    const result = await clearSystemLogs({
      before: new Date('2026-03-01T00:00:00.000Z'),
      level: 'warn',
    });

    expect(mockMongoCollection.deleteMany).toHaveBeenCalledWith({
      createdAt: { $lte: new Date('2026-03-01T00:00:00.000Z') },
      level: 'warn',
    });
    expect(result.deleted).toBe(50);
  });
});

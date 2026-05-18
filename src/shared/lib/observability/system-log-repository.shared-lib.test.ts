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
import { getMongoDb as getStudiqMongoDb } from '@/shared/lib/db/studiq-mongo-client';
import { getMongoDb as getCmsBuilderMongoDb } from '@/shared/lib/db/cms-builder-mongo-client';
import { getMongoDb as getEcommerceMongoDb } from '@/shared/lib/db/ecommerce-mongo-client';
import { getMongoDb as getArchMongoDb } from '@/shared/lib/db/arch-mongo-client';
import { readMongoSyncLock } from '@/shared/lib/db/mongo-sync-lock';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/studiq-mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/cms-builder-mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/ecommerce-mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/arch-mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-sync-lock', () => ({
  readMongoSyncLock: vi.fn(),
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
    updateOne: vi.fn(),
  };

  const mockMongoDb = {
    databaseName: 'app',
    collection: vi.fn().mockReturnValue(mockMongoCollection),
  };
  const mockStudiqCollection = {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn(),
    aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
    updateOne: vi.fn(),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };
  const mockStudiqMongoDb = {
    databaseName: 'studiq_local',
    collection: vi.fn().mockReturnValue(mockStudiqCollection),
  };
  const mockCmsBuilderCollection = {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn(),
    aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
    updateOne: vi.fn(),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };
  const mockCmsBuilderMongoDb = {
    databaseName: 'cms_builder_local',
    collection: vi.fn().mockReturnValue(mockCmsBuilderCollection),
  };
  const mockEcommerceCollection = {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn(),
    aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
    updateOne: vi.fn(),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };
  const mockEcommerceMongoDb = {
    databaseName: 'ecom_local',
    collection: vi.fn().mockReturnValue(mockEcommerceCollection),
  };
  const mockArchCollection = {
    insertOne: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn(),
    aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
    updateOne: vi.fn(),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };
  const mockArchMongoDb = {
    databaseName: 'arch_web_local',
    collection: vi.fn().mockReturnValue(mockArchCollection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoDb).mockResolvedValue(mockMongoDb as unknown as Db);
    vi.mocked(getStudiqMongoDb).mockResolvedValue(mockStudiqMongoDb as unknown as Db);
    vi.mocked(getCmsBuilderMongoDb).mockResolvedValue(mockCmsBuilderMongoDb as unknown as Db);
    vi.mocked(getEcommerceMongoDb).mockResolvedValue(mockEcommerceMongoDb as unknown as Db);
    vi.mocked(getArchMongoDb).mockResolvedValue(mockArchMongoDb as unknown as Db);
    vi.mocked(readMongoSyncLock).mockResolvedValue(null);
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
        applicationId: 'geminitestapp',
        applicationName: 'GeminiTestApp',
        originCollection: 'system_logs',
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
        applicationId: 'geminitestapp',
        applicationName: 'GeminiTestApp',
        createdAt: '2026-03-27T15:00:00.000Z',
      })
    );
  });

  it('routes Kangur and StudiQ system log writes to the dedicated StudiQ database', async () => {
    await createSystemLog({
      message: 'Kangur lessons route completed',
      level: 'info',
      source: 'api.kangur.lessons.GET',
      path: '/api/kangur/lessons',
      context: {
        route: '/admin/kangur/content-manager',
      },
      createdAt: new Date('2026-05-17T23:25:00.000Z'),
    });

    expect(mockStudiqMongoDb.collection).toHaveBeenCalledWith('system_logs');
    expect(mockStudiqCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'Kangur lessons route completed',
        source: 'api.kangur.lessons.GET',
        path: '/api/kangur/lessons',
        applicationId: 'studiq',
        applicationName: 'StudiQ',
        originDatabase: 'studiq_local',
      })
    );
    expect(mockMongoCollection.insertOne).not.toHaveBeenCalled();
    expect(mockMongoCollection.updateOne).not.toHaveBeenCalled();
  });

  it('routes CMS Builder system logs to the CMS Builder local database', async () => {
    await createSystemLog({
      message: 'CMS Builder page saved',
      level: 'info',
      source: 'cms.pages.[id].PUT',
      service: 'cms',
      path: '/api/cms/pages/page-1',
      createdAt: new Date('2026-05-18T09:45:00.000Z'),
    });

    expect(mockCmsBuilderMongoDb.collection).toHaveBeenCalledWith('system_logs');
    expect(mockCmsBuilderCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'CMS Builder page saved',
        applicationId: 'cms-builder',
        applicationName: 'CMS Builder',
        originDatabase: 'cms_builder_local',
      })
    );
    expect(mockMongoCollection.insertOne).not.toHaveBeenCalled();
  });

  it('routes Stargater error logs to ecommerce local logs without mirroring centrally', async () => {
    await createSystemLog({
      message: 'Stargater checkout failed',
      level: 'error',
      source: 'stargater.checkout.POST',
      service: 'stargater',
      context: {
        applicationId: 'stargater',
      },
      createdAt: new Date('2026-05-18T09:00:00.000Z'),
    });

    expect(mockEcommerceMongoDb.collection).toHaveBeenCalledWith('system_logs');
    expect(mockEcommerceMongoDb.collection).toHaveBeenCalledWith('error_logs');
    expect(mockEcommerceCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        message: 'Stargater checkout failed',
        applicationId: 'stargater',
        applicationName: 'Stargater',
        originDatabase: 'ecom_local',
      })
    );
    expect(mockEcommerceCollection.updateOne).toHaveBeenCalledWith(
      { applicationId: 'stargater', originLogId: expect.any(String) },
      { $setOnInsert: expect.objectContaining({ applicationId: 'stargater' }) },
      { upsert: true }
    );
    expect(mockMongoCollection.updateOne).not.toHaveBeenCalled();
  });

  it('routes Milkbar Designers logs to the Arch local database', async () => {
    await createSystemLog({
      message: '[milkbar-cms] local runtime saved',
      level: 'info',
      source: 'milkbar-cms',
      service: 'milkbar-cms',
      path: '/api/v2/page-manager/milkbardesigners',
      createdAt: new Date('2026-05-18T09:30:00.000Z'),
    });

    expect(mockArchMongoDb.collection).toHaveBeenCalledWith('system_logs');
    expect(mockArchCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: '[milkbar-cms] local runtime saved',
        applicationId: 'arch',
        applicationName: 'Milkbar Designers',
        originDatabase: 'arch_web_local',
      })
    );
    expect(mockMongoCollection.insertOne).not.toHaveBeenCalled();
  });

  it('skips MongoDB persistence while a Mongo source sync lock is active', async () => {
    vi.mocked(readMongoSyncLock).mockResolvedValue({
      direction: 'local_to_cloud',
      application: 'all',
      source: 'local',
      target: 'cloud',
      acquiredAt: '2026-04-18T00:00:00.000Z',
      pid: 123,
    });

    const result = await createSystemLog({
      message: 'sync in progress',
      level: 'warn',
      createdAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    expect(mockMongoCollection.insertOne).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        level: 'warn',
        message: 'sync in progress',
        createdAt: '2026-04-18T00:00:00.000Z',
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
    expect(mockMongoCollection.skip).not.toHaveBeenCalled();
    expect(mockMongoCollection.limit).toHaveBeenCalledWith(20);
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
              { applicationId: { $regex: 'timeout', $options: 'i' } },
              { applicationName: { $regex: 'timeout', $options: 'i' } },
              { sourceService: { $regex: 'timeout', $options: 'i' } },
            ],
          },
        ]),
      })
    );
    expect(mockMongoCollection.skip).not.toHaveBeenCalled();
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
      $or: [
        { _id: objectId },
        { id: '507f1f77bcf86cd799439011' },
        { originLogId: '507f1f77bcf86cd799439011' },
      ],
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

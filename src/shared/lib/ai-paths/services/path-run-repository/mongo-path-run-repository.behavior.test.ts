/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type CursorMock<T> = {
  sort: ReturnType<typeof vi.fn>;
  allowDiskUse: ReturnType<typeof vi.fn>;
  skip: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  toArray: ReturnType<typeof vi.fn>;
  next: ReturnType<typeof vi.fn>;
};

const createCursor = <T>(items: T[] = []): CursorMock<T> => {
  const cursor: CursorMock<T> = {
    sort: vi.fn(),
    allowDiskUse: vi.fn(),
    skip: vi.fn(),
    limit: vi.fn(),
    toArray: vi.fn().mockResolvedValue(items),
    next: vi.fn().mockResolvedValue(items[0] ?? null),
  };
  cursor.sort.mockReturnValue(cursor);
  cursor.allowDiskUse.mockReturnValue(cursor);
  cursor.skip.mockReturnValue(cursor);
  cursor.limit.mockReturnValue(cursor);
  return cursor;
};

const createDbMocks = () => {
  const runCursor = createCursor();
  const nodeCursor = createCursor();
  const eventCursor = createCursor();

  const runCollection = {
    createIndex: vi.fn().mockResolvedValue('idx'),
    insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    findOneAndUpdate: vi.fn(),
    findOne: vi.fn(),
    findOneAndDelete: vi.fn(),
    find: vi.fn(() => runCursor),
    countDocuments: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    bulkWrite: vi.fn().mockResolvedValue({}),
  };

  const nodeCollection = {
    createIndex: vi.fn().mockResolvedValue('idx'),
    distinct: vi.fn().mockResolvedValue([]),
    insertMany: vi.fn().mockResolvedValue({ acknowledged: true }),
    findOneAndUpdate: vi.fn(),
    find: vi.fn(() => nodeCursor),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
  };

  const eventCollection = {
    createIndex: vi.fn().mockResolvedValue('idx'),
    insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    find: vi.fn(() => eventCursor),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
  };

  const collections = new Map<string, unknown>([
    ['ai_path_runs', runCollection],
    ['ai_path_run_nodes', nodeCollection],
    ['ai_path_run_events', eventCollection],
  ]);

  const db = {
    collection: vi.fn((name: string) => {
      const collection = collections.get(name);
      if (!collection) {
        throw new Error(`Unknown collection: ${name}`);
      }
      return collection;
    }),
  };

  return {
    db,
    runCollection,
    nodeCollection,
    eventCollection,
    runCursor,
    nodeCursor,
    eventCursor,
  };
};

const loadModule = async (
  db: ReturnType<typeof createDbMocks>['db'],
  uuidValues: string[] = ['uuid-run', 'uuid-node', 'uuid-event']
) => {
  vi.resetModules();
  vi.doMock('server-only', () => ({}));
  vi.doMock('crypto', () => ({
    randomUUID: vi.fn(() => uuidValues.shift() ?? 'uuid-fallback'),
  }));
  vi.doMock('@/shared/lib/db/mongo-client', () => ({
    getMongoDb: vi.fn().mockResolvedValue(db),
  }));
  return await import('./mongo-path-run-repository');
};

describe('mongo-path-run-repository behavior', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('creates runs with normalized defaults and ISO-mapped output', async () => {
    const mocks = createDbMocks();
    const { mongoPathRunRepository } = await loadModule(mocks.db, ['run-created']);

    const result = await mongoPathRunRepository.createRun({
      pathId: 'path_1',
      pathName: 'Starter path',
      triggerEvent: 'manual',
      meta: { requestId: 'req_1' },
      entityId: 'product_1',
      entityType: 'product',
    } as any);

    expect(mocks.runCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'run-created',
        id: 'run-created',
        pathId: 'path_1',
        pathName: 'Starter path',
        status: 'queued',
        triggerEvent: 'manual',
        maxAttempts: 3,
        retryCount: 0,
        nextRetryAt: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'run-created',
        pathId: 'path_1',
        status: 'queued',
        meta: { requestId: 'req_1' },
        entityId: 'product_1',
        entityType: 'product',
      })
    );
    expect(result.createdAt).toMatch(/T/);
  });

  it('updates runs with string dates converted to Date instances and throws when missing', async () => {
    const mocks = createDbMocks();
    const { mongoPathRunRepository } = await loadModule(mocks.db);
    mocks.runCollection.findOneAndUpdate.mockResolvedValueOnce({
      _id: 'run_1',
      id: 'run_1',
      pathId: 'path_1',
      status: 'failed',
      nextRetryAt: '2026-03-27T08:00:00.000Z',
      createdAt: '2026-03-27T07:00:00.000Z',
      updatedAt: '2026-03-27T07:10:00.000Z',
      finishedAt: '2026-03-27T07:10:00.000Z',
    });

    const updated = await mongoPathRunRepository.updateRun('run_1', {
      status: 'failed',
      nextRetryAt: '2026-03-27T08:00:00.000Z',
      finishedAt: '2026-03-27T07:10:00.000Z',
    } as any);

    expect(mocks.runCollection.findOneAndUpdate).toHaveBeenCalledWith(
      { $or: [{ _id: 'run_1' }, { id: 'run_1' }] },
      {
        $set: expect.objectContaining({
          status: 'failed',
          nextRetryAt: expect.any(Date),
          finishedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      },
      { returnDocument: 'after' }
    );
    expect(updated).toEqual(
      expect.objectContaining({
        id: 'run_1',
        status: 'failed',
        nextRetryAt: '2026-03-27T08:00:00.000Z',
      })
    );

    mocks.runCollection.findOneAndUpdate.mockResolvedValueOnce(null);
    await expect(
      mongoPathRunRepository.updateRun('missing', { status: 'failed' } as any)
    ).rejects.toThrow('Run not found');
  });

  it('returns null when conditional status updates cannot run and claims queued runs for processing', async () => {
    const mocks = createDbMocks();
    const { mongoPathRunRepository } = await loadModule(mocks.db);

    await expect(
      mongoPathRunRepository.updateRunIfStatus('run_1', [], { status: 'running' } as any)
    ).resolves.toBeNull();
    expect(mocks.runCollection.findOneAndUpdate).not.toHaveBeenCalled();

    mocks.runCollection.findOneAndUpdate.mockResolvedValueOnce({
      _id: 'run_1',
      id: 'run_1',
      pathId: 'path_1',
      status: 'running',
      createdAt: '2026-03-27T07:00:00.000Z',
      updatedAt: '2026-03-27T07:05:00.000Z',
      startedAt: '2026-03-27T07:05:00.000Z',
    });

    const claimed = await mongoPathRunRepository.claimRunForProcessing('run_1');
    expect(mocks.runCollection.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: expect.arrayContaining([
          { $or: [{ _id: 'run_1' }, { id: 'run_1' }] },
          { status: 'queued' },
        ]),
      }),
      {
        $set: expect.objectContaining({
          status: 'running',
          startedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      },
      { returnDocument: 'after' }
    );
    expect(claimed?.status).toBe('running');
  });

  it('lists runs with node filtering and can skip totals', async () => {
    const mocks = createDbMocks();
    const { mongoPathRunRepository } = await loadModule(mocks.db);

    mocks.nodeCollection.distinct.mockResolvedValueOnce([]);
    await expect(
      mongoPathRunRepository.listRuns({ nodeId: 'node_1' } as any)
    ).resolves.toEqual({ runs: [], total: 0 });
    expect(mocks.runCollection.find).not.toHaveBeenCalled();

    mocks.nodeCollection.distinct.mockResolvedValueOnce(['run_2', 'run_1']);
    mocks.runCursor.toArray.mockResolvedValueOnce([
      {
        _id: 'run_1',
        id: 'run_1',
        userId: 'user_1',
        pathId: 'path_1',
        status: 'queued',
        createdAt: '2026-03-27T07:00:00.000Z',
        updatedAt: '2026-03-27T07:05:00.000Z',
      },
    ]);

    const listed = await mongoPathRunRepository.listRuns({
      nodeId: ' node_1 ',
      offset: 5,
      limit: 10,
      includeTotal: false,
    } as any);

    expect(mocks.nodeCollection.distinct).toHaveBeenLastCalledWith('runId', { nodeId: 'node_1' });
    expect(mocks.runCollection.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        $or: [{ _id: { $in: ['run_2', 'run_1'] } }, { id: { $in: ['run_2', 'run_1'] } }],
      }),
      { projection: expect.any(Object) }
    );
    expect(mocks.runCursor.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mocks.runCursor.allowDiskUse).toHaveBeenCalledWith(true);
    expect(mocks.runCursor.skip).toHaveBeenCalledWith(5);
    expect(mocks.runCursor.limit).toHaveBeenCalledWith(10);
    expect(mocks.runCollection.countDocuments).not.toHaveBeenCalled();
    expect(listed.total).toBe(1);
    expect(listed.runs[0]?.id).toBe('run_1');
  });

  it('computes queue stats with retry-window filters and maps the oldest queued date', async () => {
    const mocks = createDbMocks();
    const { mongoPathRunRepository } = await loadModule(mocks.db);

    mocks.runCollection.countDocuments.mockResolvedValueOnce(4);
    mocks.runCursor.next.mockResolvedValueOnce({
      createdAt: '2026-03-27T06:30:00.000Z',
    });

    const stats = await mongoPathRunRepository.getQueueStats({
      userId: 'user_1',
      source: 'manual',
      sourceMode: 'exclude',
    } as any);

    expect(mocks.runCollection.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: expect.arrayContaining([
          expect.objectContaining({
            $and: expect.arrayContaining([
              { userId: 'user_1' },
              { status: 'queued' },
              { 'meta.source': { $ne: 'manual' } },
            ]),
          }),
          expect.objectContaining({
            $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: expect.any(Date) } }],
          }),
        ]),
      })
    );
    expect(stats).toEqual({
      queuedCount: 4,
      oldestQueuedAt: new Date('2026-03-27T06:30:00.000Z'),
    });
  });

  it('creates events, pages event streams, deletes runs, and finalizes runs with follow-up events', async () => {
    const mocks = createDbMocks();
    const module = await loadModule(mocks.db, ['event-id']);
    const { mongoPathRunRepository } = module;

    const createdEvent = await mongoPathRunRepository.createRunEvent({
      runId: 'run_1',
      level: 'info',
      message: 'Started',
    } as any);
    expect(mocks.eventCollection.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'event-id',
        runId: 'run_1',
        level: 'info',
        message: 'Started',
        createdAt: expect.any(Date),
      })
    );
    expect(createdEvent.id).toBe('event-id');

    mocks.eventCursor.toArray.mockResolvedValueOnce([
      {
        _id: 'event_2',
        runId: 'run_1',
        level: 'warn',
        message: 'Warned',
        createdAt: '2026-03-27T07:00:01.000Z',
      },
    ]);
    const events = await mongoPathRunRepository.listRunEvents('run_1', {
      after: { createdAt: '2026-03-27T07:00:00.000Z', id: 'event_1' },
      limit: 25,
    } as any);
    expect(mocks.eventCollection.find).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run_1',
        $or: [
          { createdAt: { $gt: new Date('2026-03-27T07:00:00.000Z') } },
          {
            createdAt: new Date('2026-03-27T07:00:00.000Z'),
            $or: [{ _id: { $gt: 'event_1' } }, { id: { $gt: 'event_1' } }],
          },
        ],
      })
    );
    expect(mocks.eventCursor.limit).toHaveBeenCalledWith(25);
    expect(events[0]?.id).toBe('event_2');

    mocks.runCollection.findOneAndDelete.mockResolvedValueOnce({ _id: 'run_1' });
    await expect(mongoPathRunRepository.deleteRun('run_1')).resolves.toBe(true);
    expect(mocks.nodeCollection.deleteMany).toHaveBeenCalledWith({ runId: 'run_1' });
    expect(mocks.eventCollection.deleteMany).toHaveBeenCalledWith({ runId: 'run_1' });

    const createRunEventSpy = vi
      .spyOn(mongoPathRunRepository, 'createRunEvent')
      .mockResolvedValue({} as any);
    await mongoPathRunRepository.finalizeRun('run_1', 'completed', {
      errorMessage: null,
      event: { level: 'info', message: 'Finished' } as any,
      finishedAt: '2026-03-27T07:15:00.000Z',
    });
    expect(mocks.runCollection.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { $and: [{ $or: [{ id: 'run_1' }, { _id: 'run_1' }] }] },
          update: {
            $set: expect.objectContaining({
              status: 'completed',
              errorMessage: null,
              finishedAt: new Date('2026-03-27T07:15:00.000Z'),
              updatedAt: expect.any(Date),
            }),
          },
        },
      },
    ]);
    expect(createRunEventSpy).toHaveBeenCalledWith({
      level: 'info',
      message: 'Finished',
      runId: 'run_1',
    });
  });
});

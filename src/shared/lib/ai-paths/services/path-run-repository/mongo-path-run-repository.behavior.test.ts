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

  it('finds runs, claims the next queued run, marks stale runs, and deletes legacy-id runs', async () => {
    const mocks = createDbMocks();
    const { mongoPathRunRepository } = await loadModule(mocks.db);

    mocks.runCollection.findOne.mockResolvedValueOnce({
      _id: 'run_legacy',
      pathId: 'path_legacy',
      status: 'queued',
      createdAt: '2026-03-27T07:00:00.000Z',
    });
    await expect(mongoPathRunRepository.findRunById('run_legacy')).resolves.toEqual(
      expect.objectContaining({ id: 'run_legacy', pathId: 'path_legacy' })
    );

    mocks.runCollection.findOne.mockResolvedValueOnce({
      _id: 'request_run',
      id: 'request_run',
      pathId: 'path_1',
      status: 'completed',
      meta: { requestId: 'req_1' },
      createdAt: '2026-03-27T07:00:00.000Z',
    });
    await expect(mongoPathRunRepository.getRunByRequestId('path_1', 'req_1')).resolves.toEqual(
      expect.objectContaining({ id: 'request_run', pathId: 'path_1' })
    );

    mocks.runCollection.findOne.mockResolvedValueOnce(null);
    await expect(mongoPathRunRepository.claimNextQueuedRun()).resolves.toBeNull();

    const claimSpy = vi
      .spyOn(mongoPathRunRepository, 'claimRunForProcessing')
      .mockResolvedValue({ id: 'queued_1', status: 'running' } as any);
    mocks.runCollection.findOne.mockResolvedValueOnce({ _id: 'queued_1' });
    await expect(mongoPathRunRepository.claimNextQueuedRun()).resolves.toEqual(
      expect.objectContaining({ id: 'queued_1', status: 'running' })
    );
    expect(mocks.runCollection.findOne).toHaveBeenLastCalledWith(
      {
        status: 'queued',
        $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: expect.any(Date) } }],
      },
      {
        projection: { _id: 1, id: 1 },
        sort: { createdAt: 1 },
      }
    );
    expect(claimSpy).toHaveBeenLastCalledWith('queued_1');
    claimSpy.mockRestore();

    mocks.runCollection.updateMany.mockResolvedValueOnce({ modifiedCount: 3 });
    await expect(mongoPathRunRepository.markStaleRunningRuns(60_000)).resolves.toEqual({
      count: 3,
    });
    expect(mocks.runCollection.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'running',
        $or: expect.any(Array),
      }),
      {
        $set: expect.objectContaining({
          status: 'failed',
          finishedAt: expect.any(Date),
          errorMessage: 'Run marked failed due to stale running state.',
        }),
      }
    );

    mocks.runCollection.findOneAndDelete.mockResolvedValueOnce({ _id: 'legacy_only' });
    await expect(mongoPathRunRepository.deleteRun('legacy_only')).resolves.toBe(true);
    expect(mocks.nodeCollection.deleteMany).toHaveBeenLastCalledWith({ runId: 'legacy_only' });
    expect(mocks.eventCollection.deleteMany).toHaveBeenLastCalledWith({ runId: 'legacy_only' });

    mocks.runCollection.findOneAndDelete.mockResolvedValueOnce(null);
    await expect(mongoPathRunRepository.deleteRun('missing')).resolves.toBe(false);
  });

  it('creates, upserts, and pages run nodes plus deletes filtered run batches', async () => {
    const mocks = createDbMocks();
    const { mongoPathRunRepository } = await loadModule(mocks.db, ['node_a', 'node_b']);

    await expect(mongoPathRunRepository.createRunNodes('run_1', [])).resolves.toBeUndefined();
    expect(mocks.nodeCollection.insertMany).not.toHaveBeenCalled();

    await mongoPathRunRepository.createRunNodes('run_1', [
      { id: 'node_1', type: 'prompt', title: 'Prompt node' },
      { id: 'node_2', type: 'agent' },
    ] as any);
    expect(mocks.nodeCollection.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'node_a',
        runId: 'run_1',
        nodeId: 'node_1',
        nodeType: 'prompt',
        nodeTitle: 'Prompt node',
      }),
      expect.objectContaining({
        _id: 'node_b',
        runId: 'run_1',
        nodeId: 'node_2',
        nodeType: 'agent',
        nodeTitle: null,
      }),
    ]);

    mocks.nodeCollection.findOneAndUpdate.mockResolvedValueOnce({
      _id: 'node_a',
      runId: 'run_1',
      nodeId: 'node_1',
      nodeType: 'prompt',
      nodeTitle: 'Prompt node',
      status: 'running',
      attempt: 2,
      createdAt: '2026-03-27T07:00:00.000Z',
      updatedAt: '2026-03-27T07:05:00.000Z',
      startedAt: '2026-03-27T07:01:00.000Z',
      finishedAt: '2026-03-27T07:05:00.000Z',
    });
    await expect(
      mongoPathRunRepository.upsertRunNode('run_1', 'node_1', {
        nodeType: 'prompt',
        nodeTitle: 'Prompt node',
        status: 'running',
        attempt: 2,
        startedAt: '2026-03-27T07:01:00.000Z',
        finishedAt: '2026-03-27T07:05:00.000Z',
      } as any)
    ).resolves.toEqual(expect.objectContaining({ id: 'node_a', status: 'running' }));
    expect(mocks.nodeCollection.findOneAndUpdate).toHaveBeenLastCalledWith(
      { runId: 'run_1', nodeId: 'node_1' },
      {
        $set: expect.objectContaining({
          status: 'running',
          startedAt: new Date('2026-03-27T07:01:00.000Z'),
          finishedAt: new Date('2026-03-27T07:05:00.000Z'),
          updatedAt: expect.any(Date),
        }),
        $setOnInsert: { runId: 'run_1', nodeId: 'node_1', createdAt: expect.any(Date) },
      },
      { returnDocument: 'after', upsert: true }
    );

    mocks.nodeCollection.findOneAndUpdate.mockResolvedValueOnce(null);
    await expect(
      mongoPathRunRepository.upsertRunNode('run_1', 'missing', {
        nodeType: 'agent',
        status: 'failed',
      } as any)
    ).rejects.toThrow('Run node not found');

    mocks.nodeCursor.toArray.mockResolvedValueOnce([
      {
        _id: 'node_record',
        runId: 'run_1',
        nodeId: 'node_1',
        nodeType: 'prompt',
        status: 'pending',
        attempt: 0,
        createdAt: '2026-03-27T07:00:00.000Z',
      },
    ]);
    await expect(mongoPathRunRepository.listRunNodes('run_1')).resolves.toEqual([
      expect.objectContaining({ id: 'node_record', nodeId: 'node_1' }),
    ]);
    expect(mocks.nodeCursor.sort).toHaveBeenLastCalledWith({ createdAt: 1 });

    await expect(
      mongoPathRunRepository.listRunNodesSince(
        'run_1',
        { updatedAt: 'not-a-date', nodeId: 'node_1' },
        { limit: 900 }
      )
    ).resolves.toEqual([]);

    mocks.nodeCursor.toArray.mockResolvedValueOnce([
      {
        _id: 'node_record_2',
        runId: 'run_1',
        nodeId: 'node_2',
        nodeType: 'agent',
        status: 'completed',
        attempt: 1,
        createdAt: '2026-03-27T07:00:00.000Z',
        updatedAt: '2026-03-27T07:06:00.000Z',
      },
    ]);
    await expect(
      mongoPathRunRepository.listRunNodesSince(
        'run_1',
        { updatedAt: '2026-03-27T07:05:00.000Z', nodeId: ' node_1 ' },
        { limit: 900 }
      )
    ).resolves.toEqual([expect.objectContaining({ id: 'node_record_2', nodeId: 'node_2' })]);
    expect(mocks.nodeCollection.find).toHaveBeenLastCalledWith({
      runId: 'run_1',
      $or: [
        { updatedAt: { $gt: new Date('2026-03-27T07:05:00.000Z') } },
        {
          updatedAt: new Date('2026-03-27T07:05:00.000Z'),
          nodeId: { $gt: 'node_1' },
        },
      ],
    });
    expect(mocks.nodeCursor.sort).toHaveBeenLastCalledWith({ updatedAt: 1, nodeId: 1 });
    expect(mocks.nodeCursor.limit).toHaveBeenLastCalledWith(500);

    mocks.nodeCollection.distinct.mockResolvedValueOnce([]);
    await expect(mongoPathRunRepository.deleteRuns({ nodeId: ' node_1 ' } as any)).resolves.toEqual(
      { count: 0 }
    );

    mocks.runCursor.toArray.mockResolvedValueOnce([]);
    await expect(mongoPathRunRepository.deleteRuns({ status: 'queued' } as any)).resolves.toEqual({
      count: 0,
    });

    mocks.runCursor.toArray.mockResolvedValueOnce([{ _id: null, id: undefined }]);
    await expect(mongoPathRunRepository.deleteRuns({ status: 'failed' } as any)).resolves.toEqual({
      count: 0,
    });

    mocks.nodeCollection.distinct.mockResolvedValueOnce(['run_1', 'run_2']);
    mocks.runCursor.toArray.mockResolvedValueOnce([
      { _id: 'run_1', id: 'run_1' },
      { _id: 'run_2' },
    ]);
    mocks.runCollection.deleteMany.mockResolvedValueOnce({ deletedCount: 2 });
    await expect(
      mongoPathRunRepository.deleteRuns({ pathId: 'path_1', nodeId: 'node_2' } as any)
    ).resolves.toEqual({ count: 2 });
    expect(mocks.runCollection.deleteMany).toHaveBeenLastCalledWith({
      $or: [{ _id: { $in: ['run_1', 'run_2'] } }, { id: { $in: ['run_1', 'run_2'] } }],
    });
  });

  it('lists events with since filters and ignores invalid cursors', async () => {
    const mocks = createDbMocks();
    const { mongoPathRunRepository } = await loadModule(mocks.db);

    mocks.eventCursor.toArray.mockResolvedValueOnce([
      {
        _id: 'event_3',
        runId: 'run_1',
        level: 'info',
        message: 'Resumed',
        createdAt: '2026-03-27T07:10:00.000Z',
      },
    ]);
    await expect(
      mongoPathRunRepository.listRunEvents('run_1', {
        since: '2026-03-27T07:09:00.000Z',
      } as any)
    ).resolves.toEqual([expect.objectContaining({ id: 'event_3' })]);
    expect(mocks.eventCollection.find).toHaveBeenLastCalledWith({
      runId: 'run_1',
      createdAt: { $gt: new Date('2026-03-27T07:09:00.000Z') },
    });

    mocks.eventCursor.toArray.mockResolvedValueOnce([]);
    await expect(
      mongoPathRunRepository.listRunEvents('run_1', {
        since: 'not-a-date',
        after: { createdAt: '2026-03-27T07:10:00.000Z', id: '   ' },
      } as any)
    ).resolves.toEqual([]);
    expect(mocks.eventCollection.find).toHaveBeenLastCalledWith({ runId: 'run_1' });
  });
});

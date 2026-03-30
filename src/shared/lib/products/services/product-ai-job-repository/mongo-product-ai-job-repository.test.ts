/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  deleteOne: vi.fn(),
  find: vi.fn(),
  findLimit: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  getMongoDb: vi.fn(),
  insertOne: vi.fn(),
  toArray: vi.fn(),
  updateMany: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomUUID: () => 'job-uuid',
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { mongoProductAiJobRepository } from './mongo-product-ai-job-repository';

type CursorLike = {
  limit: typeof mocks.findLimit;
  sort: ReturnType<typeof vi.fn>;
  toArray: typeof mocks.toArray;
};

describe('mongo-product-ai-job-repository', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T16:00:00.000Z'));

    const cursor: CursorLike = {
      limit: mocks.findLimit,
      sort: vi.fn(() => cursor),
      toArray: mocks.toArray,
    };

    mocks.deleteMany.mockReset();
    mocks.deleteOne.mockReset();
    mocks.find.mockReset().mockReturnValue(cursor);
    mocks.findLimit.mockReset().mockReturnValue(cursor);
    mocks.findOne.mockReset();
    mocks.findOneAndUpdate.mockReset();
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'product_ai_jobs') return {};
        return {
          deleteMany: mocks.deleteMany,
          deleteOne: mocks.deleteOne,
          find: mocks.find,
          findOne: mocks.findOne,
          findOneAndUpdate: mocks.findOneAndUpdate,
          insertOne: mocks.insertOne,
          updateMany: mocks.updateMany,
          updateOne: mocks.updateOne,
        };
      },
    });
    mocks.insertOne.mockReset();
    mocks.toArray.mockReset();
    mocks.updateMany.mockReset();
    mocks.updateOne.mockReset();
  });

  it('creates jobs and lists them with filters and positive limit normalization', async () => {
    const created = await mongoProductAiJobRepository.createJob('product-1', 'graph_model', {
      prompt: 'hello',
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: 'job-uuid',
        productId: 'product-1',
        status: 'pending',
        type: 'graph_model',
        payload: { prompt: 'hello' },
      })
    );
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'job-uuid',
        id: 'job-uuid',
        productId: 'product-1',
        status: 'pending',
        createdAt: new Date('2026-03-25T16:00:00.000Z'),
        updatedAt: new Date('2026-03-25T16:00:00.000Z'),
      })
    );

    mocks.toArray.mockResolvedValueOnce([
      {
        _id: 'job-1',
        productId: 'product-1',
        status: 'completed',
        type: 'graph_model',
        payload: { prompt: 'hello' },
        result: { ok: true },
        createdAt: new Date('2026-03-25T15:00:00.000Z'),
        updatedAt: new Date('2026-03-25T15:05:00.000Z'),
      },
    ]);

    const jobs = await mongoProductAiJobRepository.findJobs('product-1', {
      type: 'graph_model',
      statuses: ['completed'],
      limit: 2.7,
    });

    expect(mocks.find).toHaveBeenCalledWith({
      productId: 'product-1',
      type: 'graph_model',
      status: { $in: ['completed'] },
    });
    expect(jobs).toEqual([
      expect.objectContaining({
        id: 'job-1',
        result: { ok: true },
      }),
    ]);
  });

  it('finds and claims pending jobs', async () => {
    const pendingDoc = {
      _id: 'job-pending',
      productId: 'product-2',
      status: 'pending',
      type: 'ai_path',
      payload: {},
      createdAt: new Date('2026-03-25T15:00:00.000Z'),
      updatedAt: new Date('2026-03-25T15:00:00.000Z'),
    };
    const runningDoc = {
      ...pendingDoc,
      status: 'running',
      startedAt: new Date('2026-03-25T16:00:00.000Z'),
      updatedAt: new Date('2026-03-25T16:00:00.000Z'),
    };

    mocks.findOne
      .mockResolvedValueOnce(pendingDoc)
      .mockResolvedValueOnce(pendingDoc)
      .mockResolvedValueOnce({
        ...pendingDoc,
        _id: 'job-by-id',
        id: 'job-by-id',
      });
    mocks.findOneAndUpdate.mockResolvedValueOnce(runningDoc);

    expect(await mongoProductAiJobRepository.findNextPendingJob()).toEqual(
      expect.objectContaining({ id: 'job-pending', status: 'pending' })
    );
    expect(await mongoProductAiJobRepository.findAnyPendingJob()).toEqual(
      expect.objectContaining({ id: 'job-pending', status: 'pending' })
    );
    expect(await mongoProductAiJobRepository.findJobById('job-by-id')).toEqual(
      expect.objectContaining({ id: 'job-by-id' })
    );
    expect(await mongoProductAiJobRepository.claimNextPendingJob()).toEqual(
      expect.objectContaining({ id: 'job-pending', status: 'running' })
    );

    expect(mocks.findOne).toHaveBeenNthCalledWith(
      1,
      { status: 'pending' },
      { sort: { createdAt: 1 } }
    );
    expect(mocks.findOne).toHaveBeenNthCalledWith(
      2,
      { status: 'pending' },
      { sort: { createdAt: 1 } }
    );
    expect(mocks.findOne).toHaveBeenNthCalledWith(3, {
      $or: [{ _id: 'job-by-id' }, { id: 'job-by-id' }],
    });
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { status: 'pending' },
      {
        $set: {
          status: 'running',
          startedAt: new Date('2026-03-25T16:00:00.000Z'),
          updatedAt: new Date('2026-03-25T16:00:00.000Z'),
        },
      },
      { sort: { createdAt: 1 }, returnDocument: 'after' }
    );
  });

  it('retries updateJob against a resolved existing record before failing over to upsert', async () => {
    const retryDoc = {
      _id: 'job-retry',
      id: 'job-retry',
      productId: 'product-3',
      status: 'completed',
      type: 'graph_model',
      payload: { prompt: 'retry' },
      result: { ok: true },
      errorMessage: null,
      createdAt: new Date('2026-03-25T14:00:00.000Z'),
      updatedAt: new Date('2026-03-25T16:00:00.000Z'),
      finishedAt: new Date('2026-03-25T16:00:00.000Z'),
    };

    mocks.findOneAndUpdate.mockResolvedValueOnce(null).mockResolvedValueOnce(retryDoc);
    mocks.findOne.mockResolvedValueOnce({ _id: 'legacy-job' });

    const updated = await mongoProductAiJobRepository.updateJob('job-retry', {
      status: 'completed',
      result: { ok: true },
      finishedAt: new Date('2026-03-25T16:00:00.000Z'),
    });

    expect(mocks.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      {
        $or: [
          { _id: 'job-retry' },
          { id: 'job-retry' },
          { _id: 'job-retry' },
          { id: 'job-retry' },
        ],
      },
      {
        $set: {
          status: 'completed',
          result: { ok: true },
          finishedAt: new Date('2026-03-25T16:00:00.000Z'),
          updatedAt: new Date('2026-03-25T16:00:00.000Z'),
        },
      },
      { returnDocument: 'after' }
    );
    expect(mocks.findOne).toHaveBeenCalledWith({
      $or: [
        { _id: 'job-retry' },
        { id: 'job-retry' },
        { _id: 'job-retry' },
        { id: 'job-retry' },
      ],
    });
    expect(mocks.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { _id: 'legacy-job' },
      {
        $set: {
          status: 'completed',
          result: { ok: true },
          finishedAt: new Date('2026-03-25T16:00:00.000Z'),
          updatedAt: new Date('2026-03-25T16:00:00.000Z'),
        },
      },
      { returnDocument: 'after' }
    );
    expect(updated).toEqual(expect.objectContaining({ id: 'job-retry', status: 'completed' }));
  });

  it('upserts missing jobs when seed data is provided and throws when it is not', async () => {
    const insertedDoc = {
      _id: 'job-upsert',
      id: 'job-upsert',
      productId: 'product-4',
      status: 'running',
      type: 'graph_model',
      payload: { prompt: 'seed' },
      createdAt: new Date('2026-03-25T16:00:00.000Z'),
      updatedAt: new Date('2026-03-25T16:00:00.000Z'),
      startedAt: new Date('2026-03-25T16:00:00.000Z'),
      errorMessage: null,
      result: null,
      finishedAt: null,
    };

    mocks.findOneAndUpdate.mockResolvedValueOnce(null);
    mocks.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(insertedDoc);
    mocks.updateOne.mockResolvedValueOnce({ upsertedCount: 1 });

    const upserted = await mongoProductAiJobRepository.updateJob('job-upsert', {
      productId: 'product-4',
      type: 'graph_model',
      payload: { prompt: 'seed' },
      status: 'running',
      startedAt: new Date('2026-03-25T16:00:00.000Z'),
    });

    expect(mocks.updateOne).toHaveBeenCalledWith(
      { _id: 'job-upsert' },
      {
        $set: {
          status: 'running',
          startedAt: new Date('2026-03-25T16:00:00.000Z'),
          updatedAt: new Date('2026-03-25T16:00:00.000Z'),
        },
        $setOnInsert: {
          _id: 'job-upsert',
          id: 'job-upsert',
          productId: 'product-4',
          type: 'graph_model',
          payload: { prompt: 'seed' },
          createdAt: new Date('2026-03-25T16:00:00.000Z'),
        },
      },
      { upsert: true }
    );
    expect(upserted).toEqual(expect.objectContaining({ id: 'job-upsert', productId: 'product-4' }));

    mocks.findOneAndUpdate.mockResolvedValueOnce(null);
    mocks.findOne.mockResolvedValueOnce(null);
    await expect(
      mongoProductAiJobRepository.updateJob('missing-job', {
        status: 'failed',
      })
    ).rejects.toThrow('Job not found');
  });

  it('deletes jobs and marks stale running jobs', async () => {
    mocks.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
    mocks.deleteMany
      .mockResolvedValueOnce({ deletedCount: 3 })
      .mockResolvedValueOnce({ deletedCount: 7 });
    mocks.updateMany.mockResolvedValueOnce({ modifiedCount: 2 });

    await mongoProductAiJobRepository.deleteJob('job-delete');
    const deletedTerminal = await mongoProductAiJobRepository.deleteTerminalJobs();
    const deletedAll = await mongoProductAiJobRepository.deleteAllJobs();
    const marked = await mongoProductAiJobRepository.markStaleRunningJobs(60_000);

    expect(mocks.deleteOne).toHaveBeenCalledWith({
      $or: [{ _id: 'job-delete' }, { id: 'job-delete' }],
    });
    expect(mocks.deleteMany).toHaveBeenNthCalledWith(1, {
      status: { $in: ['completed', 'failed', 'canceled'] },
    });
    expect(mocks.deleteMany).toHaveBeenNthCalledWith(2, {});
    expect(mocks.updateMany).toHaveBeenCalledWith(
      { status: 'running', startedAt: { $lt: new Date('2026-03-25T15:59:00.000Z') } },
      {
        $set: {
          status: 'failed',
          finishedAt: new Date('2026-03-25T16:00:00.000Z'),
          errorMessage: 'Job marked failed due to stale running state.',
        },
      }
    );
    expect(deletedTerminal).toEqual({ count: 3 });
    expect(deletedAll).toEqual({ count: 7 });
    expect(marked).toEqual({ count: 2 });
  });
});

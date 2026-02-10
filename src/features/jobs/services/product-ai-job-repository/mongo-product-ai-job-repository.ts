import 'server-only';

import { randomUUID } from 'crypto';

import type {
  FindProductAiJobsOptions,
  ProductAiJobRecord,
  ProductAiJobRepository,
  ProductAiJobUpdate,
} from '@/features/jobs/types/product-ai-job-repository';
import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const JOBS_COLLECTION = 'product_ai_jobs';

type JobDocument = {
  _id: string;
  id?: string;
  productId: string;
  status: string;
  type: string;
  payload: unknown;
  result?: unknown;
  errorMessage?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  updatedAt?: Date;
};

const toRecord = (doc: JobDocument): ProductAiJobRecord => ({
  id: doc.id || doc._id,
  productId: doc.productId,
  status: doc.status as ProductAiJobRecord['status'],
  type: doc.type,
  payload: doc.payload,
  result: doc.result ?? null,
  errorMessage: doc.errorMessage ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt ?? doc.createdAt,
  startedAt: doc.startedAt ?? null,
  finishedAt: doc.finishedAt ?? null,
});

export const mongoProductAiJobRepository: ProductAiJobRepository = {
  async createJob(productId: string, type: string, payload: unknown) {
    const db = await getMongoDb();
    const now = new Date();
    const id = randomUUID();
    const document: JobDocument = {
      _id: id,
      id,
      productId,
      status: 'pending',
      type,
      payload,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<JobDocument>(JOBS_COLLECTION).insertOne(document);
    return toRecord(document);
  },

  async findJobs(productId?: string, options?: FindProductAiJobsOptions) {
    const db = await getMongoDb();
    const statuses =
      options?.statuses && options.statuses.length > 0
        ? options.statuses
        : undefined;
    const filter = {
      ...(productId ? { productId } : {}),
      ...(options?.type ? { type: options.type } : {}),
      ...(statuses ? { status: { $in: statuses } } : {}),
    };
    const cursor = db
      .collection<JobDocument>(JOBS_COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 });
    const limit =
      typeof options?.limit === 'number' && options.limit > 0
        ? Math.floor(options.limit)
        : null;
    if (limit !== null) {
      cursor.limit(limit);
    }
    const docs = await cursor.toArray();
    return docs.map(toRecord);
  },

  async findJobById(jobId: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .findOne({ $or: [{ _id: jobId }, { id: jobId }] });
    return doc ? toRecord(doc) : null;
  },

  async findNextPendingJob() {
    const db = await getMongoDb();
    const doc = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .findOne({ status: 'pending' }, { sort: { createdAt: 1 } });
    return doc ? toRecord(doc) : null;
  },

  async findAnyPendingJob() {
    const db = await getMongoDb();
    const doc = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .findOne({ status: 'pending' }, { sort: { createdAt: 1 } });
    return doc ? toRecord(doc) : null;
  },

  async claimNextPendingJob() {
    const db = await getMongoDb();
    const now = new Date();
    const result = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .findOneAndUpdate(
        { status: 'pending' },
        { $set: { status: 'running', startedAt: now, updatedAt: now } },
        { sort: { createdAt: 1 }, returnDocument: 'after' }
      );
    if (!result) return null;
    return toRecord(result);
  },

  async updateJob(jobId: string, data: ProductAiJobUpdate) {
    const db = await getMongoDb();
    const now = new Date();
    const idString = typeof jobId === 'string' ? jobId : String(jobId);
    const { productId, type, payload, createdAt, ...rest } = data;
    const updateData = { ...rest, updatedAt: now };
    const filter = {
      $or: [
        { _id: jobId },
        { id: jobId },
        { _id: idString },
        { id: idString },
      ],
    };
    const result = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .findOneAndUpdate(
        filter,
        { $set: updateData },
        { returnDocument: 'after' }
      );

    if (!result) {
      const existing = await db
        .collection<JobDocument>(JOBS_COLLECTION)
        .findOne(filter);
      if (existing) {
        const retry = await db
          .collection<JobDocument>(JOBS_COLLECTION)
          .findOneAndUpdate(
            { _id: existing._id },
            { $set: updateData },
            { returnDocument: 'after' }
          );
        if (retry) {
          return toRecord(retry);
        }
      }
      if (productId && type && payload !== undefined) {
        const seed: JobDocument = {
          _id: idString,
          id: idString,
          productId,
          status: data.status ?? 'pending',
          type,
          payload,
          result: data.result,
          errorMessage: data.errorMessage ?? null,
          createdAt: createdAt ?? now,
          startedAt: data.startedAt ?? null,
          finishedAt: data.finishedAt ?? null,
          updatedAt: now,
        };
        await db.collection<JobDocument>(JOBS_COLLECTION).updateOne(
          { _id: idString },
          {
            $set: updateData,
            $setOnInsert: {
              _id: seed._id,
              id: idString,
              productId: seed.productId,
              type: seed.type,
              payload: seed.payload,
              createdAt: seed.createdAt,
            },
          },
          { upsert: true }
        );
        const inserted = await db
          .collection<JobDocument>(JOBS_COLLECTION)
          .findOne({ _id: idString });
        if (inserted) {
          return toRecord(inserted);
        }
      }
      throw notFoundError('Job not found', { jobId: idString });
    }

    return toRecord(result);
  },

  async deleteJob(jobId: string) {
    const db = await getMongoDb();
    await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .deleteOne({ $or: [{ _id: jobId }, { id: jobId }] });
  },

  async deleteTerminalJobs() {
    const db = await getMongoDb();
    const result = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .deleteMany({ status: { $in: ['completed', 'failed', 'canceled'] } });
    return { count: result.deletedCount ?? 0 };
  },

  async deleteAllJobs() {
    const db = await getMongoDb();
    const result = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .deleteMany({});
    return { count: result.deletedCount ?? 0 };
  },

  async markStaleRunningJobs(maxAgeMs: number) {
    const db = await getMongoDb();
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .updateMany(
        { status: 'running', startedAt: { $lt: cutoff } },
        {
          $set: {
            status: 'failed',
            finishedAt: new Date(),
            errorMessage: 'Job marked failed due to stale running state.',
          },
        }
      );
    return { count: result.modifiedCount ?? 0 };
  },
};

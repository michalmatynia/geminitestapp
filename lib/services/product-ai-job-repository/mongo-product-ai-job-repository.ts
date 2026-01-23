import { randomUUID } from "crypto";
import { getMongoDb } from "@/lib/db/mongo-client";
import type {
  ProductAiJobRecord,
  ProductAiJobRepository,
  ProductAiJobUpdate,
} from "@/types/services/product-ai-job-repository";

const JOBS_COLLECTION = "product_ai_jobs";

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
  status: doc.status as ProductAiJobRecord["status"],
  type: doc.type,
  payload: doc.payload,
  result: doc.result ?? null,
  errorMessage: doc.errorMessage ?? null,
  createdAt: doc.createdAt,
  startedAt: doc.startedAt ?? null,
  finishedAt: doc.finishedAt ?? null,
});

export const mongoProductAiJobRepository: ProductAiJobRepository = {
  async createJob(productId, type, payload) {
    const db = await getMongoDb();
    const now = new Date();
    const id = randomUUID();
    const document: JobDocument = {
      _id: id,
      id,
      productId,
      status: "pending",
      type,
      payload,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<JobDocument>(JOBS_COLLECTION).insertOne(document);
    return toRecord(document);
  },

  async findJobs(productId) {
    const db = await getMongoDb();
    const filter = productId ? { productId } : {};
    const docs = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(toRecord);
  },

  async findJobById(jobId) {
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
      .findOne({ status: "pending" }, { sort: { createdAt: 1 } });
    return doc ? toRecord(doc) : null;
  },

  async findAnyPendingJob() {
    const db = await getMongoDb();
    const doc = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .findOne({ status: "pending" }, { sort: { createdAt: 1 } });
    return doc ? toRecord(doc) : null;
  },

  async updateJob(jobId, data: ProductAiJobUpdate) {
    const db = await getMongoDb();
    const now = new Date();
    const result = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .findOneAndUpdate(
        { $or: [{ _id: jobId }, { id: jobId }] },
        { $set: { ...data, updatedAt: now } },
        { returnDocument: "after" }
      );

    if (!result.value) {
      throw new Error("Job not found");
    }

    return toRecord(result.value);
  },

  async deleteJob(jobId) {
    const db = await getMongoDb();
    await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .deleteOne({ $or: [{ _id: jobId }, { id: jobId }] });
  },

  async deleteTerminalJobs() {
    const db = await getMongoDb();
    const result = await db
      .collection<JobDocument>(JOBS_COLLECTION)
      .deleteMany({ status: { $in: ["completed", "failed", "canceled"] } });
    return { count: result.deletedCount ?? 0 };
  },
};

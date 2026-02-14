import 'server-only';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { ImageFileRecord } from '@/shared/types/domain/files';

import type { ImageStudioRunRequest } from './run-executor';

export type ImageStudioRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type ImageStudioRunRecord = {
  id: string;
  projectId: string;
  status: ImageStudioRunStatus;
  request: ImageStudioRunRequest;
  expectedOutputs: number;
  outputs: ImageFileRecord[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type ImageStudioRunDocument = {
  _id: string;
  projectId: string;
  status: ImageStudioRunStatus;
  request: ImageStudioRunRequest;
  expectedOutputs: number;
  outputs?: ImageFileRecord[] | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

type CreateImageStudioRunInput = {
  projectId: string;
  request: ImageStudioRunRequest;
  expectedOutputs: number;
};

type UpdateImageStudioRunInput = {
  status?: ImageStudioRunStatus;
  expectedOutputs?: number;
  outputs?: ImageFileRecord[];
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
};

type ListImageStudioRunsInput = {
  status?: ImageStudioRunStatus | null;
  projectId?: string | null;
  sourceSlotId?: string | null;
  limit?: number;
  offset?: number;
};

const COLLECTION = 'image_studio_runs';

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const ensureIndexesOnce = (() => {
  let started = false;
  return async (): Promise<void> => {
    if (started) return;
    started = true;
    try {
      const db = await getMongoDb();
      await Promise.all([
        db.collection<ImageStudioRunDocument>(COLLECTION).createIndex({ projectId: 1, createdAt: -1 }),
        db.collection<ImageStudioRunDocument>(COLLECTION).createIndex({ status: 1, updatedAt: -1 }),
      ]);
    } catch {
      // best-effort indexing
    }
  };
})();

const toRecord = (doc: ImageStudioRunDocument): ImageStudioRunRecord => ({
  id: doc._id,
  projectId: doc.projectId,
  status: doc.status,
  request: doc.request,
  expectedOutputs: Number.isFinite(doc.expectedOutputs) ? Math.max(1, Math.floor(doc.expectedOutputs)) : 1,
  outputs: Array.isArray(doc.outputs) ? doc.outputs : [],
  errorMessage: doc.errorMessage ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  startedAt: doc.startedAt ?? null,
  finishedAt: doc.finishedAt ?? null,
});

export async function createImageStudioRun(input: CreateImageStudioRunInput): Promise<ImageStudioRunRecord> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const doc: ImageStudioRunDocument = {
    _id: createId(),
    projectId: input.projectId,
    status: 'queued',
    request: input.request,
    expectedOutputs: Math.max(1, Math.min(10, Math.floor(input.expectedOutputs || 1))),
    outputs: [],
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };

  await db.collection<ImageStudioRunDocument>(COLLECTION).insertOne(doc);
  return toRecord(doc);
}

export async function getImageStudioRunById(runId: string): Promise<ImageStudioRunRecord | null> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const doc = await db.collection<ImageStudioRunDocument>(COLLECTION).findOne({ _id: runId });
  if (!doc) return null;
  return toRecord(doc);
}

export async function updateImageStudioRun(
  runId: string,
  update: UpdateImageStudioRunInput
): Promise<ImageStudioRunRecord | null> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const now = new Date().toISOString();

  const patch: Partial<ImageStudioRunDocument> = {
    updatedAt: now,
  };

  if (update.status !== undefined) patch.status = update.status;
  if (update.expectedOutputs !== undefined) patch.expectedOutputs = Math.max(1, Math.min(10, Math.floor(update.expectedOutputs || 1)));
  if (update.outputs !== undefined) patch.outputs = update.outputs;
  if (update.errorMessage !== undefined) patch.errorMessage = update.errorMessage;
  if (update.startedAt !== undefined) patch.startedAt = update.startedAt;
  if (update.finishedAt !== undefined) patch.finishedAt = update.finishedAt;

  const collection = db.collection<ImageStudioRunDocument>(COLLECTION);
  const result = await collection.findOneAndUpdate(
    { _id: runId },
    { $set: patch },
    { returnDocument: 'after' }
  );

  if (!result) return null;
  return toRecord(result);
}

export async function listImageStudioRuns(
  input: ListImageStudioRunsInput = {}
): Promise<{ runs: ImageStudioRunRecord[]; total: number }> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const collection = db.collection<ImageStudioRunDocument>(COLLECTION);

  const limit = Number.isFinite(input.limit) ? Math.max(1, Math.min(200, Math.floor(input.limit ?? 50))) : 50;
  const offset = Number.isFinite(input.offset) ? Math.max(0, Math.floor(input.offset ?? 0)) : 0;

  const query: Record<string, unknown> = {};
  if (input.status) query['status'] = input.status;
  if (input.projectId) query['projectId'] = input.projectId;
  if (input.sourceSlotId) query['request.asset.id'] = input.sourceSlotId;

  const [docs, total] = await Promise.all([
    collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query),
  ]);

  return {
    runs: docs.map(toRecord),
    total,
  };
}

export async function deleteImageStudioRunsByProject(projectId: string): Promise<number> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const result = await db.collection<ImageStudioRunDocument>(COLLECTION).deleteMany({ projectId });
  return result.deletedCount ?? 0;
}

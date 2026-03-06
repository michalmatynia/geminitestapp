import 'server-only';

import type { ImageFileRecord } from '@/shared/contracts/files';
import {
  ImageStudioRunDispatchMode,
  ImageStudioRunRecord,
  ImageStudioRunStatus,
  ImageStudioRunHistoryEvent,
  ImageStudioRunHistoryEventSource,
  ImageStudioRunRequest,
} from '@/shared/contracts/image-studio';

export type {
  ImageStudioRunDispatchMode,
  ImageStudioRunRecord,
  ImageStudioRunStatus,
  ImageStudioRunHistoryEvent,
  ImageStudioRunHistoryEventSource,
  ImageStudioRunRequest,
};
import type { UpdateFilter } from 'mongodb';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { isObjectRecord } from '@/shared/utils/object-utils';

type ImageStudioRunHistoryEventDocument = {
  id?: string | null;
  type?: string | null;
  source?: string | null;
  message?: string | null;
  at?: string | null;
  payload?: Record<string, unknown> | null;
};

type ImageStudioRunDocument = {
  _id: string;
  projectId: string;
  status: ImageStudioRunStatus;
  dispatchMode?: ImageStudioRunDispatchMode | null;
  request: ImageStudioRunRequest;
  expectedOutputs: number;
  outputs?: ImageFileRecord[] | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  historyEvents?: ImageStudioRunHistoryEventDocument[] | null;
};

type CreateImageStudioRunInput = {
  projectId: string;
  request: ImageStudioRunRequest;
  expectedOutputs: number;
};

type UpdateImageStudioRunInput = {
  status?: ImageStudioRunStatus;
  dispatchMode?: ImageStudioRunDispatchMode | null;
  expectedOutputs?: number;
  outputs?: ImageFileRecord[];
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  appendHistoryEvents?: Array<{
    type: string;
    source: ImageStudioRunHistoryEventSource;
    message: string;
    payload?: Record<string, unknown>;
    at?: string | null;
  }>;
};

type ListImageStudioRunsInput = {
  status?: ImageStudioRunStatus | null;
  projectId?: string | null;
  sourceSlotId?: string | null;
  limit?: number;
  offset?: number;
};

type RemoveImageStudioRunOutputsInput = {
  projectId: string;
  runId?: string | null;
  outputFileId?: string | null;
  outputFilepath?: string | null;
};

const COLLECTION = 'image_studio_runs';

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const toJsonSafe = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
};

const ensureIndexesOnce = (() => {
  let started = false;
  return async (): Promise<void> => {
    if (started) return;
    started = true;
    try {
      const db = await getMongoDb();
      await Promise.all([
        db
          .collection<ImageStudioRunDocument>(COLLECTION)
          .createIndex({ projectId: 1, createdAt: -1 }),
        db.collection<ImageStudioRunDocument>(COLLECTION).createIndex({ status: 1, updatedAt: -1 }),
      ]);
    } catch {
      // best-effort indexing
    }
  };
})();

const normalizeHistoryEventSource = (value: unknown): ImageStudioRunHistoryEventSource => {
  if (
    value === 'api' ||
    value === 'queue' ||
    value === 'worker' ||
    value === 'stream' ||
    value === 'client'
  ) {
    return value;
  }
  return 'worker';
};

const toHistoryEvent = (
  event: ImageStudioRunHistoryEventDocument | null | undefined,
  fallbackAt: string
): ImageStudioRunHistoryEvent | null => {
  if (!event) return null;
  const type = typeof event.type === 'string' && event.type.trim() ? event.type.trim() : 'event';
  const message =
    typeof event.message === 'string' && event.message.trim() ? event.message.trim() : '';
  const at = typeof event.at === 'string' && event.at.trim() ? event.at : fallbackAt;
  const payload = isObjectRecord(event.payload) ? toJsonSafe(event.payload) : undefined;
  return {
    id: typeof event.id === 'string' && event.id.trim() ? event.id : createId(),
    type,
    source: normalizeHistoryEventSource(event.source),
    message,
    at,
    ...(payload ? { payload } : {}),
  };
};

const buildHistoryEventDocument = (
  event: {
    type: string;
    source: ImageStudioRunHistoryEventSource;
    message: string;
    payload?: Record<string, unknown>;
    at?: string | null;
  },
  fallbackAt: string
): ImageStudioRunHistoryEventDocument => ({
  id: createId(),
  type: event.type.trim() || 'event',
  source: normalizeHistoryEventSource(event.source),
  message: event.message.trim(),
  at: event.at?.trim() || fallbackAt,
  ...(event.payload && isObjectRecord(event.payload) ? { payload: toJsonSafe(event.payload) } : {}),
});

const toRecord = (doc: ImageStudioRunDocument): ImageStudioRunRecord => ({
  id: doc._id,
  projectId: doc.projectId,
  status: doc.status,
  dispatchMode: doc.dispatchMode ?? null,
  request: doc.request,
  expectedOutputs: Number.isFinite(doc.expectedOutputs)
    ? Math.max(1, Math.floor(doc.expectedOutputs))
    : 1,
  outputs: Array.isArray(doc.outputs) ? doc.outputs : [],
  errorMessage: doc.errorMessage ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  startedAt: doc.startedAt ?? null,
  finishedAt: doc.finishedAt ?? null,
  historyEvents: Array.isArray(doc.historyEvents)
    ? doc.historyEvents
        .map((event) => toHistoryEvent(event, doc.updatedAt))
        .filter((event): event is ImageStudioRunHistoryEvent => Boolean(event))
    : [],
});

export async function createImageStudioRun(
  input: CreateImageStudioRunInput
): Promise<ImageStudioRunRecord> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const doc: ImageStudioRunDocument = {
    _id: createId(),
    projectId: input.projectId,
    status: 'queued',
    dispatchMode: null,
    request: input.request,
    expectedOutputs: Math.max(1, Math.min(10, Math.floor(input.expectedOutputs || 1))),
    outputs: [],
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    historyEvents: [
      buildHistoryEventDocument(
        {
          type: 'accepted',
          source: 'api',
          message: 'Generation run accepted.',
          payload: {
            projectId: input.projectId,
            expectedOutputs: Math.max(1, Math.min(10, Math.floor(input.expectedOutputs || 1))),
            request: input.request,
          },
        },
        now
      ),
    ],
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
  if (update.dispatchMode !== undefined) patch.dispatchMode = update.dispatchMode;
  if (update.expectedOutputs !== undefined)
    patch.expectedOutputs = Math.max(1, Math.min(10, Math.floor(update.expectedOutputs || 1)));
  if (update.outputs !== undefined) patch.outputs = update.outputs;
  if (update.errorMessage !== undefined) patch.errorMessage = update.errorMessage;
  if (update.startedAt !== undefined) patch.startedAt = update.startedAt;
  if (update.finishedAt !== undefined) patch.finishedAt = update.finishedAt;

  const nextHistoryEvents = Array.isArray(update.appendHistoryEvents)
    ? update.appendHistoryEvents
        .map((event) => buildHistoryEventDocument(event, now))
        .filter((event): event is ImageStudioRunHistoryEventDocument => Boolean(event))
    : [];

  const collection = db.collection<ImageStudioRunDocument>(COLLECTION);
  const updateDocument: UpdateFilter<ImageStudioRunDocument> = {
    $set: patch,
  };
  if (nextHistoryEvents.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    updateDocument.$push = {
      historyEvents: {
        $each: nextHistoryEvents,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  const result = await collection.findOneAndUpdate({ _id: runId }, updateDocument, {
    returnDocument: 'after',
  });

  if (!result) return null;
  return toRecord(result);
}

export async function listImageStudioRuns(
  input: ListImageStudioRunsInput = {}
): Promise<{ runs: ImageStudioRunRecord[]; total: number }> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const collection = db.collection<ImageStudioRunDocument>(COLLECTION);

  const limit = Number.isFinite(input.limit)
    ? Math.max(1, Math.min(200, Math.floor(input.limit ?? 50)))
    : 50;
  const offset = Number.isFinite(input.offset) ? Math.max(0, Math.floor(input.offset ?? 0)) : 0;

  const query: Record<string, unknown> = {};
  if (input.status) query['status'] = input.status;
  if (input.projectId) query['projectId'] = input.projectId;
  if (input.sourceSlotId) query['request.asset.id'] = input.sourceSlotId;

  const [docs, total] = await Promise.all([
    collection.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
    collection.countDocuments(query),
  ]);

  return {
    runs: docs.map(toRecord),
    total,
  };
}

export async function removeImageStudioRunOutputs(
  input: RemoveImageStudioRunOutputsInput
): Promise<number> {
  await ensureIndexesOnce();

  const projectId = input.projectId.trim();
  if (!projectId) return 0;

  const runId = input.runId?.trim() || null;
  const outputFileId = input.outputFileId?.trim() || null;
  const outputFilepath = input.outputFilepath?.trim() || null;
  if (!outputFileId && !outputFilepath) return 0;

  const outputSelectors: Array<Record<string, string>> = [];
  if (outputFileId) outputSelectors.push({ id: outputFileId });
  if (outputFilepath) outputSelectors.push({ filepath: outputFilepath });
  if (outputSelectors.length === 0) return 0;

  const db = await getMongoDb();
  const collection = db.collection<ImageStudioRunDocument>(COLLECTION);
  const now = new Date().toISOString();

  const query: Record<string, unknown> = {
    projectId,
    outputs: {
      $elemMatch: {
        $or: outputSelectors,
      },
    },
  };
  if (runId) query['_id'] = runId;

  const result = await collection.updateMany(query, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    $pull: {
      outputs: {
        $or: outputSelectors,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    $set: {
      updatedAt: now,
    },
  });
  return result.modifiedCount ?? 0;
}

export async function deleteImageStudioRunsByProject(projectId: string): Promise<number> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const result = await db.collection<ImageStudioRunDocument>(COLLECTION).deleteMany({ projectId });
  return result.deletedCount ?? 0;
}

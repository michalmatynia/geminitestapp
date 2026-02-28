import 'server-only';

import type { ImageStudioSequenceStep } from '@/shared/lib/ai/image-studio/utils/studio-settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';


export type ImageStudioSequenceRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ImageStudioSequenceRunDispatchMode = 'queued' | 'inline';

export type ImageStudioSequenceRunHistoryEventSource =
  | 'api'
  | 'queue'
  | 'worker'
  | 'stream'
  | 'client';

export type ImageStudioSequenceMaskContext = {
  polygons: Array<Array<{ x: number; y: number }>>;
  invert: boolean;
  feather: number;
} | null;

export type ImageStudioSequenceRunRequest = {
  projectId: string;
  sourceSlotId: string;
  prompt: string;
  paramsState: Record<string, unknown> | null;
  referenceSlotIds: string[];
  steps: ImageStudioSequenceStep[];
  mask: ImageStudioSequenceMaskContext;
  studioSettings: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

export type ImageStudioSequenceRunHistoryEvent = {
  id: string;
  type: string;
  source: ImageStudioSequenceRunHistoryEventSource;
  message: string;
  at: string;
  payload?: Record<string, unknown>;
};

export type ImageStudioSequenceRunRecord = {
  id: string;
  projectId: string;
  sourceSlotId: string;
  currentSlotId: string;
  status: ImageStudioSequenceRunStatus;
  dispatchMode: ImageStudioSequenceRunDispatchMode | null;
  request: ImageStudioSequenceRunRequest;
  activeStepIndex: number | null;
  activeStepId: string | null;
  outputSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
  cancelRequested: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  historyEvents: ImageStudioSequenceRunHistoryEvent[];
};

type ImageStudioSequenceRunHistoryEventDocument = {
  id?: string | null;
  type?: string | null;
  source?: string | null;
  message?: string | null;
  at?: string | null;
  payload?: Record<string, unknown> | null;
};

type ImageStudioSequenceRunDocument = {
  _id: string;
  projectId: string;
  sourceSlotId: string;
  currentSlotId: string;
  status: ImageStudioSequenceRunStatus;
  dispatchMode?: ImageStudioSequenceRunDispatchMode | null;
  request: ImageStudioSequenceRunRequest;
  activeStepIndex?: number | null;
  activeStepId?: string | null;
  outputSlotIds?: string[] | null;
  runtimeMask?: ImageStudioSequenceMaskContext;
  cancelRequested?: boolean;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  historyEvents?: ImageStudioSequenceRunHistoryEventDocument[] | null;
};

type CreateImageStudioSequenceRunInput = {
  projectId: string;
  sourceSlotId: string;
  request: ImageStudioSequenceRunRequest;
};

type UpdateImageStudioSequenceRunInput = {
  status?: ImageStudioSequenceRunStatus;
  dispatchMode?: ImageStudioSequenceRunDispatchMode | null;
  currentSlotId?: string;
  activeStepIndex?: number | null;
  activeStepId?: string | null;
  outputSlotIds?: string[];
  runtimeMask?: ImageStudioSequenceMaskContext;
  cancelRequested?: boolean;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  appendHistoryEvents?: Array<{
    type: string;
    source: ImageStudioSequenceRunHistoryEventSource;
    message: string;
    payload?: Record<string, unknown>;
    at?: string | null;
  }>;
};

type ListImageStudioSequenceRunsInput = {
  status?: ImageStudioSequenceRunStatus | null;
  projectId?: string | null;
  sourceSlotId?: string | null;
  limit?: number;
  offset?: number;
};

const COLLECTION = 'image_studio_sequence_runs';

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toJsonSafe = <T,>(value: T): T => {
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
          .collection<ImageStudioSequenceRunDocument>(COLLECTION)
          .createIndex({ projectId: 1, createdAt: -1 }),
        db
          .collection<ImageStudioSequenceRunDocument>(COLLECTION)
          .createIndex({ status: 1, updatedAt: -1 }),
        db
          .collection<ImageStudioSequenceRunDocument>(COLLECTION)
          .createIndex({ projectId: 1, sourceSlotId: 1, createdAt: -1 }),
      ]);
    } catch {
      // best-effort indexing
    }
  };
})();

const normalizeHistoryEventSource = (
  value: unknown
): ImageStudioSequenceRunHistoryEventSource => {
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
  event: ImageStudioSequenceRunHistoryEventDocument | null | undefined,
  fallbackAt: string
): ImageStudioSequenceRunHistoryEvent | null => {
  if (!event) return null;
  const type =
    typeof event.type === 'string' && event.type.trim()
      ? event.type.trim()
      : 'event';
  const message =
    typeof event.message === 'string' && event.message.trim()
      ? event.message.trim()
      : '';
  const at =
    typeof event.at === 'string' && event.at.trim() ? event.at : fallbackAt;
  const payload = isRecord(event.payload) ? toJsonSafe(event.payload) : undefined;
  return {
    id:
      typeof event.id === 'string' && event.id.trim()
        ? event.id
        : createId(),
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
    source: ImageStudioSequenceRunHistoryEventSource;
    message: string;
    payload?: Record<string, unknown>;
    at?: string | null;
  },
  fallbackAt: string
): ImageStudioSequenceRunHistoryEventDocument => ({
  id: createId(),
  type: event.type.trim() || 'event',
  source: normalizeHistoryEventSource(event.source),
  message: event.message.trim(),
  at: event.at?.trim() || fallbackAt,
  ...(event.payload && isRecord(event.payload)
    ? { payload: toJsonSafe(event.payload) }
    : {}),
});

const toRecord = (
  doc: ImageStudioSequenceRunDocument
): ImageStudioSequenceRunRecord => ({
  id: doc._id,
  projectId: doc.projectId,
  sourceSlotId: doc.sourceSlotId,
  currentSlotId: doc.currentSlotId,
  status: doc.status,
  dispatchMode: doc.dispatchMode ?? null,
  request: doc.request,
  activeStepIndex:
    typeof doc.activeStepIndex === 'number' && Number.isFinite(doc.activeStepIndex)
      ? Math.max(0, Math.floor(doc.activeStepIndex))
      : null,
  activeStepId:
    typeof doc.activeStepId === 'string' && doc.activeStepId.trim()
      ? doc.activeStepId
      : null,
  outputSlotIds: Array.isArray(doc.outputSlotIds)
    ? doc.outputSlotIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [],
  runtimeMask: doc.runtimeMask ?? null,
  cancelRequested: Boolean(doc.cancelRequested),
  errorMessage: doc.errorMessage ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  startedAt: doc.startedAt ?? null,
  finishedAt: doc.finishedAt ?? null,
  historyEvents: Array.isArray(doc.historyEvents)
    ? doc.historyEvents
      .map((event) => toHistoryEvent(event, doc.updatedAt))
      .filter((event): event is ImageStudioSequenceRunHistoryEvent => Boolean(event))
    : [],
});

export async function createImageStudioSequenceRun(
  input: CreateImageStudioSequenceRunInput
): Promise<ImageStudioSequenceRunRecord> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const now = new Date().toISOString();

  const doc: ImageStudioSequenceRunDocument = {
    _id: createId(),
    projectId: input.projectId,
    sourceSlotId: input.sourceSlotId,
    currentSlotId: input.sourceSlotId,
    status: 'queued',
    dispatchMode: null,
    request: toJsonSafe(input.request),
    activeStepIndex: null,
    activeStepId: null,
    outputSlotIds: [],
    runtimeMask: input.request.mask,
    cancelRequested: false,
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
          message: 'Sequence run accepted.',
          payload: {
            projectId: input.projectId,
            sourceSlotId: input.sourceSlotId,
            stepCount: input.request.steps.length,
          },
        },
        now,
      ),
    ],
  };

  await db.collection<ImageStudioSequenceRunDocument>(COLLECTION).insertOne(doc);
  return toRecord(doc);
}

export async function getImageStudioSequenceRunById(
  runId: string
): Promise<ImageStudioSequenceRunRecord | null> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const doc = await db
    .collection<ImageStudioSequenceRunDocument>(COLLECTION)
    .findOne({ _id: runId });
  if (!doc) return null;
  return toRecord(doc);
}

export async function updateImageStudioSequenceRun(
  runId: string,
  update: UpdateImageStudioSequenceRunInput
): Promise<ImageStudioSequenceRunRecord | null> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const now = new Date().toISOString();

  const patch: Partial<ImageStudioSequenceRunDocument> = {
    updatedAt: now,
  };

  if (update.status !== undefined) patch.status = update.status;
  if (update.dispatchMode !== undefined) patch.dispatchMode = update.dispatchMode;
  if (update.currentSlotId !== undefined) patch.currentSlotId = update.currentSlotId;
  if (update.activeStepIndex !== undefined) patch.activeStepIndex = update.activeStepIndex;
  if (update.activeStepId !== undefined) patch.activeStepId = update.activeStepId;
  if (update.outputSlotIds !== undefined) patch.outputSlotIds = update.outputSlotIds;
  if (update.runtimeMask !== undefined) patch.runtimeMask = update.runtimeMask;
  if (update.cancelRequested !== undefined) patch.cancelRequested = update.cancelRequested;
  if (update.errorMessage !== undefined) patch.errorMessage = update.errorMessage;
  if (update.startedAt !== undefined) patch.startedAt = update.startedAt;
  if (update.finishedAt !== undefined) patch.finishedAt = update.finishedAt;

  const nextHistoryEvents = Array.isArray(update.appendHistoryEvents)
    ? update.appendHistoryEvents
      .map((event) => buildHistoryEventDocument(event, now))
      .filter((event): event is ImageStudioSequenceRunHistoryEventDocument => Boolean(event))
    : [];

  const collection = db.collection<ImageStudioSequenceRunDocument>(COLLECTION);
  const updateDocument: {
    $set: Partial<ImageStudioSequenceRunDocument>;
    $push?: { historyEvents: { $each: ImageStudioSequenceRunHistoryEventDocument[] } };
  } = {
    $set: patch,
  };
  if (nextHistoryEvents.length > 0) {
    updateDocument.$push = {
      historyEvents: {
        $each: nextHistoryEvents,
      },
    };
  }

  const result = await collection.findOneAndUpdate(
    { _id: runId },
    updateDocument,
    { returnDocument: 'after' }
  );

  if (!result) return null;
  return toRecord(result);
}

export async function listImageStudioSequenceRuns(
  input: ListImageStudioSequenceRunsInput = {}
): Promise<{ runs: ImageStudioSequenceRunRecord[]; total: number }> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const collection = db.collection<ImageStudioSequenceRunDocument>(COLLECTION);

  const limit = Number.isFinite(input.limit)
    ? Math.max(1, Math.min(200, Math.floor(input.limit ?? 50)))
    : 50;
  const offset = Number.isFinite(input.offset)
    ? Math.max(0, Math.floor(input.offset ?? 0))
    : 0;

  const query: Record<string, unknown> = {};
  if (input.status) query['status'] = input.status;
  if (input.projectId) query['projectId'] = input.projectId;
  if (input.sourceSlotId) query['sourceSlotId'] = input.sourceSlotId;

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
    runs: docs.map((doc) => toRecord(doc)),
    total,
  };
}

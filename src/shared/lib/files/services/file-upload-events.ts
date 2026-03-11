import 'server-only';

import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

export type FileUploadEventInput = {
  status: 'success' | 'error';
  category?: string | null | undefined;
  projectId?: string | null | undefined;
  folder?: string | null | undefined;
  filename?: string | null | undefined;
  filepath?: string | null | undefined;
  mimetype?: string | null | undefined;
  size?: number | null | undefined;
  source?: string | null | undefined;
  errorMessage?: string | null | undefined;
  requestId?: string | null | undefined;
  userId?: string | null | undefined;
  meta?: Record<string, unknown> | null | undefined;
  createdAt?: Date | undefined;
};

export type FileUploadEventRecord = {
  id: string;
  status: 'success' | 'error';
  category: string | null;
  projectId: string | null;
  folder: string | null;
  filename: string | null;
  filepath: string | null;
  mimetype: string | null;
  size: number | null;
  source: string | null;
  errorMessage: string | null;
  requestId: string | null;
  userId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
};

export type ListFileUploadEventsInput = {
  page?: number | undefined;
  pageSize?: number | undefined;
  status?: 'success' | 'error' | null | undefined;
  category?: string | null | undefined;
  projectId?: string | null | undefined;
  query?: string | null | undefined;
  from?: Date | null | undefined;
  to?: Date | null | undefined;
};

export type ListFileUploadEventsResult = {
  events: FileUploadEventRecord[];
  total: number;
  page: number;
  pageSize: number;
};

const FILE_UPLOAD_EVENTS_COLLECTION = 'file_upload_events';

type MongoFileUploadEventDoc = {
  _id?: string | ObjectId;
  id?: string;
  status?: string;
  category?: string | null;
  projectId?: string | null;
  folder?: string | null;
  filename?: string | null;
  filepath?: string | null;
  mimetype?: string | null;
  size?: number | null;
  source?: string | null;
  errorMessage?: string | null;
  requestId?: string | null;
  userId?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: Date;
};

const toMongoId = (id: string): ObjectId | string => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const normalizeRecord = (record: FileUploadEventRecord): FileUploadEventRecord => ({
  ...record,
  createdAt: record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt),
});

const toRecord = (doc: MongoFileUploadEventDoc): FileUploadEventRecord => ({
  id: String(doc.id ?? doc._id ?? ''),
  status: (doc.status as 'success' | 'error') ?? 'success',
  category: doc.category ?? null,
  projectId: doc.projectId ?? null,
  folder: doc.folder ?? null,
  filename: doc.filename ?? null,
  filepath: doc.filepath ?? null,
  mimetype: doc.mimetype ?? null,
  size: typeof doc.size === 'number' ? doc.size : null,
  source: doc.source ?? null,
  errorMessage: doc.errorMessage ?? null,
  requestId: doc.requestId ?? null,
  userId: doc.userId ?? null,
  meta: doc.meta ?? null,
  createdAt: doc.createdAt ?? new Date(),
});

const buildMongoFilter = (input: ListFileUploadEventsInput): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};
  if (input.status) filter['status'] = input.status;
  if (input.category) filter['category'] = { $regex: input.category, $options: 'i' };
  if (input.projectId) filter['projectId'] = input.projectId;
  if (input.query) {
    const regex = { $regex: input.query, $options: 'i' };
    filter['$or'] = [
      { filename: regex },
      { filepath: regex },
      { errorMessage: regex },
      { source: regex },
    ];
  }
  if (input.from || input.to) {
    filter['createdAt'] = {
      ...(input.from ? { $gte: input.from } : {}),
      ...(input.to ? { $lte: input.to } : {}),
    };
  }
  return filter;
};

export async function createFileUploadEvent(
  input: FileUploadEventInput
): Promise<FileUploadEventRecord> {
  const payload: FileUploadEventRecord = {
    id: randomUUID(),
    status: input.status,
    category: input.category ?? null,
    projectId: input.projectId ?? null,
    folder: input.folder ?? null,
    filename: input.filename ?? null,
    filepath: input.filepath ?? null,
    mimetype: input.mimetype ?? null,
    size: typeof input.size === 'number' ? input.size : null,
    source: input.source ?? null,
    errorMessage: input.errorMessage ?? null,
    requestId: input.requestId ?? null,
    userId: input.userId ?? null,
    meta: input.meta ?? null,
    createdAt: input.createdAt ?? new Date(),
  };

  const mongo = await getMongoDb();
  await mongo
    .collection<MongoFileUploadEventDoc>(FILE_UPLOAD_EVENTS_COLLECTION)
    .insertOne({ _id: toMongoId(payload.id), ...payload });
  return normalizeRecord(payload);
}

export async function listFileUploadEvents(
  input: ListFileUploadEventsInput
): Promise<ListFileUploadEventsResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, input.pageSize ?? 50));
  const mongo = await getMongoDb();
  const filter = buildMongoFilter(input);
  const total = await mongo
    .collection<MongoFileUploadEventDoc>(FILE_UPLOAD_EVENTS_COLLECTION)
    .countDocuments(filter);
  const docs = await mongo
    .collection<MongoFileUploadEventDoc>(FILE_UPLOAD_EVENTS_COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  const events = docs.map((doc: MongoFileUploadEventDoc) => normalizeRecord(toRecord(doc)));
  return { events, total, page, pageSize };
}

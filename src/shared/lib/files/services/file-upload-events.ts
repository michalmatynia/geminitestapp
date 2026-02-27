import 'server-only';

import { randomUUID } from 'crypto';

import { Prisma, type FileUploadEvent } from '@prisma/client';
import { ObjectId } from 'mongodb';

import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

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

const isMissingPrismaTable = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';

const normalizeRecord = (record: FileUploadEventRecord): FileUploadEventRecord => ({
  ...record,
  createdAt:
    record.createdAt instanceof Date
      ? record.createdAt
      : new Date(record.createdAt),
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

const buildPrismaWhere = (input: ListFileUploadEventsInput): Prisma.FileUploadEventWhereInput => {
  const where: Prisma.FileUploadEventWhereInput = {};
  if (input.status) where.status = input.status;
  if (input.category) where.category = { contains: input.category, mode: 'insensitive' };
  if (input.projectId) where.projectId = input.projectId;
  if (input.query) {
    where.OR = [
      { filename: { contains: input.query, mode: 'insensitive' } },
      { filepath: { contains: input.query, mode: 'insensitive' } },
      { errorMessage: { contains: input.query, mode: 'insensitive' } },
      { source: { contains: input.query, mode: 'insensitive' } },
    ];
  }
  if (input.from || input.to) {
    where.createdAt = {
      ...(input.from ? { gte: input.from } : {}),
      ...(input.to ? { lte: input.to } : {}),
    };
  }
  return where;
};

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
  input: FileUploadEventInput,
): Promise<FileUploadEventRecord> {
  const provider = await getAppDbProvider();
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

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    await mongo
      .collection<MongoFileUploadEventDoc>(FILE_UPLOAD_EVENTS_COLLECTION)
      .insertOne({ _id: toMongoId(payload.id), ...payload });
    return normalizeRecord(payload);
  }

  try {
    const created = await prisma.fileUploadEvent.create({
      data: {
        status: payload.status,
        ...(payload.category ? { category: payload.category } : {}),
        ...(payload.projectId ? { projectId: payload.projectId } : {}),
        ...(payload.folder ? { folder: payload.folder } : {}),
        ...(payload.filename ? { filename: payload.filename } : {}),
        ...(payload.filepath ? { filepath: payload.filepath } : {}),
        ...(payload.mimetype ? { mimetype: payload.mimetype } : {}),
        ...(payload.size !== null ? { size: payload.size } : {}),
        ...(payload.source ? { source: payload.source } : {}),
        ...(payload.errorMessage ? { errorMessage: payload.errorMessage } : {}),
        ...(payload.requestId ? { requestId: payload.requestId } : {}),
        ...(payload.userId ? { userId: payload.userId } : {}),
        ...(payload.meta ? { meta: payload.meta as Prisma.InputJsonValue } : {}),
        createdAt: payload.createdAt,
      },
    });

    return normalizeRecord({
      id: created.id,
      status: created.status as 'success' | 'error',
      category: created.category ?? null,
      projectId: created.projectId ?? null,
      folder: created.folder ?? null,
      filename: created.filename ?? null,
      filepath: created.filepath ?? null,
      mimetype: created.mimetype ?? null,
      size: typeof created.size === 'number' ? created.size : null,
      source: created.source ?? null,
      errorMessage: created.errorMessage ?? null,
      requestId: created.requestId ?? null,
      userId: created.userId ?? null,
      meta: (created.meta as Record<string, unknown> | null) ?? null,
      createdAt: created.createdAt,
    });
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env['MONGODB_URI']) {
      const mongo = await getMongoDb();
      await mongo
        .collection<MongoFileUploadEventDoc>(FILE_UPLOAD_EVENTS_COLLECTION)
        .insertOne({ _id: toMongoId(payload.id), ...payload });
      return normalizeRecord(payload);
    }
    throw error;
  }
}

export async function listFileUploadEvents(
  input: ListFileUploadEventsInput,
): Promise<ListFileUploadEventsResult> {
  const provider = await getAppDbProvider();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, input.pageSize ?? 50));

  if (provider === 'mongodb') {
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

  try {
    const where = buildPrismaWhere(input);
    const [total, rows] = await Promise.all([
      prisma.fileUploadEvent.count({ where }),
      prisma.fileUploadEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const events = rows.map((row: FileUploadEvent) =>
      normalizeRecord({
        id: row.id,
        status: row.status as 'success' | 'error',
        category: row.category ?? null,
        projectId: row.projectId ?? null,
        folder: row.folder ?? null,
        filename: row.filename ?? null,
        filepath: row.filepath ?? null,
        mimetype: row.mimetype ?? null,
        size: typeof row.size === 'number' ? row.size : null,
        source: row.source ?? null,
        errorMessage: row.errorMessage ?? null,
        requestId: row.requestId ?? null,
        userId: row.userId ?? null,
        meta: (row.meta as Record<string, unknown> | null) ?? null,
        createdAt: row.createdAt,
      }),
    );

    return { events, total, page, pageSize };
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env['MONGODB_URI']) {
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
    throw error;
  }
}

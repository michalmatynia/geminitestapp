import { randomUUID } from "crypto";
import type { Filter, Document, ObjectId } from "mongodb";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getProductDataProvider } from "@/lib/services/product-provider";
import type { SystemLogLevel, SystemLogRecord } from "@/types";

export type CreateSystemLogInput = {
  level?: SystemLogLevel | undefined;
  message: string;
  source?: string | null | undefined;
  context?: Record<string, unknown> | null | undefined;
  stack?: string | null | undefined;
  path?: string | null | undefined;
  method?: string | null | undefined;
  statusCode?: number | null | undefined;
  requestId?: string | null | undefined;
  userId?: string | null | undefined;
  createdAt?: Date | undefined;
};

export type ListSystemLogsInput = {
  page?: number | undefined;
  pageSize?: number | undefined;
  level?: SystemLogLevel | null | undefined;
  source?: string | null | undefined;
  query?: string | null | undefined;
  from?: Date | null | undefined;
  to?: Date | null | undefined;
};

export type ListSystemLogsResult = {
  logs: SystemLogRecord[];
  total: number;
  page: number;
  pageSize: number;
};

const SYSTEM_LOGS_COLLECTION = "system_logs";

const isMissingPrismaTable = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";

const normalizeLogRecord = (record: SystemLogRecord): SystemLogRecord => ({
  ...record,
  createdAt: record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt),
});

const toSystemLogRecord = (doc: {
  _id?: string | ObjectId;
  id?: string;
  level?: string;
  message?: string;
  source?: string | null;
  context?: Record<string, unknown> | null;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  userId?: string | null;
  createdAt?: Date;
}): SystemLogRecord => ({
  id: String(doc.id ?? doc._id ?? ""),
  level: (doc.level as SystemLogLevel) ?? "error",
  message: doc.message ?? "",
  source: doc.source ?? null,
  context: doc.context ?? null,
  stack: doc.stack ?? null,
  path: doc.path ?? null,
  method: doc.method ?? null,
  statusCode: doc.statusCode ?? null,
  requestId: doc.requestId ?? null,
  userId: doc.userId ?? null,
  createdAt: doc.createdAt ?? new Date(),
});

const buildMongoFilter = (input: ListSystemLogsInput): Filter<Document> => {
  const filter: Filter<Document> = {};
  if (input.level) {
    filter.level = input.level;
  }
  if (input.source) {
    filter.source = { $regex: input.source, $options: "i" } as any;
  }
  if (input.query) {
    filter.$or = [
      { message: { $regex: input.query, $options: "i" } },
      { source: { $regex: input.query, $options: "i" } },
    ];
  }
  if (input.from || input.to) {
    filter.createdAt = {
      ...(input.from ? { $gte: input.from } : {}),
      ...(input.to ? { $lte: input.to } : {}),
    } as any;
  }
  return filter;
};

export async function createSystemLog(
  input: CreateSystemLogInput
): Promise<SystemLogRecord> {
  const provider = await getProductDataProvider();
  const payload = {
    id: randomUUID(),
    level: input.level ?? "error",
    message: input.message,
    source: input.source ?? null,
    context: input.context ?? null,
    stack: input.stack ?? null,
    path: input.path ?? null,
    method: input.method ?? null,
    statusCode: input.statusCode ?? null,
    requestId: input.requestId ?? null,
    userId: input.userId ?? null,
    createdAt: input.createdAt ?? new Date(),
  };

  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    await mongo.collection(SYSTEM_LOGS_COLLECTION).insertOne({
      _id: payload.id as any,
      ...payload,
    });
    return normalizeLogRecord(payload);
  }

  try {
    const created = await prisma.systemLog.create({
      data: {
        level: payload.level,
        message: payload.message,
        ...(payload.source !== null && payload.source !== undefined ? { source: payload.source } : {}),
        ...(payload.context !== null && payload.context !== undefined ? { context: payload.context as any } : {}),
        ...(payload.stack !== null && payload.stack !== undefined ? { stack: payload.stack } : {}),
        ...(payload.path !== null && payload.path !== undefined ? { path: payload.path } : {}),
        ...(payload.method !== null && payload.method !== undefined ? { method: payload.method } : {}),
        ...(payload.statusCode !== null && payload.statusCode !== undefined ? { statusCode: payload.statusCode } : {}),
        ...(payload.requestId !== null && payload.requestId !== undefined ? { requestId: payload.requestId } : {}),
        ...(payload.userId !== null && payload.userId !== undefined ? { userId: payload.userId } : {}),
        createdAt: payload.createdAt,
      },
    });

    return normalizeLogRecord({
      ...created,
      level: created.level as SystemLogLevel,
      context: (created.context as Record<string, unknown> | null) ?? null,
      createdAt: created.createdAt,
    });
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env.MONGODB_URI) {
      const mongo = await getMongoDb();
      await mongo.collection(SYSTEM_LOGS_COLLECTION).insertOne({
        _id: payload.id as any,
        ...payload,
      });
      return normalizeLogRecord(payload);
    }
    throw error;
  }
}

export async function listSystemLogs(
  input: ListSystemLogsInput
): Promise<ListSystemLogsResult> {
  const provider = await getProductDataProvider();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, input.pageSize ?? 50));

  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const filter = buildMongoFilter(input);
    const total = await mongo
      .collection(SYSTEM_LOGS_COLLECTION)
      .countDocuments(filter);
    const docs = await mongo
      .collection(SYSTEM_LOGS_COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();
    const logs = docs.map((doc) => normalizeLogRecord(toSystemLogRecord(doc as any)));
    return { logs, total, page, pageSize };
  }

  const where: any = {};
  if (input.level) {
    where.level = input.level;
  }
  if (input.source) {
    where.source = { contains: input.source, mode: "insensitive" };
  }
  if (input.query) {
    where.OR = [
      { message: { contains: input.query, mode: "insensitive" } },
      { source: { contains: input.query, mode: "insensitive" } },
    ];
  }
  if (input.from || input.to) {
    where.createdAt = {
      ...(input.from ? { gte: input.from } : {}),
      ...(input.to ? { lte: input.to } : {}),
    };
  }

  try {
    const [total, rows] = await Promise.all([
      prisma.systemLog.count({ where }),
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const logs = rows.map((row: any) =>
      normalizeLogRecord({
        ...row,
        context: (row.context as Record<string, unknown> | null) ?? null,
      })
    );

    return { logs, total, page, pageSize };
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env.MONGODB_URI) {
      const mongo = await getMongoDb();
      const filter = buildMongoFilter(input);
      const total = await mongo
        .collection(SYSTEM_LOGS_COLLECTION)
        .countDocuments(filter);
      const docs = await mongo
        .collection(SYSTEM_LOGS_COLLECTION)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
      const logs = docs.map((doc) =>
        normalizeLogRecord(toSystemLogRecord(doc as any))
      );
      return { logs, total, page, pageSize };
    }
    throw error;
  }
}

export async function clearSystemLogs(before?: Date | null) {
  const provider = await getProductDataProvider();
  if (provider === "mongodb") {
    const mongo = await getMongoDb();
    const filter = before ? { createdAt: { $lte: before } } : {};
    const result = await mongo
      .collection(SYSTEM_LOGS_COLLECTION)
      .deleteMany(filter);
    return { deleted: result.deletedCount ?? 0 };
  }

  const where = before ? { createdAt: { lte: before } } : {};
  try {
    const result = await prisma.systemLog.deleteMany({ where });
    return { deleted: result.count };
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env.MONGODB_URI) {
      const mongo = await getMongoDb();
      const filter = before ? { createdAt: { $lte: before } } : {};
      const result = await mongo
        .collection(SYSTEM_LOGS_COLLECTION)
        .deleteMany(filter);
      return { deleted: result.deletedCount ?? 0 };
    }
    throw error;
  }
}

import { randomUUID } from "crypto";
import type { Filter, ObjectId } from "mongodb";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getProductDataProvider } from "@/features/products/services/product-provider";
import type { SystemLogLevel, SystemLogMetrics, SystemLogRecord } from "@/types";

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

type MongoSystemLogDoc = {
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
};

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

const buildPrismaWhere = (input: ListSystemLogsInput): Prisma.SystemLogWhereInput => {
  const where: Prisma.SystemLogWhereInput = {};
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
  return where;
};

const mergeWhere = (base: Prisma.SystemLogWhereInput, extra: Prisma.SystemLogWhereInput): Prisma.SystemLogWhereInput => {
  if (!base || Object.keys(base).length === 0) {
    return extra;
  }
  return { AND: [base, extra] };
};

const buildMongoFilter = (input: ListSystemLogsInput): Filter<MongoSystemLogDoc> => {
  const filter: Filter<MongoSystemLogDoc> = {};
  if (input.level) {
    filter.level = input.level;
  }
  if (input.source) {
    filter.source = { $regex: input.source, $options: "i" };
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
    };
  }
  return filter;
};

const getMongoSystemLogMetrics = async (filter: Filter<MongoSystemLogDoc>): Promise<SystemLogMetrics> => {
  const mongo = await getMongoDb();
  const now = new Date();
  const last24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const result = await mongo
    .collection(SYSTEM_LOGS_COLLECTION)
    .aggregate([
      { $match: filter },
      {
        $facet: {
          totals: [{ $count: "count" }],
          levels: [
            { $group: { _id: "$level", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          sources: [
            { $match: { source: { $nin: [null, ""] } } },
            { $group: { _id: "$source", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ],
          paths: [
            { $match: { path: { $nin: [null, ""] } } },
            { $group: { _id: "$path", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ],
          last24Hours: [
            { $match: { createdAt: { $gte: last24 } } },
            { $count: "count" },
          ],
          last7Days: [
            { $match: { createdAt: { $gte: last7 } } },
            { $count: "count" },
          ],
        },
      },
    ])
    .toArray() as unknown as [
      {
        totals: { count: number }[];
        levels: { _id: string; count: number }[];
        sources: { _id: string; count: number }[];
        paths: { _id: string; count: number }[];
        last24Hours: { count: number }[];
        last7Days: { count: number }[];
      },
    ];

  const first = result[0];
  if (!first) {
    return {
      total: 0,
      levels: { info: 0, warn: 0, error: 0 },
      last24Hours: 0,
      last7Days: 0,
      topSources: [],
      topPaths: [],
      generatedAt: now,
    };
  }

  const total = first.totals[0]?.count ?? 0;
  const levels = { info: 0, warn: 0, error: 0 } as Record<SystemLogLevel, number>;
  for (const row of first.levels) {
    const key = row._id as SystemLogLevel;
    if (key && key in levels) {
      levels[key] = row.count;
    }
  }
  const topSources = first.sources.map((row) => ({
    source: String(row._id ?? ""),
    count: row.count,
  }));
  const topPaths = first.paths.map((row) => ({
    path: String(row._id ?? ""),
    count: row.count,
  }));
  const last24Hours = first.last24Hours[0]?.count ?? 0;
  const last7Days = first.last7Days[0]?.count ?? 0;

  return {
    total,
    levels,
    last24Hours,
    last7Days,
    topSources,
    topPaths,
    generatedAt: now,
  };
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
      _id: payload.id,
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
        ...(payload.context !== null && payload.context !== undefined ? { context: payload.context as Prisma.InputJsonValue } : {}),
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
        _id: payload.id,
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
      .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
      .countDocuments(filter);
    const docs = await mongo
      .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();
    const logs = docs.map((doc) => normalizeLogRecord(toSystemLogRecord(doc)));
    return { logs, total, page, pageSize };
  }

  const where = buildPrismaWhere(input);

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

    const logs = rows.map((row) =>
      normalizeLogRecord({
        ...row,
        level: row.level as SystemLogLevel,
        context: (row.context as Record<string, unknown> | null) ?? null,
      })
    );

    return { logs, total, page, pageSize };
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env.MONGODB_URI) {
      const mongo = await getMongoDb();
      const filter = buildMongoFilter(input);
      const total = await mongo
        .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
        .countDocuments(filter);
      const docs = await mongo
        .collection<MongoSystemLogDoc>(SYSTEM_LOGS_COLLECTION)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();
      const logs = docs.map((doc) =>
        normalizeLogRecord(toSystemLogRecord(doc))
      );
      return { logs, total, page, pageSize };
    }
    throw error;
  }
}

export async function getSystemLogMetrics(
  input: ListSystemLogsInput
): Promise<SystemLogMetrics> {
  const provider = await getProductDataProvider();
  const now = new Date();

  if (provider === "mongodb") {
    const filter = buildMongoFilter(input);
    return getMongoSystemLogMetrics(filter);
  }

  const where = buildPrismaWhere(input);
  const last24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [
      total,
      last24Hours,
      last7Days,
      levelGroups,
      sourceGroups,
      pathGroups,
    ] = await Promise.all([
      prisma.systemLog.count({ where }),
      prisma.systemLog.count({
        where: mergeWhere(where, { createdAt: { gte: last24 } }),
      }),
      prisma.systemLog.count({
        where: mergeWhere(where, { createdAt: { gte: last7 } }),
      }),
      prisma.systemLog.groupBy({
        by: ["level"],
        _count: { _all: true },
        where,
      }),
      prisma.systemLog.groupBy({
        by: ["source"],
        _count: { _all: true },
        where: mergeWhere(where, {
          AND: [{ source: { not: null } }, { source: { not: "" } }],
        }),
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      prisma.systemLog.groupBy({
        by: ["path"],
        _count: { _all: true },
        where: mergeWhere(where, {
          AND: [{ path: { not: null } }, { path: { not: "" } }],
        }),
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    const levels = { info: 0, warn: 0, error: 0 } as Record<SystemLogLevel, number>;
    for (const row of levelGroups as Array<{ level: SystemLogLevel; _count: { _all: number } }>) {
      if (row.level in levels) {
        levels[row.level] = row._count._all ?? 0;
      }
    }

    const topSources = (sourceGroups as Array<{ source: string | null; _count: { _all: number } }>)
      .filter((row) => row.source)
      .map((row) => ({ source: row.source as string, count: row._count._all ?? 0 }));
    const topPaths = (pathGroups as Array<{ path: string | null; _count: { _all: number } }>)
      .filter((row) => row.path)
      .map((row) => ({ path: row.path as string, count: row._count._all ?? 0 }));

    return {
      total,
      levels,
      last24Hours,
      last7Days,
      topSources,
      topPaths,
      generatedAt: now,
    };
  } catch (error) {
    if (isMissingPrismaTable(error) && process.env.MONGODB_URI) {
      const filter = buildMongoFilter(input);
      return getMongoSystemLogMetrics(filter);
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

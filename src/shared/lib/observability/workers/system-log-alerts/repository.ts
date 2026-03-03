import { Prisma } from '@prisma/client';
import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { type AlertEvidenceQuery, type MongoSystemLogDoc } from './types';

export const escapeRegex = (value: string): string => value.replace(new RegExp('[.*+?^${}()|[\\]\\\\]', 'g'), '\\$&');

export const toSystemLogRecord = (doc: MongoSystemLogDoc): SystemLogRecord => ({
  id: String(doc.id ?? doc._id ?? ''),
  level: doc.level === 'warn' || doc.level === 'info' || doc.level === 'error' ? doc.level : 'error',
  message: doc.message ?? '',
  category: doc.category ?? null,
  source: doc.source ?? null,
  service:
    (typeof doc.service === 'string' && doc.service.trim().length > 0
      ? doc.service
      : (doc.context?.['service'] as string | undefined)) ?? null,
  context: doc.context ?? null,
  stack: doc.stack ?? null,
  path: doc.path ?? null,
  method: doc.method ?? null,
  statusCode: doc.statusCode ?? null,
  requestId: doc.requestId ?? null,
  traceId:
    (typeof doc.traceId === 'string' && doc.traceId.trim().length > 0
      ? doc.traceId
      : (doc.context?.['traceId'] as string | undefined)) ?? null,
  correlationId:
    (typeof doc.correlationId === 'string' && doc.correlationId.trim().length > 0
      ? doc.correlationId
      : (doc.context?.['correlationId'] as string | undefined)) ?? null,
  spanId:
    (typeof doc.spanId === 'string' && doc.spanId.trim().length > 0
      ? doc.spanId
      : (doc.context?.['spanId'] as string | undefined)) ?? null,
  parentSpanId:
    (typeof doc.parentSpanId === 'string' && doc.parentSpanId.trim().length > 0
      ? doc.parentSpanId
      : (doc.context?.['parentSpanId'] as string | undefined)) ?? null,
  userId: doc.userId ?? null,
  createdAt: (doc.createdAt ?? new Date()).toISOString(),
  updatedAt: null,
});

export const toPrismaWhere = (query: AlertEvidenceQuery): Prisma.SystemLogWhereInput => {
  const where: Prisma.SystemLogWhereInput = {};

  if (query.level) where.level = query.level;
  if (query.sourceContains) {
    where.source = { contains: query.sourceContains, mode: 'insensitive' };
  }
  if (query.service) {
    where.OR = [
      { service: { equals: query.service, mode: 'insensitive' } },
      {
        context: {
          path: ['service'],
          equals: query.service,
        },
      },
    ];
  }
  if (query.pathPrefix) {
    where.path = { startsWith: query.pathPrefix, mode: 'insensitive' };
  }
  if (query.statusCodeMin !== undefined || query.statusCodeMax !== undefined) {
    where.statusCode = {
      ...(query.statusCodeMin !== undefined ? { gte: query.statusCodeMin } : {}),
      ...(query.statusCodeMax !== undefined ? { lte: query.statusCodeMax } : {}),
    };
  }
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }

  return where;
};

export const toMongoWhere = (query: AlertEvidenceQuery): Record<string, unknown> => {
  const where: Record<string, unknown> = {};

  if (query.level) where['level'] = query.level;
  if (query.sourceContains) {
    where['source'] = { $regex: escapeRegex(query.sourceContains), $options: 'i' };
  }
  if (query.service) {
    where['$or'] = [
      { service: { $regex: `^${escapeRegex(query.service)}$`, $options: 'i' } },
      { 'context.service': query.service },
    ];
  }
  if (query.pathPrefix) {
    where['path'] = { $regex: `^${escapeRegex(query.pathPrefix)}`, $options: 'i' };
  }
  if (query.statusCodeMin !== undefined || query.statusCodeMax !== undefined) {
    where['statusCode'] = {
      ...(query.statusCodeMin !== undefined ? { $gte: query.statusCodeMin } : {}),
      ...(query.statusCodeMax !== undefined ? { $lte: query.statusCodeMax } : {}),
    };
  }
  if (query.from || query.to) {
    where['createdAt'] = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  return where;
};

export const listAlertEvidenceLogs = async (
  provider: 'mongodb' | 'prisma',
  query: AlertEvidenceQuery,
  defaultLimit: number
): Promise<SystemLogRecord[]> => {
  const limit = Math.max(1, query.limit ?? defaultLimit);

  if (provider === 'mongodb') {
    const mongo = await getMongoDb();
    const docs = await mongo
      .collection<MongoSystemLogDoc>('system_logs')
      .find(toMongoWhere(query))
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(toSystemLogRecord);
  }

  const rows = await prisma.systemLog.findMany({
    where: toPrismaWhere(query),
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    level: (row.level === 'warn' || row.level === 'info' || row.level === 'error'
      ? row.level
      : 'error'),
    message: row.message,
    category: row.category ?? null,
    source: row.source ?? null,
    context: (row.context as Record<string, unknown> | null) ?? null,
    stack: row.stack ?? null,
    path: row.path ?? null,
    method: row.method ?? null,
    statusCode: row.statusCode ?? null,
    requestId: row.requestId ?? null,
    userId: row.userId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: null,
  }));
};

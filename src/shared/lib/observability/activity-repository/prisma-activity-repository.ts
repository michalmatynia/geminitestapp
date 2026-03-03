import { randomUUID } from 'crypto';

import { Prisma, type SystemLog } from '@prisma/client';

import type { ActivityRepository, ActivityFilters } from '@/shared/contracts/system';
import type { ActivityLog, CreateActivityLog } from '@/shared/contracts/system';
import prisma from '@/shared/lib/db/prisma';

const ACTIVITY_SOURCE = 'activity';
const isMissingSystemLogStorage = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  return null;
};

const toActivityDto = (log: SystemLog): ActivityLog => {
  const context = toRecord(log.context) ?? {};
  const rawMetadata = toRecord(context['metadata']);

  return {
    id: log.id,
    type: log.category ?? 'activity.unknown',
    description: log.message,
    userId: log.userId ?? null,
    entityId: toNullableString(context['entityId']),
    entityType: toNullableString(context['entityType']),
    metadata: rawMetadata,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.createdAt.toISOString(),
  };
};

const matchesEntityFilters = (
  contextValue: Prisma.JsonValue | null,
  filters: ActivityFilters
): boolean => {
  if (!filters.entityId && !filters.entityType) return true;
  const context = toRecord(contextValue) ?? {};
  if (filters.entityId && toNullableString(context['entityId']) !== filters.entityId) return false;
  if (filters.entityType && toNullableString(context['entityType']) !== filters.entityType)
    return false;
  return true;
};

export const prismaActivityRepository: ActivityRepository = {
  async listActivity(filters: ActivityFilters): Promise<ActivityLog[]> {
    const where: Prisma.SystemLogWhereInput = {
      source: ACTIVITY_SOURCE,
    };

    if (filters.userId) where.userId = filters.userId;
    if (filters.type) where.category = filters.type;
    if (filters.search) {
      where.message = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters.entityId || filters.entityType) {
      const logs = await prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return logs
        .filter((log) => matchesEntityFilters(log.context, filters))
        .slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50))
        .map(toActivityDto);
    }

    const logs = await prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    });

    return logs.map(toActivityDto);
  },

  async countActivity(filters: ActivityFilters): Promise<number> {
    const where: Prisma.SystemLogWhereInput = {
      source: ACTIVITY_SOURCE,
    };

    if (filters.userId) where.userId = filters.userId;
    if (filters.type) where.category = filters.type;
    if (filters.search) {
      where.message = { contains: filters.search, mode: 'insensitive' };
    }

    if (filters.entityId || filters.entityType) {
      const logs = await prisma.systemLog.findMany({ where, select: { context: true } });
      return logs.filter((log) => matchesEntityFilters(log.context, filters)).length;
    }

    return prisma.systemLog.count({ where });
  },

  async createActivity(data: CreateActivityLog): Promise<ActivityLog> {
    try {
      const log = await prisma.systemLog.create({
        data: {
          level: 'info',
          message: data.description,
          category: data.type,
          source: ACTIVITY_SOURCE,
          userId: data.userId ?? null,
          context: {
            entityId: data.entityId ?? null,
            entityType: data.entityType ?? null,
            metadata: (data.metadata ?? null) as Prisma.InputJsonValue | null,
          } as Prisma.InputJsonValue,
        },
      });
      return toActivityDto(log);
    } catch (error) {
      if (!isMissingSystemLogStorage(error)) {
        throw error;
      }
      const nowIso = new Date().toISOString();
      return {
        id: `activity-fallback-${randomUUID()}`,
        type: data.type,
        description: data.description,
        userId: data.userId ?? null,
        entityId: data.entityId ?? null,
        entityType: data.entityType ?? null,
        metadata: (data.metadata) ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }
  },

  async deleteActivity(id: string): Promise<void> {
    await prisma.systemLog.delete({ where: { id } });
  },
};

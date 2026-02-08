import { Prisma } from '@prisma/client';

import type { ActivityRepository, ActivityFilters } from '@/features/observability/types/services/activity-repository';
import type { ActivityLogDto, CreateActivityLogDto } from '@/shared/dtos/system';
import prisma from '@/shared/lib/db/prisma';

const toActivityDto = (log: any): ActivityLogDto => ({
  id: log.id,
  type: log.type,
  description: log.description,
  userId: log.userId ?? null,
  entityId: log.entityId ?? null,
  entityType: log.entityType ?? null,
  metadata: log.metadata as Record<string, unknown> | null,
  createdAt: log.createdAt.toISOString(),
});

export const prismaActivityRepository: ActivityRepository = {
  async listActivity(filters: ActivityFilters): Promise<ActivityLogDto[]> {
    const where: Prisma.ActivityLogWhereInput = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.type) where.type = filters.type;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.search) {
      where.description = { contains: filters.search, mode: 'insensitive' };
    }

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    });

    return logs.map(toActivityDto);
  },

  async countActivity(filters: ActivityFilters): Promise<number> {
    const where: Prisma.ActivityLogWhereInput = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.type) where.type = filters.type;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.search) {
      where.description = { contains: filters.search, mode: 'insensitive' };
    }

    return prisma.activityLog.count({ where });
  },

  async createActivity(data: CreateActivityLogDto): Promise<ActivityLogDto> {
    const log = await prisma.activityLog.create({
      data: {
        type: data.type,
        description: data.description,
        userId: data.userId,
        entityId: data.entityId,
        entityType: data.entityType,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
    return toActivityDto(log);
  },

  async deleteActivity(id: string): Promise<void> {
    await prisma.activityLog.delete({ where: { id } });
  },
};

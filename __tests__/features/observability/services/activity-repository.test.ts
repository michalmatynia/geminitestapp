import { describe, it, expect, vi, beforeEach } from 'vitest';

import { prismaActivityRepository } from '@/shared/lib/observability/activity-repository/prisma-activity-repository';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    systemLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('prismaActivityRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list activity logs', async () => {
    const mockLogs = [
      {
        id: '1',
        level: 'info',
        message: 'desc',
        category: 'test',
        source: 'activity',
        userId: 'u1',
        context: {
          entityId: 'e1',
          entityType: 'type',
          metadata: {},
        },
        createdAt: new Date(),
      },
    ];
    (prisma.systemLog.findMany as any).mockResolvedValue(mockLogs);

    const result = await prismaActivityRepository.listActivity({ limit: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('1');
    expect(prisma.systemLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 10,
    }));
  });

  it('should create an activity log', async () => {
    const mockLog = {
      id: '1',
      level: 'info',
      message: 'desc',
      category: 'test',
      source: 'activity',
      userId: 'u1',
      context: {
        entityId: 'e1',
        entityType: 'type',
        metadata: { foo: 'bar' },
      },
      createdAt: new Date(),
    };
    (prisma.systemLog.create as any).mockResolvedValue(mockLog);

    const result = await prismaActivityRepository.createActivity({
      type: 'test',
      description: 'desc',
      userId: 'u1',
      entityId: 'e1',
      entityType: 'type',
      metadata: { foo: 'bar' },
    });

    expect(result.id).toBe('1');
    expect(prisma.systemLog.create).toHaveBeenCalledWith({
      data: {
        level: 'info',
        message: 'desc',
        category: 'test',
        source: 'activity',
        userId: 'u1',
        context: {
          entityId: 'e1',
          entityType: 'type',
          metadata: { foo: 'bar' },
        },
      },
    });
  });
});

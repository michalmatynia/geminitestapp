import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getCategoryMappingRepository } from '@/features/integrations/services/category-mapping-repository';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    categoryMapping: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

describe('CategoryMappingRepository', () => {
  const repo = getCategoryMappingRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMapping = {
    id: 'map-1',
    connectionId: 'conn-1',
    externalCategoryId: 'ext-1',
    internalCategoryId: 'int-1',
    catalogId: 'cat-1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('creates a mapping', async () => {
    (prisma.categoryMapping.create as any).mockResolvedValue(mockMapping);
    const input = {
      connectionId: 'conn-1',
      externalCategoryId: 'ext-1',
      internalCategoryId: 'int-1',
      catalogId: 'cat-1',
    };

    const result = await repo.create(input);
    expect(result.id).toBe('map-1');
    expect(prisma.categoryMapping.create).toHaveBeenCalled();
  });

  it('updates a mapping', async () => {
    (prisma.categoryMapping.update as any).mockResolvedValue({ ...mockMapping, internalCategoryId: 'int-2' });
    const result = await repo.update('map-1', { internalCategoryId: 'int-2' });
    expect(result.internalCategoryId).toBe('int-2');
    expect(prisma.categoryMapping.update).toHaveBeenCalledWith({
      where: { id: 'map-1' },
      data: { internalCategoryId: 'int-2' },
    });
  });

  it('deletes a mapping', async () => {
    await repo.delete('map-1');
    expect(prisma.categoryMapping.delete).toHaveBeenCalledWith({ where: { id: 'map-1' } });
  });

  it('gets by id', async () => {
    (prisma.categoryMapping.findUnique as any).mockResolvedValue(mockMapping);
    const result = await repo.getById('map-1');
    expect(result?.id).toBe('map-1');
  });

  it('lists by connection', async () => {
    const mockWithDetails = {
      ...mockMapping,
      externalCategory: { id: 'ext-1', connectionId: 'conn-1', externalId: 'e1', name: 'Ext' },
      internalCategory: { id: 'int-1', name: 'Int' },
    };
    (prisma.categoryMapping.findMany as any).mockResolvedValue([mockWithDetails]);
    
    const result = await repo.listByConnection('conn-1');
    expect(result.length).toBe(1);
    expect(result[0]!.externalCategory.name).toBe('Ext');
  });

  it('bulk upserts mappings', async () => {
    const mappings = [
      { externalCategoryId: 'ext-1', internalCategoryId: 'int-1' },
      { externalCategoryId: 'ext-2', internalCategoryId: 'int-2' },
    ];
    
    const count = await repo.bulkUpsert('conn-1', 'cat-1', mappings);
    expect(count).toBe(2);
    expect(prisma.categoryMapping.upsert).toHaveBeenCalledTimes(2);
  });
});

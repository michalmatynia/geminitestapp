import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getById: vi.fn(),
  listByConnection: vi.fn(),
  getByExternalCategory: vi.fn(),
  bulkUpsert: vi.fn(),
  deleteByConnection: vi.fn(),
}));

vi.mock('@/features/integrations/services/category-mapping/mongo-impl', () => ({
  mongoCategoryMappingImpl: {
    create: mocks.create,
    update: mocks.update,
    delete: mocks.delete,
    getById: mocks.getById,
    listByConnection: mocks.listByConnection,
    getByExternalCategory: mocks.getByExternalCategory,
    bulkUpsert: mocks.bulkUpsert,
    deleteByConnection: mocks.deleteByConnection,
  },
}));

import {
  categoryMappingRepository,
  getCategoryMappingRepository,
} from '@/features/integrations/services/category-mapping-repository';

describe('categoryMappingRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards create to the Mongo implementation', async () => {
    const record = {
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalCategoryId: 'ext-1',
      internalCategoryId: 'int-1',
      catalogId: 'catalog-1',
      isActive: true,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    };
    mocks.create.mockResolvedValue(record);

    await expect(
      categoryMappingRepository.create({
        connectionId: 'conn-1',
        externalCategoryId: 'ext-1',
        internalCategoryId: 'int-1',
        catalogId: 'catalog-1',
      })
    ).resolves.toEqual(record);
    expect(mocks.create).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      externalCategoryId: 'ext-1',
      internalCategoryId: 'int-1',
      catalogId: 'catalog-1',
    });
  });

  it('forwards update to the Mongo implementation', async () => {
    const record = { id: 'mapping-1', isActive: false };
    mocks.update.mockResolvedValue(record);

    await expect(categoryMappingRepository.update('mapping-1', { isActive: false })).resolves.toEqual(
      record
    );
    expect(mocks.update).toHaveBeenCalledWith('mapping-1', { isActive: false });
  });

  it('forwards delete to the Mongo implementation', async () => {
    mocks.delete.mockResolvedValue(undefined);

    await expect(categoryMappingRepository.delete('mapping-1')).resolves.toBeUndefined();
    expect(mocks.delete).toHaveBeenCalledWith('mapping-1');
  });

  it('forwards getById to the Mongo implementation', async () => {
    const record = { id: 'mapping-1' };
    mocks.getById.mockResolvedValue(record);

    await expect(categoryMappingRepository.getById('mapping-1')).resolves.toEqual(record);
    expect(mocks.getById).toHaveBeenCalledWith('mapping-1');
  });

  it('forwards listByConnection to the Mongo implementation', async () => {
    const list = [{ id: 'mapping-1' }];
    mocks.listByConnection.mockResolvedValue(list);

    await expect(categoryMappingRepository.listByConnection('conn-1', 'catalog-1')).resolves.toEqual(
      list
    );
    expect(mocks.listByConnection).toHaveBeenCalledWith('conn-1', 'catalog-1');
  });

  it('forwards getByExternalCategory to the Mongo implementation', async () => {
    const record = { id: 'mapping-1' };
    mocks.getByExternalCategory.mockResolvedValue(record);

    await expect(
      categoryMappingRepository.getByExternalCategory('conn-1', 'ext-1', 'catalog-1')
    ).resolves.toEqual(record);
    expect(mocks.getByExternalCategory).toHaveBeenCalledWith('conn-1', 'ext-1', 'catalog-1');
  });

  it('forwards bulkUpsert to the Mongo implementation', async () => {
    mocks.bulkUpsert.mockResolvedValue(2);

    await expect(
      categoryMappingRepository.bulkUpsert('conn-1', 'catalog-1', [
        { externalCategoryId: 'ext-1', internalCategoryId: 'int-1' },
        { externalCategoryId: 'ext-2', internalCategoryId: 'int-2' },
      ])
    ).resolves.toBe(2);
    expect(mocks.bulkUpsert).toHaveBeenCalledWith('conn-1', 'catalog-1', [
      { externalCategoryId: 'ext-1', internalCategoryId: 'int-1' },
      { externalCategoryId: 'ext-2', internalCategoryId: 'int-2' },
    ]);
  });

  it('forwards deleteByConnection to the Mongo implementation', async () => {
    mocks.deleteByConnection.mockResolvedValue(3);

    await expect(categoryMappingRepository.deleteByConnection('conn-1')).resolves.toBe(3);
    expect(mocks.deleteByConnection).toHaveBeenCalledWith('conn-1');
  });

  it('returns the canonical repository singleton', () => {
    expect(getCategoryMappingRepository()).toBe(categoryMappingRepository);
  });
});

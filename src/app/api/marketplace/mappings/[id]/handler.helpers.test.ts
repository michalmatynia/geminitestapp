import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategoryMappingRepository } from '@/shared/contracts/integrations';

import {
  buildCategoryMappingUpdatePayload,
  deleteCategoryMappingById,
  requireCategoryMappingById,
  updateCategoryMappingById,
} from './handler.helpers';

type CategoryMappingByIdRepository = Pick<CategoryMappingRepository, 'getById' | 'update' | 'delete'>;

describe('marketplace mapping by-id helpers', () => {
  let repo: CategoryMappingByIdRepository;

  beforeEach(() => {
    repo = {
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
  });

  it('requires an existing mapping by id', async () => {
    vi.mocked(repo.getById).mockResolvedValueOnce({
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalCategoryId: 'external-1',
      internalCategoryId: 'internal-1',
      catalogId: 'catalog-1',
      isActive: true,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    } as never);

    await expect(requireCategoryMappingById(repo, 'mapping-1')).resolves.toMatchObject({
      id: 'mapping-1',
    });

    vi.mocked(repo.getById).mockResolvedValueOnce(null);
    await expect(requireCategoryMappingById(repo, 'missing')).rejects.toThrow('Mapping not found');
  });

  it('builds update payloads with only defined fields', () => {
    expect(
      buildCategoryMappingUpdatePayload({
        internalCategoryId: 'internal-2',
      })
    ).toEqual({
      internalCategoryId: 'internal-2',
    });
    expect(
      buildCategoryMappingUpdatePayload({
        isActive: false,
      })
    ).toEqual({
      isActive: false,
    });
  });

  it('updates and deletes mappings after existence checks', async () => {
    vi.mocked(repo.getById).mockResolvedValue({
      id: 'mapping-1',
    } as never);
    vi.mocked(repo.update).mockResolvedValue({
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalCategoryId: 'external-1',
      internalCategoryId: 'internal-2',
      catalogId: 'catalog-1',
      isActive: true,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    } as never);

    await expect(
      updateCategoryMappingById(repo, 'mapping-1', {
        internalCategoryId: 'internal-2',
        isActive: true,
      })
    ).resolves.toMatchObject({
      id: 'mapping-1',
    });
    expect(repo.update).toHaveBeenCalledWith('mapping-1', {
      internalCategoryId: 'internal-2',
      isActive: true,
    });

    await expect(deleteCategoryMappingById(repo, 'mapping-1')).resolves.toEqual({
      success: true,
    });
    expect(repo.delete).toHaveBeenCalledWith('mapping-1');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategoryMappingRepository } from '@/shared/contracts/integrations';

import {
  parseMarketplaceMappingsQuery,
  requireCategoryMappingCreateFields,
  saveCategoryMapping,
} from './handler.helpers';

type CategoryMappingSaveRepository = Pick<
  CategoryMappingRepository,
  'getByExternalCategory' | 'update' | 'create'
>;

describe('marketplace mappings helpers', () => {
  let repo: CategoryMappingSaveRepository;

  beforeEach(() => {
    repo = {
      getByExternalCategory: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    };
  });

  it('parses list queries and enforces connectionId', () => {
    expect(
      parseMarketplaceMappingsQuery({
        connectionId: 'conn-1',
        catalogId: 'catalog-1',
      })
    ).toEqual({
      connectionId: 'conn-1',
      catalogId: 'catalog-1',
    });
    expect(() => parseMarketplaceMappingsQuery({ connectionId: '' })).toThrow(
      'connectionId is required'
    );
  });

  it('requires all create fields before saving', () => {
    expect(
      requireCategoryMappingCreateFields({
        connectionId: 'conn-1',
        externalCategoryId: 'external-1',
        internalCategoryId: 'internal-1',
        catalogId: 'catalog-1',
      })
    ).toEqual({
      connectionId: 'conn-1',
      externalCategoryId: 'external-1',
      internalCategoryId: 'internal-1',
      catalogId: 'catalog-1',
    });
    expect(() =>
      requireCategoryMappingCreateFields({
        connectionId: 'conn-1',
        externalCategoryId: 'external-1',
        internalCategoryId: null,
        catalogId: 'catalog-1',
      })
    ).toThrow('connectionId, externalCategoryId, internalCategoryId, and catalogId are required');
  });

  it('updates existing mappings and creates missing ones', async () => {
    vi.mocked(repo.getByExternalCategory).mockResolvedValueOnce({
      id: 'mapping-1',
    } as never);
    vi.mocked(repo.update).mockResolvedValueOnce({
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
      saveCategoryMapping(repo, {
        connectionId: 'conn-1',
        externalCategoryId: 'external-1',
        internalCategoryId: 'internal-2',
        catalogId: 'catalog-1',
      })
    ).resolves.toMatchObject({
      status: 200,
      body: {
        id: 'mapping-1',
      },
    });

    vi.mocked(repo.getByExternalCategory).mockResolvedValueOnce(null);
    vi.mocked(repo.create).mockResolvedValueOnce({
      id: 'mapping-2',
      connectionId: 'conn-1',
      externalCategoryId: 'external-2',
      internalCategoryId: 'internal-3',
      catalogId: 'catalog-1',
      isActive: true,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    } as never);

    await expect(
      saveCategoryMapping(repo, {
        connectionId: 'conn-1',
        externalCategoryId: 'external-2',
        internalCategoryId: 'internal-3',
        catalogId: 'catalog-1',
      })
    ).resolves.toMatchObject({
      status: 201,
      body: {
        id: 'mapping-2',
      },
    });
  });
});

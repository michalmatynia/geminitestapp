import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExternalCategoryRepository } from '@/shared/contracts/integrations/repositories';

import {
  listMarketplaceCategories,
  parseMarketplaceCategoriesQuery,
} from './handler.helpers';

type CategoryListRepository = Pick<
  ExternalCategoryRepository,
  'listByConnection' | 'getTreeByConnection' | 'listByMarketplace' | 'getTreeByMarketplace'
>;

describe('marketplace categories helpers', () => {
  let repo: CategoryListRepository;

  beforeEach(() => {
    repo = {
      listByConnection: vi.fn(),
      getTreeByConnection: vi.fn(),
      listByMarketplace: vi.fn(),
      getTreeByMarketplace: vi.fn(),
    };
  });

  it('parses category queries and enforces connectionId', () => {
    expect(
      parseMarketplaceCategoriesQuery({
        connectionId: 'conn-1',
        tree: 'true',
      })
    ).toEqual({
      connectionId: 'conn-1',
      marketplace: null,
      tree: true,
    });

    expect(
      parseMarketplaceCategoriesQuery({
        connectionId: 'conn-1',
      })
    ).toEqual({
      connectionId: 'conn-1',
      marketplace: null,
      tree: false,
    });

    expect(() => parseMarketplaceCategoriesQuery({ connectionId: '' })).toThrow(
      'connectionId is required'
    );
  });

  it('parses Tradera marketplace categories without requiring a connectionId', () => {
    expect(
      parseMarketplaceCategoriesQuery({
        marketplace: 'Tradera',
        tree: 'true',
      })
    ).toEqual({
      connectionId: null,
      marketplace: 'tradera',
      tree: true,
    });
  });

  it('lists flat categories when tree mode is disabled', async () => {
    vi.mocked(repo.listByConnection).mockResolvedValueOnce([
      {
        id: 'cat-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Category 1',
        parentExternalId: null,
        path: 'Category 1',
        depth: 0,
        isLeaf: true,
        metadata: null,
        fetchedAt: new Date(0).toISOString(),
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    ]);

    await expect(
      listMarketplaceCategories(repo, { connectionId: 'conn-1', marketplace: null, tree: false })
    ).resolves.toHaveLength(1);
    expect(repo.listByConnection).toHaveBeenCalledWith('conn-1');
    expect(repo.getTreeByConnection).not.toHaveBeenCalled();
    expect(repo.listByMarketplace).not.toHaveBeenCalled();
  });

  it('lists tree categories when tree mode is enabled', async () => {
    vi.mocked(repo.getTreeByConnection).mockResolvedValueOnce([
      {
        id: 'cat-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Category 1',
        parentExternalId: null,
        path: 'Category 1',
        depth: 0,
        isLeaf: false,
        metadata: null,
        fetchedAt: new Date(0).toISOString(),
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        children: [],
      },
    ]);

    await expect(
      listMarketplaceCategories(repo, { connectionId: 'conn-1', marketplace: null, tree: true })
    ).resolves.toHaveLength(1);
    expect(repo.getTreeByConnection).toHaveBeenCalledWith('conn-1');
    expect(repo.listByConnection).not.toHaveBeenCalled();
    expect(repo.getTreeByMarketplace).not.toHaveBeenCalled();
  });

  it('lists Tradera categories by marketplace scope', async () => {
    vi.mocked(repo.listByMarketplace).mockResolvedValueOnce([
      {
        id: 'cat-1',
        connectionId: 'conn-1',
        externalId: 'external-1',
        name: 'Category 1',
        parentExternalId: null,
        path: 'Category 1',
        depth: 0,
        isLeaf: true,
        metadata: null,
        fetchedAt: new Date(0).toISOString(),
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    ]);

    await expect(
      listMarketplaceCategories(repo, { connectionId: null, marketplace: 'tradera', tree: false })
    ).resolves.toHaveLength(1);
    expect(repo.listByMarketplace).toHaveBeenCalledWith('tradera');
    expect(repo.listByConnection).not.toHaveBeenCalled();
  });
});

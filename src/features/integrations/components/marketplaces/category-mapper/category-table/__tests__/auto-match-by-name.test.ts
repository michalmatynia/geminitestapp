import { describe, expect, it, vi } from 'vitest';

import {
  autoMatchCategoryMappingsByName,
  formatAutoMatchCategoryMappingsByNameMessage,
} from '../auto-match-by-name';
import type { ExternalCategory } from '@/shared/contracts/integrations/listings';
import type { ProductCategory } from '@/shared/contracts/products/categories';

const createExternalCategory = (
  overrides: Partial<ExternalCategory> & Pick<ExternalCategory, 'id' | 'name'>
): ExternalCategory => ({
  id: overrides.id,
  connectionId: overrides.connectionId ?? 'conn-1',
  externalId: overrides.externalId ?? `market-${overrides.id}`,
  name: overrides.name,
  parentExternalId: overrides.parentExternalId ?? null,
  path: overrides.path ?? null,
  depth: overrides.depth ?? 0,
  isLeaf: overrides.isLeaf ?? true,
  metadata: overrides.metadata ?? null,
  fetchedAt: overrides.fetchedAt ?? '2026-03-22T00:00:00.000Z',
  createdAt: overrides.createdAt ?? '2026-03-22T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-22T00:00:00.000Z',
});

const createInternalCategory = (
  overrides: Partial<ProductCategory> & Pick<ProductCategory, 'id' | 'name'>
): ProductCategory => ({
  id: overrides.id,
  name: overrides.name,
  name_en: overrides.name_en ?? null,
  name_pl: overrides.name_pl ?? null,
  name_de: overrides.name_de ?? null,
  description: overrides.description ?? null,
  color: overrides.color ?? null,
  parentId: overrides.parentId ?? null,
  catalogId: overrides.catalogId ?? 'catalog-1',
  sortIndex: overrides.sortIndex ?? null,
  createdAt: overrides.createdAt ?? '2026-03-22T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-22T00:00:00.000Z',
});

describe('autoMatchCategoryMappingsByName', () => {
  it('matches unique normalized names and skips pending or already mapped categories', () => {
    const getCurrentMapping = vi.fn<(externalCategoryId: string) => string | null>((id) =>
      id === 'market-ext-mapped' ? 'int-existing' : null
    );

    const result = autoMatchCategoryMappingsByName({
      externalCategories: [
        createExternalCategory({ id: 'ext-1', name: ' Office   Chairs ' }),
        createExternalCategory({ id: 'ext-mapped', name: 'Desk Lamps' }),
        createExternalCategory({ id: 'ext-pending', name: 'Bookshelves' }),
      ],
      internalCategories: [
        createInternalCategory({ id: 'int-1', name: 'office chairs' }),
        createInternalCategory({ id: 'int-2', name: 'BookShelves' }),
      ],
      pendingMappings: new Map([['market-ext-pending', null]]),
      getCurrentMapping,
    });

    expect(result).toEqual({
      matches: [{ externalCategoryId: 'market-ext-1', internalCategoryId: 'int-1' }],
      matchedCount: 1,
      alreadyMappedCount: 1,
      pendingCount: 1,
      ambiguousCount: 0,
      unmatchedCount: 0,
    });
  });

  it('treats duplicate names as ambiguous and reports unmatched categories', () => {
    const result = autoMatchCategoryMappingsByName({
      externalCategories: [
        createExternalCategory({ id: 'ext-dup-a', name: 'Lighting' }),
        createExternalCategory({ id: 'ext-dup-b', name: 'Lighting' }),
        createExternalCategory({ id: 'ext-no-match', name: 'Garden' }),
      ],
      internalCategories: [
        createInternalCategory({ id: 'int-1', name: 'Lighting' }),
        createInternalCategory({ id: 'int-2', name: 'Storage' }),
      ],
      pendingMappings: new Map(),
      getCurrentMapping: () => null,
    });

    expect(result).toEqual({
      matches: [],
      matchedCount: 0,
      alreadyMappedCount: 0,
      pendingCount: 0,
      ambiguousCount: 2,
      unmatchedCount: 1,
    });
  });

  it('uses the full marketplace path to disambiguate duplicate leaf names', () => {
    const result = autoMatchCategoryMappingsByName({
      externalCategories: [
        createExternalCategory({
          id: 'ext-pins-collectibles',
          name: 'Pins',
          path: 'Collectibles > Pins',
        }),
        createExternalCategory({
          id: 'ext-pins-fashion',
          name: 'Pins',
          path: 'Fashion > Pins',
        }),
      ],
      internalCategories: [
        createInternalCategory({ id: 'int-collectibles', name: 'Collectibles', parentId: null }),
        createInternalCategory({ id: 'int-fashion', name: 'Fashion', parentId: null }),
        createInternalCategory({ id: 'int-pins-collectibles', name: 'Pins', parentId: 'int-collectibles' }),
        createInternalCategory({ id: 'int-pins-fashion', name: 'Pins', parentId: 'int-fashion' }),
      ],
      pendingMappings: new Map(),
      getCurrentMapping: () => null,
    });

    expect(result).toEqual({
      matches: [
        {
          externalCategoryId: 'market-ext-pins-collectibles',
          internalCategoryId: 'int-pins-collectibles',
        },
        {
          externalCategoryId: 'market-ext-pins-fashion',
          internalCategoryId: 'int-pins-fashion',
        },
      ],
      matchedCount: 2,
      alreadyMappedCount: 0,
      pendingCount: 0,
      ambiguousCount: 0,
      unmatchedCount: 0,
    });
  });

  it('formats a readable toast summary', () => {
    expect(
      formatAutoMatchCategoryMappingsByNameMessage({
        matches: [],
        matchedCount: 4,
        alreadyMappedCount: 3,
        pendingCount: 2,
        ambiguousCount: 1,
        unmatchedCount: 5,
      })
    ).toBe('Matched 4 categories, 2 pending, 3 already mapped, 1 ambiguous, 5 unmatched.');
  });
});

import { describe, expect, it } from 'vitest';

import {
  assertCategoryReorderParentCatalog,
  assertCategoryReorderParentIsNotSelf,
  attachCategoryReorderTimingHeaders,
  buildCategoryReorderServerTiming,
  normalizeCategoryReorderId,
  resolveCategoryReorderRequest,
  resolveCategoryReorderSortIndex,
  shouldLogCategoryReorderTiming,
} from './handler.helpers';

describe('product categories reorder handler helpers', () => {
  it('normalizes ids and resolves request defaults', () => {
    expect(normalizeCategoryReorderId(' parent-1 ')).toBe('parent-1');
    expect(normalizeCategoryReorderId('   ')).toBeNull();
    expect(
      resolveCategoryReorderRequest(
        {
          categoryId: ' category-2 ',
          parentId: ' parent-1 ',
          targetId: ' sibling-1 ',
        },
        'catalog-1'
      )
    ).toEqual({
      categoryId: 'category-2',
      targetParentId: 'parent-1',
      targetId: 'sibling-1',
      position: 'inside',
      nextCatalogId: 'catalog-1',
    });
  });

  it('rejects self-parent moves and parent catalog mismatches', () => {
    expect(() => assertCategoryReorderParentIsNotSelf('category-2', 'category-2')).toThrow(
      'Cannot move category into itself'
    );

    expect(() =>
      assertCategoryReorderParentCatalog({
        parentCatalogId: 'catalog-9',
        nextCatalogId: 'catalog-1',
        targetParentId: 'parent-1',
      })
    ).toThrow('Parent category must be in the same catalog.');
  });

  it('resolves sort indices for inside and relative reorder positions', () => {
    expect(
      resolveCategoryReorderSortIndex({
        siblingIds: ['sibling-1', 'category-2', 'sibling-2'],
        categoryId: 'category-2',
        position: 'inside',
        targetId: null,
      })
    ).toBe(2);

    expect(
      resolveCategoryReorderSortIndex({
        siblingIds: ['sibling-1', 'category-2', 'sibling-2'],
        categoryId: 'category-2',
        position: 'after',
        targetId: 'sibling-1',
      })
    ).toBe(1);

    expect(() =>
      resolveCategoryReorderSortIndex({
        siblingIds: ['sibling-1', 'category-2', 'sibling-2'],
        categoryId: 'category-2',
        position: 'before',
        targetId: null,
      })
    ).toThrow('targetId is required for before/after reorder.');

    expect(() =>
      resolveCategoryReorderSortIndex({
        siblingIds: ['sibling-1', 'category-2', 'sibling-2'],
        categoryId: 'category-2',
        position: 'after',
        targetId: 'missing',
      })
    ).toThrow('targetId is not a sibling in the requested parent.');
  });

  it('builds timing headers and checks debug logging state', () => {
    expect(
      buildCategoryReorderServerTiming({
        repository: 12.4,
        total: 24.6,
        ignored: null,
      })
    ).toBe('repository;dur=12, total;dur=25');

    const response = new Response(null);
    attachCategoryReorderTimingHeaders(response, {
      repository: 12.4,
      total: 24.6,
    });
    expect(response.headers.get('Server-Timing')).toBe('repository;dur=12, total;dur=25');
    expect(shouldLogCategoryReorderTiming({ DEBUG_API_TIMING: 'true' })).toBe(true);
    expect(shouldLogCategoryReorderTiming({ DEBUG_API_TIMING: 'false' })).toBe(false);
  });
});

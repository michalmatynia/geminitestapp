import { describe, expect, it } from 'vitest';

import {
  assertAvailableCategoryName,
  assertCategoryMoveTarget,
  buildCategoryNameLookupInput,
  buildCategoryUpdatePayload,
  normalizeCategoryUpdateName,
  resolveCategoryPlacement,
  shouldCheckCategoryDescendantMove,
} from './handler.helpers';

const currentCategory = {
  id: 'category-1',
  name: 'Rings',
  parentId: 'category-jewellery',
  catalogId: 'catalog-1',
};

describe('product categories by-id handler helpers', () => {
  it('normalizes category names and rejects blank updates', () => {
    expect(normalizeCategoryUpdateName({ name: ' Rings ' })).toBe('Rings');
    expect(() => normalizeCategoryUpdateName({ name: '   ' })).toThrow(
      'Category name is required'
    );
  });

  it('resolves placement and descendant-check rules', () => {
    const placement = resolveCategoryPlacement(currentCategory, {
      catalogId: 'catalog-2',
    });

    expect(placement).toEqual({
      nextCatalogId: 'catalog-2',
      nextParentId: null,
      currentParentId: 'category-jewellery',
      placementChanged: true,
    });

    expect(shouldCheckCategoryDescendantMove(currentCategory, {}, 'category-parent')).toBe(true);
    expect(
      shouldCheckCategoryDescendantMove(currentCategory, { catalogId: 'catalog-2' }, 'category-parent')
    ).toBe(false);
  });

  it('builds name lookups, update payloads, and duplicate-name rejections', () => {
    const placement = resolveCategoryPlacement(currentCategory, {
      parentId: null,
    });

    expect(buildCategoryNameLookupInput(currentCategory, undefined, placement)).toEqual({
      catalogId: 'catalog-1',
      name: 'Rings',
      parentId: null,
    });

    expect(
      buildCategoryUpdatePayload(
        {
          color: '#fff',
          name_pl: ' Priorytet ',
          catalogId: 'catalog-2',
        },
        'Priority',
        {
          nextCatalogId: 'catalog-2',
          nextParentId: null,
          currentParentId: 'category-jewellery',
          placementChanged: true,
        }
      )
    ).toEqual({
      name: 'Priority',
      name_pl: ' Priorytet ',
      color: '#fff',
      parentId: null,
      catalogId: 'catalog-2',
    });

    expect(() =>
      assertAvailableCategoryName(
        { id: 'category-2' },
        'category-1',
        {
          catalogId: 'catalog-1',
          name: 'Rings',
          parentId: null,
        }
      )
    ).toThrow('A category with this name already exists at this level');
  });

  it('rejects moves into self', () => {
    expect(() => assertCategoryMoveTarget('category-1', 'category-1')).toThrow(
      'Cannot move category into itself'
    );
  });
});

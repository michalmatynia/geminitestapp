import { describe, expect, it } from 'vitest';

import {
  assertAvailableProductCategoryCreateName,
  attachTimingHeaders,
  buildProductCategoryCreateInput,
  buildServerTiming,
  normalizeCategoryCreateName,
  normalizeFreshQueryValue,
  requireProductCategoryCatalogId,
  shouldUseFreshProductCategoryFetch,
} from './handler.helpers';

describe('product categories handler helpers', () => {
  it('normalizes fresh query values and required catalog ids', () => {
    expect(normalizeFreshQueryValue(' yes ')).toBe(true);
    expect(normalizeFreshQueryValue('off')).toBe(false);
    expect(normalizeFreshQueryValue('')).toBeUndefined();
    expect(requireProductCategoryCatalogId({ catalogId: 'catalog-1' })).toBe('catalog-1');
    expect(() => requireProductCategoryCatalogId(undefined)).toThrow(
      'catalogId query parameter is required'
    );
    expect(shouldUseFreshProductCategoryFetch({ fresh: true })).toBe(true);
    expect(shouldUseFreshProductCategoryFetch({ fresh: false })).toBe(false);
  });

  it('rejects blank or duplicate category names at the same level', () => {
    expect(() =>
      normalizeCategoryCreateName({
        name: '   ',
        catalogId: 'catalog-1',
      })
    ).toThrow('Category name is required');

    expect(() =>
      assertAvailableProductCategoryCreateName(
        { id: 'category-2' },
        'Priority',
        null,
        'catalog-1'
      )
    ).toThrow('A category with this name already exists at this level');
  });

  it('builds create payloads and timing headers', () => {
    expect(
      buildProductCategoryCreateInput(
        {
          name: 'Priority',
          name_pl: ' Priorytet ',
          catalogId: 'catalog-1',
          color: undefined,
          parentId: undefined,
          description: 'Desc',
          sortIndex: 3,
        },
        'Priority'
      )
    ).toEqual({
      name: 'Priority',
      name_pl: ' Priorytet ',
      catalogId: 'catalog-1',
      color: null,
      parentId: null,
      description: 'Desc',
      sortIndex: 3,
    });

    expect(buildServerTiming({ repository: 12.4, total: 24.6, ignored: null })).toBe(
      'repository;dur=12, total;dur=25'
    );

    const response = new Response(null);
    attachTimingHeaders(response, { repository: 12.4, total: 24.6 });
    expect(response.headers.get('Server-Timing')).toBe('repository;dur=12, total;dur=25');
  });
});

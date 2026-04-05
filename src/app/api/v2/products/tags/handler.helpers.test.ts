import { describe, expect, it } from 'vitest';

import {
  assertAvailableProductTagCreateName,
  buildProductTagCreateInput,
  requireProductTagCatalogId,
} from './handler.helpers';

describe('product tags handler helpers', () => {
  it('requires catalogId query input for list requests', () => {
    expect(requireProductTagCatalogId({ catalogId: 'catalog-1' })).toBe('catalog-1');
    expect(() => requireProductTagCatalogId({})).toThrow('catalogId query parameter is required');
  });

  it('rejects duplicate tag names within the catalog', () => {
    expect(() =>
      assertAvailableProductTagCreateName({ id: 'tag-2' }, 'Priority', 'catalog-1')
    ).toThrow('A tag with this name already exists in this catalog');
  });

  it('builds create payloads with the default color fallback', () => {
    expect(
      buildProductTagCreateInput({
        name: 'Priority',
        color: undefined,
        catalogId: 'catalog-1',
      })
    ).toEqual({
      name: 'Priority',
      color: '#38bdf8',
      catalogId: 'catalog-1',
    });
  });
});

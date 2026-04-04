import { describe, expect, it } from 'vitest';

import {
  assertAvailableProductTagName,
  buildProductTagNameLookupInput,
  buildProductTagUpdateInput,
  parseTagId,
} from './handler.helpers';

const currentTag = {
  id: 'tag-1',
  catalogId: 'catalog-1',
};

describe('product tags by-id handler helpers', () => {
  it('parses route ids and rejects blank params', () => {
    expect(parseTagId({ id: ' tag-1 ' })).toBe('tag-1');
    expect(() => parseTagId({ id: '  ' })).toThrow('Invalid route parameters');
  });

  it('builds target catalog lookups and duplicate-name rejections', () => {
    expect(
      buildProductTagNameLookupInput(currentTag, {
        name: 'Priority',
        catalogId: 'catalog-2',
      })
    ).toEqual({
      name: 'Priority',
      catalogId: 'catalog-2',
    });

    expect(() =>
      assertAvailableProductTagName(
        { id: 'tag-2' },
        'tag-1',
        {
          name: 'Priority',
          catalogId: 'catalog-2',
        }
      )
    ).toThrow('A tag with this name already exists in this catalog');
  });

  it('builds partial update payloads and skips lookups when name is absent', () => {
    expect(
      buildProductTagUpdateInput({
        name: 'Priority',
        color: null,
        catalogId: 'catalog-2',
      })
    ).toEqual({
      name: 'Priority',
      color: null,
    });

    expect(buildProductTagNameLookupInput(currentTag, { color: '#fff' })).toBeNull();
  });
});

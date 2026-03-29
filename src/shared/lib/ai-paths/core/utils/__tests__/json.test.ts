import { describe, expect, it } from 'vitest';

import {
  buildFlattenedMappings,
  buildTopLevelMappings,
  extractJsonPathEntries,
  extractJsonPaths,
  getValueAtMappingPath,
  normalizeMappingPath,
  omitByPaths,
  parsePathTokens,
  pickByPaths,
  setValueAtMappingPath,
} from '@/shared/lib/ai-paths/core/utils/json';

describe('extractJsonPathEntries', () => {
  it('walks nested objects and arrays up to the requested depth', () => {
    const value = {
      id: 'product-1',
      details: {
        title: 'Lamp',
      },
      images: [{ url: 'https://example.com/a.png', alt: 'A' }],
    };

    expect(extractJsonPathEntries(value, 2)).toEqual([
      { path: 'id', type: 'value' },
      { path: 'details', type: 'object' },
      { path: 'details.title', type: 'value' },
      { path: 'images', type: 'array' },
      { path: 'images[0]', type: 'object' },
    ]);
    expect(extractJsonPaths(value, 1)).toEqual([
      'id',
      'details',
      'images',
    ]);
  });

  it('skips nullish values and empty arrays while keeping sibling paths', () => {
    const value = {
      details: null,
      variants: [],
      metadata: {
        status: 'ready',
      },
    };

    expect(extractJsonPathEntries(value, 2)).toEqual([
      { path: 'variants', type: 'array' },
      { path: 'metadata', type: 'object' },
      { path: 'metadata.status', type: 'value' },
    ]);
  });
});

describe('top-level mapping helpers', () => {
  it('builds mappings for object and array roots', () => {
    expect(buildTopLevelMappings({ id: 1, name: 'Lamp' })).toEqual({
      id: '$.id',
      name: '$.name',
    });
    expect(buildTopLevelMappings([{ id: 1, name: 'Lamp' }])).toEqual({
      id: '$[0].id',
      name: '$[0].name',
    });
    expect(buildTopLevelMappings(null)).toEqual({});
  });

  it('normalizes mapping paths relative to context roots', () => {
    expect(normalizeMappingPath('$.name')).toBe('name');
    expect(normalizeMappingPath('$details.price')).toBe('details.price');
    expect(normalizeMappingPath('context.images[0].url', { productId: 'p-1' })).toBe(
      'images[0].url'
    );
    expect(normalizeMappingPath('context.images[0].url', { context: { images: [] } })).toBe(
      'context.images[0].url'
    );
  });

  it('parses path tokens for objects and arrays', () => {
    expect(parsePathTokens('details.price')).toEqual(['details', 'price']);
    expect(parsePathTokens('[0].images[2].url')).toEqual([0, 'images', 2, 'url']);
  });
});

describe('getValueAtMappingPath', () => {
  it('resolves nested paths from JSON-string intermediate values', () => {
    const context = {
      result: '{"parameters":[{"parameterId":"param-1","value":"metal"}]}',
    };

    expect(getValueAtMappingPath(context, 'result.parameters[0].parameterId')).toBe('param-1');
    expect(getValueAtMappingPath(context, 'result.parameters[0].value')).toBe('metal');
  });

  it('does not coerce non-JSON strings', () => {
    const context = {
      result: 'plain-text',
    };

    expect(getValueAtMappingPath(context, 'result.parameters')).toBeUndefined();
  });

  it('resolves object paths from array inputs by selecting first matching entry', () => {
    const context = {
      result: ['not-json', '{"parameters":[{"parameterId":"param-2","value":"acrylic"}]}'],
    };

    expect(getValueAtMappingPath(context, 'result.parameters[0].parameterId')).toBe('param-2');
    expect(getValueAtMappingPath(context, 'result.parameters[0].value')).toBe('acrylic');
  });

  it('repairs common malformed nested-object JSON before path traversal', () => {
    const context = {
      result:
        '{"parameters":[{"parameterId":"p1","value":"v1","valuesByLanguage":{"pl":"x"},{"parameterId":"p2","value":"v2","valuesByLanguage":{"pl":"y"}}]}',
    };

    expect(getValueAtMappingPath(context, 'result.parameters[0].parameterId')).toBe('p1');
    expect(getValueAtMappingPath(context, 'result.parameters[1].value')).toBe('v2');
  });

  it('walks arrays by trying each object element when the next token is a key', () => {
    const context = {
      result: [{ id: 'one' }, { details: { status: 'ready' } }],
    };

    expect(getValueAtMappingPath(context, 'result.details.status')).toBe('ready');
  });

  it('returns undefined when array indexes are out of bounds or numeric tokens target objects', () => {
    const context = {
      result: [{ id: 'one' }],
      details: { status: 'ready' },
    };

    expect(getValueAtMappingPath(context, 'result[4].id')).toBeUndefined();
    expect(getValueAtMappingPath(context, 'details[0]')).toBeUndefined();
  });
});

describe('buildFlattenedMappings', () => {
  it('builds unique leaf mappings and keeps container entries when requested', () => {
    const value = {
      image: { url: 'a' },
      nested: {
        image: { url: 'b' },
      },
      variants: [{ sku: 'sku-1', price: 10 }],
      '123field': true,
    };

    expect(buildFlattenedMappings(value, 2, 'leaf', false)).toEqual({
      url: '$.image.url',
      variants: '$.variants',
      field_123field: '$.123field',
    });

    expect(buildFlattenedMappings(value, 1, 'path', true)).toEqual({
      image: '$.image',
      nested: '$.nested',
      variants: '$.variants',
      field_123field: '$.123field',
    });
  });
});

describe('path mutation helpers', () => {
  it('sets nested object and array values from mapping paths', () => {
    const target: Record<string, unknown> = {};

    setValueAtMappingPath(target, '$.details.images[0].url', 'https://example.com/a.png');
    setValueAtMappingPath(target, '$.details.images[1].alt', 'Second');

    expect(target).toEqual({
      details: {
        images: [
          { url: 'https://example.com/a.png' },
          { alt: 'Second' },
        ],
      },
    });
  });

  it('picks and omits nested paths from objects', () => {
    const source = {
      details: {
        title: 'Lamp',
        price: 10,
      },
      metadata: {
        draft: true,
      },
    };

    expect(pickByPaths(source, ['details.title', 'metadata.draft'])).toEqual({
      details: { title: 'Lamp' },
      metadata: { draft: true },
    });
    expect(omitByPaths(source, ['details.price', 'metadata.draft'])).toEqual({
      details: { title: 'Lamp' },
      metadata: {},
    });
  });
});

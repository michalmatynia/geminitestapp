import { describe, expect, it } from 'vitest';

import {
  AI_PATHS_RUNTIME_COLLECTION_MAP_INPUT_KEY,
  extractAiPathsCollectionMapFromRunMeta,
  getAiPathsCollectionMapFromInputs,
  normalizeAiPathsCollectionMap,
  resolveAiPathsCollectionName,
  withAiPathsCollectionMapInput,
} from '@/shared/lib/ai-paths/core/utils/collection-mapping';

describe('collection mapping utilities', () => {
  it('normalizes only non-empty string mappings', () => {
    const map = normalizeAiPathsCollectionMap({
      Product: 'products',
      product_draft: ' ',
      number: 123,
    });
    expect(map).toEqual({
      Product: 'products',
    });
  });

  it('resolves mapping by explicit key (case-insensitive) and never infers aliases', () => {
    const map = { product: 'products' };
    expect(resolveAiPathsCollectionName('Product', map)).toEqual({
      collection: 'products',
      mappedFrom: 'product',
    });
    expect(resolveAiPathsCollectionName('Catalog', map)).toEqual({
      collection: 'Catalog',
    });
  });

  it('extracts mapping from run meta and propagates it through runtime inputs', () => {
    const map = extractAiPathsCollectionMapFromRunMeta({
      aiPathsValidation: {
        collectionMap: {
          Product: 'products',
        },
      },
    });

    expect(map).toEqual({ Product: 'products' });

    const inputs = withAiPathsCollectionMapInput({ a: 1 }, map);
    expect(inputs[AI_PATHS_RUNTIME_COLLECTION_MAP_INPUT_KEY]).toEqual({
      Product: 'products',
    });
    expect(getAiPathsCollectionMapFromInputs(inputs)).toEqual({
      Product: 'products',
    });
  });
});

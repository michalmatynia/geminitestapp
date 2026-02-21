import { describe, expect, it } from 'vitest';

import { isCollectionAllowed } from '@/features/ai/ai-paths/server/collection-allowlist';

describe('collection allowlist', () => {
  it('does not infer singular aliases and only matches allowlisted collections', () => {
    expect(isCollectionAllowed('Product')).toBe(false);
    expect(isCollectionAllowed('product')).toBe(false);
    expect(isCollectionAllowed('products')).toBe(true);
    expect(isCollectionAllowed('noteFiles')).toBe(true);
  });
});

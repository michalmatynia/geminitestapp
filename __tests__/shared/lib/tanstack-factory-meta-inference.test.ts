import { describe, expect, it } from 'vitest';

import { inferLegacyFactoryMeta } from '@/shared/lib/tanstack-factory-meta-inference';

describe('tanstack factory meta inference', () => {
  it('infers products domain/resource from product query keys', () => {
    const meta = inferLegacyFactoryMeta({
      key: ['products', 'list', { page: 1 }],
      operation: 'list',
      source: 'legacy.test',
      kind: 'query',
    });

    expect(meta.domain).toBe('products');
    expect(meta.resource).toContain('products');
    expect(meta.queryKey).toEqual(['products', 'list', { page: 1 }]);
  });

  it('infers image studio domain for image studio keys', () => {
    const meta = inferLegacyFactoryMeta({
      key: ['image-studio', 'slots', 'project-1'],
      operation: 'detail',
      source: 'legacy.test',
      kind: 'query',
    });

    expect(meta.domain).toBe('image_studio');
    expect(meta.resource).toContain('image-studio');
  });

  it('falls back to global domain for unknown prefixes', () => {
    const meta = inferLegacyFactoryMeta({
      key: ['notes', 'list'],
      operation: 'list',
      source: 'legacy.test',
      kind: 'query',
    });

    expect(meta.domain).toBe('global');
    expect(meta.resource).toContain('notes');
  });
});


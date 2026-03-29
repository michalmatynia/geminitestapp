import path from 'path';

import { describe, expect, it } from 'vitest';

import { resolveKangurDocAbsolutePath } from './social-posts-docs';

describe('resolveKangurDocAbsolutePath', () => {
  it('normalizes docs-prefixed Kangur markdown paths', () => {
    expect(resolveKangurDocAbsolutePath('docs/kangur/README.md')).toBe(
      path.resolve(process.cwd(), 'docs', 'kangur', 'README.md')
    );
    expect(resolveKangurDocAbsolutePath('/kangur/README.md')).toBe(
      path.resolve(process.cwd(), 'docs', 'kangur', 'README.md')
    );
  });

  it('rejects path traversal and unsupported extensions', () => {
    expect(resolveKangurDocAbsolutePath('../outside.md')).toBeNull();
    expect(resolveKangurDocAbsolutePath('docs/kangur/image.png')).toBeNull();
  });
});

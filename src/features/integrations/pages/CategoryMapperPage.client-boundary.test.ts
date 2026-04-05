import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const categoryMapperPagePath = path.join(
  process.cwd(),
  'src/features/integrations/pages/CategoryMapperPage.tsx'
);

describe('CategoryMapperPage client boundary', () => {
  it('declares a client boundary before using the selection hook', () => {
    const source = readFileSync(categoryMapperPagePath, 'utf8');

    expect(source.trimStart().startsWith("'use client';")).toBe(true);
    expect(source).toContain('useCategoryMapperPageSelection()');
  });
});

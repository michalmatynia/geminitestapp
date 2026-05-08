import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  path.join(process.cwd(), 'src/features/integrations/pages/CategoryMapperPage.tsx'),
  'utf8'
);

describe('CategoryMapperPage client boundary', () => {
  it('keeps the client boundary and page-selection hook in the page component', () => {
    expect(source.startsWith("'use client';\n")).toBe(true);
    expect(source).toContain('useCategoryMapperPageSelection()');
  });
});

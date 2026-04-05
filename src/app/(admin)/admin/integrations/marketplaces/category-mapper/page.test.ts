import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  path.join(
    process.cwd(),
    'src/app/(admin)/admin/integrations/marketplaces/category-mapper/page.tsx'
  ),
  'utf8'
);

describe('unified category mapper route', () => {
  it('renders CategoryMapperPage instead of redirecting', () => {
    expect(pageSource).toContain('CategoryMapperPage');
    expect(pageSource).not.toMatch(/\bredirect\s*\(/);
  });

  it('imports from the integrations public barrel', () => {
    expect(pageSource).toMatch(/@\/features\/integrations\/public/);
  });
});

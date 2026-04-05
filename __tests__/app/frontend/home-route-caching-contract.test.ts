import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const rootHomePagePath = path.join(process.cwd(), 'src/app/(frontend)/page.tsx');
const localizedHomePagePath = path.join(process.cwd(), 'src/app/[locale]/(frontend)/page.tsx');

describe('frontend home route caching contract', () => {
  it('keeps the root and localized home pages revalidated instead of forced dynamic', () => {
    const rootSource = readFileSync(rootHomePagePath, 'utf8');
    const localizedSource = readFileSync(localizedHomePagePath, 'utf8');

    expect(rootSource).toContain('export const revalidate = 300;');
    expect(localizedSource).toContain('export const revalidate = 300;');
    expect(rootSource).not.toContain("export const dynamic = 'force-dynamic';");
    expect(localizedSource).not.toContain("export const dynamic = 'force-dynamic';");
  });
});

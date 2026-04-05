import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROUTES_DIR = path.join(process.cwd(), 'src/app/(admin)/admin/integrations');

const readRoute = (relativePath: string): string =>
  readFileSync(path.join(ROUTES_DIR, relativePath), 'utf8');

describe('Category mapper route guardrails', () => {
  describe('unified category mapper route must render — not redirect', () => {
    const source = readRoute('marketplaces/category-mapper/page.tsx');

    it('does not contain a redirect call', () => {
      expect(source).not.toMatch(/\bredirect\s*\(/);
    });

    it('renders CategoryMapperPage', () => {
      expect(source).toContain('CategoryMapperPage');
    });

    it('imports from the integrations feature public barrel', () => {
      expect(source).toMatch(/@\/features\/integrations\/public/);
    });
  });

  describe('base-com aggregator route also renders CategoryMapperPage', () => {
    const source = readRoute('aggregators/base-com/category-mapping/page.tsx');

    it('renders CategoryMapperPage', () => {
      expect(source).toContain('CategoryMapperPage');
    });

    it('does not contain a redirect call', () => {
      expect(source).not.toMatch(/\bredirect\s*\(/);
    });
  });

  describe('CATEGORY_MAPPING_MARKETPLACE_SLUGS includes tradera', () => {
    const contextSource = readFileSync(
      path.join(
        process.cwd(),
        'src/features/integrations/context/CategoryMapperPageContext.tsx'
      ),
      'utf8'
    );

    it('defines the slug set with tradera', () => {
      expect(contextSource).toMatch(/CATEGORY_MAPPING_MARKETPLACE_SLUGS.*tradera/s);
    });

    it('defines the slug set with base marketplace slugs', () => {
      expect(contextSource).toMatch(/base-com/);
      expect(contextSource).toMatch(/baselinker/);
    });

    it('uses the slug set to filter integrations', () => {
      expect(contextSource).toContain('CATEGORY_MAPPING_MARKETPLACE_SLUGS.has(');
    });
  });
});

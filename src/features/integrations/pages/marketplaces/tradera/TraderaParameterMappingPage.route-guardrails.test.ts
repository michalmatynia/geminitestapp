import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROUTE_PATH = path.join(
  process.cwd(),
  'src/app/(admin)/admin/integrations/marketplaces/tradera/parameter-mapping/page.tsx'
);

describe('TraderaParameterMappingPage route guardrails', () => {
  const source = readFileSync(ROUTE_PATH, 'utf8');

  it('does not redirect away from the Tradera parameter mapper route', () => {
    expect(source).not.toMatch(/\bredirect\s*\(/);
  });

  it('renders TraderaParameterMappingPage from an integrations feature barrel', () => {
    expect(source).toContain('TraderaParameterMappingPage');
    expect(source).toMatch(/@\/features\/integrations\/(admin\.)?public/);
  });
});

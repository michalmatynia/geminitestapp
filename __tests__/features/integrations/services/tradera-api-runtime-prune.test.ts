import { readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const traderaListingApiPath = path.join(
  projectRoot,
  'src/features/integrations/services/tradera-listing/api.ts'
);
const traderaConnectionTestHandlerPath = path.join(
  projectRoot,
  'src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.ts'
);

describe('tradera api runtime legacy-compat prune guard', () => {
  it('keeps password fallback out of canonical tradera api credential flow', () => {
    const listingApiContent = readFileSync(traderaListingApiPath, 'utf8');
    const connectionTestContent = readFileSync(traderaConnectionTestHandlerPath, 'utf8');

    expect(listingApiContent).not.toContain('fallbackSecret');
    expect(connectionTestContent).not.toContain('traderaApiAppKey ?? connection.password');
    expect(connectionTestContent).not.toContain('traderaApiToken ?? connection.password');
  });
});

import { existsSync, readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const removedListingApiPath = path.join(
  projectRoot,
  'src/features/integrations/services/tradera-listing/api.ts'
);
const removedConnectionTestHandlerPath = path.join(
  projectRoot,
  'src/app/api/v2/integrations/[id]/connections/[connectionId]/test/handler.tradera-api.ts'
);
const traderaListingServicePath = path.join(
  projectRoot,
  'src/features/integrations/services/tradera-listing-service.ts'
);

describe('tradera browser runtime prune guard', () => {
  it('keeps the removed Tradera SOAP/API implementation files out of the runtime tree', () => {
    expect(existsSync(removedListingApiPath)).toBe(false);
    expect(existsSync(removedConnectionTestHandlerPath)).toBe(false);
  });

  it('keeps the Tradera listing service browser-only', () => {
    const listingServiceContent = readFileSync(traderaListingServicePath, 'utf8');

    expect(listingServiceContent).not.toContain('runTraderaApiListing');
    expect(listingServiceContent).not.toContain('tradera-api');
    expect(listingServiceContent).not.toContain('official Tradera API');
  });
});

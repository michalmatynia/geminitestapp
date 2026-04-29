import { describe, expect, it } from 'vitest';

import type { FilemakerJobListing } from '../../types';
import { findExistingListingIndexBySourceIdentity } from './dedupe-listings';

const listing = (input: {
  id: string;
  sourceExternalId?: string;
  sourceSite?: string;
  sourceUrl?: string;
}): FilemakerJobListing =>
  ({
    id: input.id,
    organizationId: 'org-1',
    title: 'Developer',
    sourceExternalId: input.sourceExternalId,
    sourceSite: input.sourceSite,
    sourceUrl: input.sourceUrl,
  }) as FilemakerJobListing;

describe('job-board listing dedupe', () => {
  it('finds existing listings by normalized source URL across organisations', () => {
    const index = findExistingListingIndexBySourceIdentity(
      [
        listing({
          id: 'listing-1',
          sourceSite: 'pracuj.pl',
          sourceUrl: 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001?utm=feed',
        }),
      ],
      {
        sourceSite: 'pracuj.pl',
        sourceUrl: 'https://pracuj.pl/praca/developer-warszawa,oferta,1001#details',
      }
    );

    expect(index).toBe(0);
  });

  it('finds existing listings by source external id', () => {
    const index = findExistingListingIndexBySourceIdentity(
      [
        listing({
          id: 'listing-1',
          sourceExternalId: '1001',
          sourceSite: 'pracuj.pl',
        }),
      ],
      {
        sourceExternalId: '1001',
        sourceSite: 'pracuj.pl',
      }
    );

    expect(index).toBe(0);
  });
});

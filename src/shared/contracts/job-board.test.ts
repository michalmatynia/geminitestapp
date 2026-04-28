import { describe, expect, it } from 'vitest';

import { jobScanCreateRequestSchema } from './job-board';

describe('job-board contracts', () => {
  it('accepts supported job-board scan source URLs', () => {
    expect(
      jobScanCreateRequestSchema.parse({
        sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
      })
    ).toMatchObject({
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
    });
    expect(
      jobScanCreateRequestSchema.parse({
        provider: 'justjoin_it',
        sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
      })
    ).toMatchObject({
      provider: 'justjoin_it',
      sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
    });
    expect(
      jobScanCreateRequestSchema.parse({
        provider: 'nofluffjobs',
        sourceUrl: 'https://nofluffjobs.com/pl/job/backend-dev-acme',
      })
    ).toMatchObject({
      provider: 'nofluffjobs',
      sourceUrl: 'https://nofluffjobs.com/pl/job/backend-dev-acme',
    });
  });

  it('rejects unsupported job-board scan source URLs', () => {
    expect(() =>
      jobScanCreateRequestSchema.parse({
        sourceUrl: 'https://example.com/jobs/backend-dev',
      })
    ).toThrow(/Only pracuj\.pl, justjoin\.it, and nofluffjobs\.com URLs are supported/);
  });
});

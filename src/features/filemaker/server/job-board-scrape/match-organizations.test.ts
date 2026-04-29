import { describe, expect, it } from 'vitest';

import type { FilemakerOrganization } from '../../types';
import { buildCandidate, findBestMatch } from './match-organizations';

const organization = (input: {
  id: string;
  name: string;
  tradingName?: string;
}): FilemakerOrganization =>
  ({
    id: input.id,
    name: input.name,
    tradingName: input.tradingName,
  }) as FilemakerOrganization;

const offer = (companyName: string) => ({
  companyName,
  companyProfile: '',
  companyProfileUrl: null,
  description: '',
  expiresAt: null,
  location: '',
  postedAt: null,
  salaryCurrency: null,
  salaryMax: null,
  salaryMin: null,
  salaryPeriod: 'monthly' as const,
  salaryText: '',
  sourceExternalId: null,
  sourceSite: 'pracuj.pl',
  sourceUrl: 'https://www.pracuj.pl/praca/example,oferta,1001',
  pills: [],
  title: 'Developer',
});

describe('job-board organisation matching', () => {
  it('does not treat very short organisation names as contained-name matches', () => {
    const match = findBestMatch(
      offer('Tech Company'),
      [buildCandidate(organization({ id: 'org-ch', name: 'Ch' }))],
      85
    );

    expect(match).toBeNull();
  });

  it('still matches meaningful contained organisation names', () => {
    const match = findBestMatch(
      offer('Acme Software Group'),
      [buildCandidate(organization({ id: 'org-acme', name: 'Acme Software' }))],
      85
    );

    expect(match).toMatchObject({
      organizationId: 'org-acme',
      reason: 'contained name match',
    });
  });
});

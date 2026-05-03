import { describe, expect, it } from 'vitest';

import { buildOrganizationEmailScrapeToast } from './filemaker-organization-scrape-client';

describe('buildOrganizationEmailScrapeToast', () => {
  it('renders empty-result message when no emails were found', () => {
    const toast = buildOrganizationEmailScrapeToast({});
    expect(toast.message).toContain('no email addresses found');
    expect(toast.variant).toBe('warning');
  });

  it('renders counts and metrics suffix when present', () => {
    const toast = buildOrganizationEmailScrapeToast({
      promoted: [
        { status: 'created' },
        { status: 'created' },
        { status: 'linked' },
        { status: 'already-linked' },
      ],
      skipped: [{ reason: 'Disposable domain.' }],
      metrics: {
        totalEmailsFound: 4,
        disposableSkipped: 1,
        domainsWithoutMx: 1,
        domainsWithNullMx: 1,
        mxLookupErrors: 1,
        mxLookupTimeouts: 2,
        rolePromoted: 2,
        retries: 1,
        sourceBreakdown: { regex: 3, mailto: 1, jsonLd: 0, dataCfemail: 0, microdata: 0 },
      },
    });
    expect(toast.variant).toBe('success');
    expect(toast.message).toContain('2 created');
    expect(toast.message).toContain('1 linked');
    expect(toast.message).toContain('1 already linked');
    expect(toast.message).toContain('1 skipped');
    expect(toast.message).toContain('1 disposable dropped');
    expect(toast.message).toContain('2 role-account');
    expect(toast.message).toContain('1 retry');
    expect(toast.message).toContain('1 domain without MX');
    expect(toast.message).toContain('1 null MX domain');
    expect(toast.message).toContain('2 MX lookup timeouts');
    expect(toast.message).toContain('1 MX lookup error');
  });

  it('omits metrics suffix when all metric counts are zero', () => {
    const toast = buildOrganizationEmailScrapeToast({
      promoted: [{ status: 'created' }],
      skipped: [],
      metrics: {
        totalEmailsFound: 1,
        disposableSkipped: 0,
        rolePromoted: 0,
        retries: 0,
        sourceBreakdown: { regex: 1, mailto: 0, jsonLd: 0, dataCfemail: 0, microdata: 0 },
      },
    });
    expect(toast.message).not.toContain('(');
  });

  it('pluralises retries correctly', () => {
    const toast = buildOrganizationEmailScrapeToast({
      promoted: [{ status: 'created' }],
      metrics: {
        totalEmailsFound: 1,
        disposableSkipped: 0,
        rolePromoted: 0,
        retries: 3,
        sourceBreakdown: { regex: 1, mailto: 0, jsonLd: 0, dataCfemail: 0, microdata: 0 },
      },
    });
    expect(toast.message).toContain('3 retries');
  });
});

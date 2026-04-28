import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireFilemakerMailAdminSessionMock, runFilemakerOrganizationEmailScrapeMock } =
  vi.hoisted(() => ({
    requireFilemakerMailAdminSessionMock: vi.fn(),
    runFilemakerOrganizationEmailScrapeMock: vi.fn(),
  }));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-organization-email-scrape', () => ({
  runFilemakerOrganizationEmailScrape: runFilemakerOrganizationEmailScrapeMock,
}));

import { postHandler } from './handler';

describe('filemaker organization email scrape handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    runFilemakerOrganizationEmailScrapeMock.mockResolvedValue({
      organizationId: 'org 1',
      organizationName: 'Acme',
      runId: 'run-1',
      runtimeKey: 'filemaker_organization_email_scrape',
      websites: ['https://example.com/'],
      visitedUrls: ['https://example.com/contact'],
      promoted: [],
      skipped: [],
      warnings: [],
    });
  });

  it('requires admin access and starts a scrape for the decoded organization id', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/organizations/org%201/email-scrape', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ maxPages: 5 }),
      }),
      { params: { organizationId: 'org%201' } } as Parameters<typeof postHandler>[1]
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(runFilemakerOrganizationEmailScrapeMock).toHaveBeenCalledWith({
      organizationId: 'org 1',
      maxPages: 5,
    });
    await expect(response.json()).resolves.toMatchObject({
      organizationId: 'org 1',
      runId: 'run-1',
    });
  });

  it('rejects invalid scrape options', async () => {
    await expect(
      postHandler(
        new NextRequest('http://localhost/api/filemaker/organizations/org-1/email-scrape', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ maxPages: 99 }),
        }),
        { params: { organizationId: 'org-1' } } as Parameters<typeof postHandler>[1]
      )
    ).rejects.toThrow(/Invalid email scrape request/);
  });
});

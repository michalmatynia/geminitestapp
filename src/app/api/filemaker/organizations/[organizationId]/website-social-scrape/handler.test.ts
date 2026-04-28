import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireFilemakerMailAdminSessionMock, runFilemakerOrganizationPresenceScrapeMock } =
  vi.hoisted(() => ({
    requireFilemakerMailAdminSessionMock: vi.fn(),
    runFilemakerOrganizationPresenceScrapeMock: vi.fn(),
  }));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-organization-presence-scrape', () => ({
  runFilemakerOrganizationPresenceScrape: runFilemakerOrganizationPresenceScrapeMock,
}));

import { postHandler } from './handler';

describe('filemaker organization website/social scrape handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    runFilemakerOrganizationPresenceScrapeMock.mockResolvedValue({
      organizationId: 'org 1',
      organizationName: 'Acme',
      persisted: { linked: [], skipped: [] },
      runId: 'presence-run-1',
      runtimeKey: 'filemaker_organization_presence_scrape',
      seedWebsites: ['https://example.com/'],
      socialProfiles: [],
      visitedUrls: ['https://example.com/'],
      warnings: [],
      websites: [],
    });
  });

  it('requires admin access and starts a scrape for the decoded organization id', async () => {
    const response = await postHandler(
      new NextRequest(
        'http://localhost/api/filemaker/organizations/org%201/website-social-scrape',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ maxPages: 5, maxSearchResults: 7 }),
        }
      ),
      { params: { organizationId: 'org%201' } } as Parameters<typeof postHandler>[1]
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(runFilemakerOrganizationPresenceScrapeMock).toHaveBeenCalledWith({
      organizationId: 'org 1',
      maxPages: 5,
      maxSearchResults: 7,
    });
    await expect(response.json()).resolves.toMatchObject({
      organizationId: 'org 1',
      runId: 'presence-run-1',
    });
  });

  it('rejects invalid scrape options', async () => {
    await expect(
      postHandler(
        new NextRequest(
          'http://localhost/api/filemaker/organizations/org-1/website-social-scrape',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ maxSearchResults: 99 }),
          }
        ),
        { params: { organizationId: 'org-1' } } as Parameters<typeof postHandler>[1]
      )
    ).rejects.toThrow(/Invalid website\/social scrape request/);
  });

  it('allows an empty JSON body and uses default scrape options', async () => {
    const response = await postHandler(
      new NextRequest(
        'http://localhost/api/filemaker/organizations/org-1/website-social-scrape',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '',
        }
      ),
      { params: { organizationId: 'org-1' } } as Parameters<typeof postHandler>[1]
    );

    expect(runFilemakerOrganizationPresenceScrapeMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      maxPages: undefined,
      maxSearchResults: undefined,
    });
    await expect(response.json()).resolves.toMatchObject({
      runId: 'presence-run-1',
    });
  });

  it('rejects malformed JSON bodies', async () => {
    await expect(
      postHandler(
        new NextRequest(
          'http://localhost/api/filemaker/organizations/org-1/website-social-scrape',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{"maxPages":',
          }
        ),
        { params: { organizationId: 'org-1' } } as Parameters<typeof postHandler>[1]
      )
    ).rejects.toThrow(/Invalid website\/social scrape request JSON/);
    expect(runFilemakerOrganizationPresenceScrapeMock).not.toHaveBeenCalled();
  });
});

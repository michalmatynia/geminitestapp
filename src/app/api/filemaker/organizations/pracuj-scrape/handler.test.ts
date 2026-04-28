import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireFilemakerMailAdminSessionMock, runFilemakerPracujScrapeMock } = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  runFilemakerPracujScrapeMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-pracuj-scrape', () => ({
  runFilemakerPracujScrape: runFilemakerPracujScrapeMock,
}));

import { postHandler } from './handler';

describe('filemaker pracuj.pl scrape handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    runFilemakerPracujScrapeMock.mockResolvedValue({
      browserMode: 'headless',
      mode: 'preview',
      offers: [],
      runId: 'run-1',
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
      summary: {
        createdListings: 0,
        matchedOffers: 0,
        scrapedOffers: 0,
        skippedOffers: 0,
        unmatchedOffers: 0,
        updatedListings: 0,
      },
      warnings: [],
    });
  });

  it('requires admin access and forwards the scrape request body', async () => {
    const body = {
      headless: false,
      maxOffers: 3,
      mode: 'preview',
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
    };

    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/organizations/pracuj-scrape', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: {} } as Parameters<typeof postHandler>[1]
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(runFilemakerPracujScrapeMock).toHaveBeenCalledWith(body);
    await expect(response.json()).resolves.toMatchObject({
      runId: 'run-1',
      sourceUrl: 'https://www.pracuj.pl/praca/it;kw',
    });
  });

  it('rejects malformed JSON bodies', async () => {
    await expect(
      postHandler(
        new NextRequest('http://localhost/api/filemaker/organizations/pracuj-scrape', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"sourceUrl":',
        }),
        { params: {} } as Parameters<typeof postHandler>[1]
      )
    ).rejects.toThrow(/Invalid pracuj.pl scrape request JSON/);
    expect(runFilemakerPracujScrapeMock).not.toHaveBeenCalled();
  });
});

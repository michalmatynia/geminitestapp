import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireFilemakerMailAdminSessionMock, runFilemakerJobBoardScrapeMock } = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  runFilemakerJobBoardScrapeMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-job-board-scrape', () => ({
  runFilemakerJobBoardScrape: runFilemakerJobBoardScrapeMock,
}));

import { postHandler } from './handler';

describe('filemaker job-board scrape handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    runFilemakerJobBoardScrapeMock.mockResolvedValue({
      browserMode: 'headless',
      mode: 'preview',
      offers: [],
      provider: 'justjoin_it',
      runId: 'run-1',
      sourceSite: 'justjoin.it',
      sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
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

  it('requires admin access and forwards generic job-board scrape bodies', async () => {
    const body = {
      mode: 'preview',
      provider: 'justjoin_it',
      sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
    };

    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/organizations/job-board-scrape', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: {} } as Parameters<typeof postHandler>[1]
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(runFilemakerJobBoardScrapeMock).toHaveBeenCalledWith(body);
    await expect(response.json()).resolves.toMatchObject({
      provider: 'justjoin_it',
      sourceSite: 'justjoin.it',
      runId: 'run-1',
    });
  });
});

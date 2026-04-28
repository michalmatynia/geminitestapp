import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireFilemakerMailAdminSessionMock,
  runFilemakerJobBoardScrapeMock,
  saveFilemakerJobBoardScrapeDraftsMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  runFilemakerJobBoardScrapeMock: vi.fn(),
  saveFilemakerJobBoardScrapeDraftsMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-job-board-scrape', () => ({
  runFilemakerJobBoardScrape: runFilemakerJobBoardScrapeMock,
  saveFilemakerJobBoardScrapeDrafts: saveFilemakerJobBoardScrapeDraftsMock,
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
        addressUpdates: 0,
        createdListings: 0,
        createdLexiconTerms: 0,
        createdOrganizations: 0,
        linkedLexiconTerms: 0,
        matchedOffers: 0,
        profileUpdates: 0,
        scrapedOffers: 0,
        skippedOffers: 0,
        unmatchedOffers: 0,
        updatedOrganizations: 0,
        updatedListings: 0,
        verifiedListings: 0,
      },
      warnings: [],
    });
    saveFilemakerJobBoardScrapeDraftsMock.mockResolvedValue({
      browserMode: 'headless',
      mode: 'import',
      offers: [],
      provider: 'justjoin_it',
      runId: null,
      sourceSite: 'justjoin.it',
      sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
      summary: {
        addressUpdates: 0,
        createdListings: 0,
        createdLexiconTerms: 0,
        createdOrganizations: 0,
        linkedLexiconTerms: 0,
        matchedOffers: 0,
        profileUpdates: 0,
        scrapedOffers: 0,
        skippedOffers: 0,
        unmatchedOffers: 0,
        updatedOrganizations: 0,
        updatedListings: 0,
        verifiedListings: 0,
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

  it('routes scraped draft save requests to the draft save service', async () => {
    const body = {
      action: 'save_drafts',
      offers: [
        {
          companyName: 'Acme Inc',
          companyProfile: '',
          companyProfileUrl: null,
          description: 'Build interfaces',
          expiresAt: null,
          location: 'Warszawa',
          postedAt: null,
          salaryCurrency: null,
          salaryMax: null,
          salaryMin: null,
          salaryPeriod: 'monthly',
          salaryText: '',
          sourceExternalId: '1001',
          sourceSite: 'pracuj.pl',
          sourceUrl: 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001',
          pills: [],
          title: 'Frontend Developer',
        },
      ],
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

    expect(saveFilemakerJobBoardScrapeDraftsMock).toHaveBeenCalledWith(body);
    expect(runFilemakerJobBoardScrapeMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      mode: 'import',
      runId: null,
    });
  });

  it('streams live job-board scrape events when requested', async () => {
    const body = {
      mode: 'preview',
      provider: 'justjoin_it',
      sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
      stream: true,
    };
    runFilemakerJobBoardScrapeMock.mockImplementationOnce(
      async (_body: unknown, options: { onEvent: (event: unknown) => void }) => {
        options.onEvent({
          at: '2026-04-28T10:00:00.000Z',
          message: 'Collecting job-board offer links.',
          type: 'status',
        });
        options.onEvent({
          at: '2026-04-28T10:00:01.000Z',
          result: {
            browserMode: 'headless',
            mode: 'preview',
            offers: [],
            provider: 'justjoin_it',
            runId: 'run-1',
            sourceSite: 'justjoin.it',
            sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
            summary: {
              addressUpdates: 0,
              createdListings: 0,
              createdLexiconTerms: 0,
              createdOrganizations: 0,
              linkedLexiconTerms: 0,
              matchedOffers: 0,
              profileUpdates: 0,
              scrapedOffers: 0,
              skippedOffers: 0,
              unmatchedOffers: 0,
              updatedOrganizations: 0,
              updatedListings: 0,
              verifiedListings: 0,
            },
            warnings: [],
          },
          type: 'done',
        });
        return {
          browserMode: 'headless',
          mode: 'preview',
          offers: [],
          provider: 'justjoin_it',
          runId: 'run-1',
          sourceSite: 'justjoin.it',
          sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
          summary: {
            addressUpdates: 0,
            createdListings: 0,
            createdLexiconTerms: 0,
            createdOrganizations: 0,
            linkedLexiconTerms: 0,
            matchedOffers: 0,
            profileUpdates: 0,
            scrapedOffers: 0,
            skippedOffers: 0,
            unmatchedOffers: 0,
            updatedOrganizations: 0,
            updatedListings: 0,
            verifiedListings: 0,
          },
          warnings: [],
        };
      }
    );

    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/organizations/job-board-scrape', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: {} } as Parameters<typeof postHandler>[1]
    );

    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    const events = (await response.text())
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(events).toEqual([
      expect.objectContaining({ message: 'Collecting job-board offer links.', type: 'status' }),
      expect.objectContaining({ type: 'done' }),
    ]);
    expect(runFilemakerJobBoardScrapeMock).toHaveBeenCalledWith(
      body,
      expect.objectContaining({
        onEvent: expect.any(Function),
        signal: expect.any(AbortSignal),
      })
    );
  });
});

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  enqueueFilemakerJobBoardScrapeRunMock,
  readFilemakerJobBoardScrapeRunMock,
  requireFilemakerMailAdminSessionMock,
} = vi.hoisted(() => ({
  enqueueFilemakerJobBoardScrapeRunMock: vi.fn(),
  readFilemakerJobBoardScrapeRunMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-job-board-scrape-runtime', () => ({
  enqueueFilemakerJobBoardScrapeRun: enqueueFilemakerJobBoardScrapeRunMock,
  readFilemakerJobBoardScrapeRun: readFilemakerJobBoardScrapeRunMock,
}));

import { postHandler } from './handler';

const queuedRun = {
  completedAt: null,
  createdAt: '2026-04-28T10:00:00.000Z',
  error: null,
  id: 'run-1',
  mode: 'preview',
  result: null,
  sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
  startedAt: null,
  status: 'queued',
  updatedAt: '2026-04-28T10:00:00.000Z',
};

describe('filemaker job-board scrape handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    enqueueFilemakerJobBoardScrapeRunMock.mockResolvedValue({ run: queuedRun });
    readFilemakerJobBoardScrapeRunMock.mockResolvedValue({
      events: [],
      run: { ...queuedRun, completedAt: '2026-04-28T10:01:00.000Z', status: 'completed' },
    });
  });

  it('requires admin access and enqueues generic job-board scrape bodies', async () => {
    const body = {
      extractionPath: 'deterministic',
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
    expect(enqueueFilemakerJobBoardScrapeRunMock).toHaveBeenCalledWith(body);
    expect(response.status).toBe(202);
    expect(response.headers.get('x-filemaker-job-board-scrape-run-id')).toBe('run-1');
    await expect(response.json()).resolves.toMatchObject({
      run: {
        id: 'run-1',
        mode: 'preview',
        status: 'queued',
      },
    });
  });

  it('queues scraped draft save requests in the job-board runtime', async () => {
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

    expect(enqueueFilemakerJobBoardScrapeRunMock).toHaveBeenCalledWith(body);
    expect(response.status).toBe(202);
    expect(response.headers.get('x-filemaker-job-board-scrape-run-id')).toBe('run-1');
    await expect(response.json()).resolves.toMatchObject({
      run: {
        id: 'run-1',
        status: 'queued',
      },
    });
  });

  it('streams live job-board scrape events when requested', async () => {
    const body = {
      extractionPath: 'deterministic',
      mode: 'preview',
      provider: 'justjoin_it',
      sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
      stream: true,
    };
    readFilemakerJobBoardScrapeRunMock.mockResolvedValueOnce({
      events: [
        {
          at: '2026-04-28T10:00:00.000Z',
          message: 'Collecting job-board offer links.',
          type: 'status',
        },
        {
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
        },
      ],
      run: { ...queuedRun, completedAt: '2026-04-28T10:01:00.000Z', status: 'completed' },
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/organizations/job-board-scrape', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: {} } as Parameters<typeof postHandler>[1]
    );

    expect(response.headers.get('content-type')).toContain('application/x-ndjson');
    expect(response.headers.get('x-filemaker-job-board-scrape-run-id')).toBe('run-1');
    const events = (await response.text())
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(events).toEqual([
      expect.objectContaining({ message: 'Collecting job-board offer links.', type: 'status' }),
      expect.objectContaining({ type: 'done' }),
    ]);
    expect(enqueueFilemakerJobBoardScrapeRunMock).toHaveBeenCalledWith(body);
    expect(readFilemakerJobBoardScrapeRunMock).toHaveBeenCalledWith('run-1');
  });
});

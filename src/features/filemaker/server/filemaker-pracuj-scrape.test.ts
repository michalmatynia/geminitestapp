import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  collectJobBoardOfferUrlsMock: vi.fn(),
  getFilemakerOrganizationsCollectionMock: vi.fn(),
  probeJobBoardOfferMock: vi.fn(),
  readFilemakerCampaignSettingValueMock: vi.fn(),
  upsertFilemakerCampaignSettingValueMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/job-board/server/providers/job-board-sync', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/job-board/server/providers/job-board-sync')>()),
  collectJobBoardOfferUrls: (...args: unknown[]) => mocks.collectJobBoardOfferUrlsMock(...args),
}));

vi.mock('@/features/job-board/server/job-scans-service', () => ({
  probeJobBoardOffer: (...args: unknown[]) => mocks.probeJobBoardOfferMock(...args),
}));

vi.mock('./campaign-settings-store', () => ({
  readFilemakerCampaignSettingValue: (...args: unknown[]) =>
    mocks.readFilemakerCampaignSettingValueMock(...args),
  upsertFilemakerCampaignSettingValue: (...args: unknown[]) =>
    mocks.upsertFilemakerCampaignSettingValueMock(...args),
}));

vi.mock('./filemaker-organizations-mongo', () => ({
  getFilemakerOrganizationsCollection: (...args: unknown[]) =>
    mocks.getFilemakerOrganizationsCollectionMock(...args),
  toFilemakerOrganization: (value: unknown) => value,
}));

import { FILEMAKER_DATABASE_KEY } from '../settings-constants';
import { runFilemakerPracujScrape } from './filemaker-pracuj-scrape';

const sourceUrl = 'https://www.pracuj.pl/praca/it;kw';
const offerUrl = 'https://www.pracuj.pl/praca/developer-warszawa,oferta,1001';

const settingsDatabase = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    version: 2,
    addresses: [],
    addressLinks: [],
    emailCampaigns: [],
    emailLinks: [],
    emails: [],
    eventOrganizationLinks: [],
    events: [],
    jobListings: [],
    legacyDemands: [],
    organizations: [
      {
        id: 'org-1',
        name: 'Acme Inc',
      },
    ],
    persons: [],
    phoneNumberLinks: [],
    phoneNumbers: [],
    valueParameterLinks: [],
    valueParameters: [],
    values: [],
    ...overrides,
  });

const createCollection = () => ({
  find: vi.fn(() => ({
    limit: vi.fn(() => ({
      toArray: vi.fn(async () => [
        {
          id: 'org-1',
          name: 'Acme Inc',
          tradingName: null,
        },
      ]),
    })),
  })),
});

describe('runFilemakerPracujScrape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValue(null);
    mocks.upsertFilemakerCampaignSettingValueMock.mockResolvedValue(true);
    mocks.getFilemakerOrganizationsCollectionMock.mockResolvedValue(createCollection());
    mocks.collectJobBoardOfferUrlsMock.mockResolvedValue({
      links: [{ title: 'Developer', url: offerUrl }],
      provider: 'pracuj_pl',
      runId: 'collect-run-1',
      sourceSite: 'pracuj.pl',
      sourceUrl,
      visitedUrls: [sourceUrl],
      warnings: [],
    });
    mocks.probeJobBoardOfferMock.mockResolvedValue({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: {
            min: 12_000,
            max: 18_000,
            currency: 'PLN',
            period: 'monthly',
            raw: '12 000 - 18 000 PLN',
          },
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.94,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-1',
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });
  });

  it('previews offers through the centralized job-board pracuj collector and probe', async () => {
    const result = await runFilemakerPracujScrape({
      headless: false,
      maxOffers: 5,
      mode: 'preview',
      sourceUrl,
    });

    expect(mocks.collectJobBoardOfferUrlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false,
        maxOffers: 5,
        provider: 'pracuj_pl',
        sourceUrl,
      })
    );
    expect(mocks.probeJobBoardOfferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        forcePlaywright: true,
        headless: false,
        provider: 'pracuj_pl',
        sourceUrl: offerUrl,
      })
    );
    expect(result.summary).toMatchObject({
      matchedOffers: 1,
      scrapedOffers: 1,
    });
    expect(result.offers[0]).toMatchObject({
      match: {
        organizationId: 'org-1',
        organizationName: 'Acme Inc',
      },
      offer: {
        companyName: 'Acme Inc',
        sourceUrl: offerUrl,
        title: 'Developer',
      },
      status: 'preview',
    });
    expect(mocks.upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });

  it('imports matched offers into Filemaker job listings', async () => {
    const result = await runFilemakerPracujScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary.createdListings).toBe(1);
    expect(mocks.upsertFilemakerCampaignSettingValueMock).toHaveBeenCalledWith(
      FILEMAKER_DATABASE_KEY,
      expect.any(String)
    );
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      organizationId: 'org-1',
      salaryCurrency: 'PLN',
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      title: 'Developer',
    });
  });

  it('probes a direct offer URL when link collection returns no category links', async () => {
    mocks.collectJobBoardOfferUrlsMock.mockResolvedValue({
      links: [],
      provider: 'pracuj_pl',
      runId: 'collect-run-1',
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      visitedUrls: [offerUrl],
      warnings: [],
    });

    const result = await runFilemakerPracujScrape({
      mode: 'preview',
      sourceUrl: offerUrl,
    });

    expect(mocks.probeJobBoardOfferMock).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: offerUrl })
    );
    expect(result.summary.scrapedOffers).toBe(1);
  });

  it('skips duplicate listings without persisting unchanged imports', async () => {
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValue(
      settingsDatabase({
        jobListings: [
          {
            id: 'listing-1',
            organizationId: 'org-1',
            title: 'Developer',
            description: 'Existing listing',
            sourceExternalId: '1001',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
            status: 'open',
          },
        ],
      })
    );

    const result = await runFilemakerPracujScrape({
      duplicateStrategy: 'skip',
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdListings: 0,
      skippedOffers: 1,
      updatedListings: 0,
    });
    expect(result.offers[0]).toMatchObject({
      listingId: 'listing-1',
      status: 'skipped',
    });
    expect(mocks.upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  collectPracujOfferUrlsMock: vi.fn(),
  getFilemakerOrganizationsCollectionMock: vi.fn(),
  probePracujJobOfferMock: vi.fn(),
  readFilemakerCampaignSettingValueMock: vi.fn(),
  upsertFilemakerCampaignSettingValueMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/job-board/server/providers/pracuj-pl-sync', () => ({
  collectPracujOfferUrls: (...args: unknown[]) => mocks.collectPracujOfferUrlsMock(...args),
}));

vi.mock('@/features/job-board/server/job-scans-service', () => ({
  probePracujJobOffer: (...args: unknown[]) => mocks.probePracujJobOfferMock(...args),
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
    mocks.collectPracujOfferUrlsMock.mockResolvedValue({
      links: [{ title: 'Developer', url: offerUrl }],
      runId: 'collect-run-1',
      sourceUrl,
      visitedUrls: [sourceUrl],
      warnings: [],
    });
    mocks.probePracujJobOfferMock.mockResolvedValue({
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
      runId: 'offer-run-1',
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

    expect(mocks.collectPracujOfferUrlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false,
        maxOffers: 5,
        sourceUrl,
      })
    );
    expect(mocks.probePracujJobOfferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        forcePlaywright: true,
        headless: false,
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
});

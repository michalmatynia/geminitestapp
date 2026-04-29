import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  collectJobBoardOfferUrlsDeterministicallyMock: vi.fn(),
  collectJobBoardOfferUrlsMock: vi.fn(),
  getFilemakerOrganizationsCollectionMock: vi.fn(),
  probeJobBoardOfferMock: vi.fn(),
  readFilemakerCampaignSettingValueMock: vi.fn(),
  resolveRuntimeActionExecutionSettingsMock: vi.fn(),
  upsertFilemakerCampaignSettingValueMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/job-board/server/providers/job-board-sync', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/job-board/server/providers/job-board-sync')>()),
  collectJobBoardOfferUrlsDeterministically: (...args: unknown[]) =>
    mocks.collectJobBoardOfferUrlsDeterministicallyMock(...args),
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

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  resolveRuntimeActionExecutionSettings: (...args: unknown[]) =>
    mocks.resolveRuntimeActionExecutionSettingsMock(...args),
}));

vi.mock('./filemaker-organizations-mongo', () => ({
  getFilemakerOrganizationsCollection: (...args: unknown[]) =>
    mocks.getFilemakerOrganizationsCollectionMock(...args),
  toFilemakerOrganization: (value: unknown) => value,
}));

import { defaultPlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';
import { FILEMAKER_DATABASE_KEY } from '../settings-constants';
import {
  applyFilemakerJobBoardLexiconClassifications,
  runFilemakerJobBoardScrape,
  saveFilemakerJobBoardScrapeDrafts,
} from './filemaker-job-board-scrape';
import { normalizeScrapedDateValue } from './job-board-scrape/offer-from-evaluation';

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
    jobListingLexiconLinks: [],
    legacyDemands: [],
    lexiconTerms: [],
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

const createCollection = (
  documents: Array<Record<string, unknown>> = [
    {
      id: 'org-1',
      name: 'Acme Inc',
      tradingName: null,
    },
  ]
) => ({
  find: vi.fn(() => ({
    limit: vi.fn(() => ({
      toArray: vi.fn(async () => documents),
    })),
  })),
  updateOne: vi.fn(async () => ({ acknowledged: true, modifiedCount: 1, upsertedCount: 0 })),
});

describe('runFilemakerJobBoardScrape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValue(null);
    mocks.resolveRuntimeActionExecutionSettingsMock.mockResolvedValue({
      ...defaultPlaywrightActionExecutionSettings,
      headless: true,
    });
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
    mocks.collectJobBoardOfferUrlsDeterministicallyMock.mockResolvedValue({
      links: [{ title: 'Developer', url: offerUrl }],
      provider: 'pracuj_pl',
      runId: null,
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
          postedAt: '2026-04-28T09:00:00.000Z',
          expiresAt: '2026-05-28T23:59:59.000Z',
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

  it('normalizes relative visible job-board dates against a reference date', () => {
    const referenceDate = new Date('2026-04-29T12:00:00.000Z');

    expect(normalizeScrapedDateValue('Opublikowano dzisiaj', referenceDate)).toBe('2026-04-29');
    expect(normalizeScrapedDateValue('Dodano wczoraj', referenceDate)).toBe('2026-04-28');
    expect(normalizeScrapedDateValue('Posted 2 days ago', referenceDate)).toBe('2026-04-27');
    expect(normalizeScrapedDateValue('opublikowano 3 dni temu', referenceDate)).toBe(
      '2026-04-26'
    );
    expect(normalizeScrapedDateValue('posted 6 hours ago', referenceDate)).toBe('2026-04-29');
  });

  it('previews offers through the centralized job-board pracuj collector and probe', async () => {
    const result = await runFilemakerJobBoardScrape({
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
        extractionPath: 'playwright_ai',
        forcePlaywright: true,
        headless: false,
        provider: 'pracuj_pl',
        sourceUrl: offerUrl,
      })
    );
    expect(result.summary).toMatchObject({
      matchedOffers: 0,
      scrapedOffers: 1,
    });
    expect(result.offers[0]).toMatchObject({
      match: null,
      offer: {
        companyName: 'Acme Inc',
        sourceUrl: offerUrl,
        title: 'Developer',
      },
      status: 'preview',
    });
    expect(mocks.upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });

  it('passes deterministic scraper path to offer probing', async () => {
    const result = await runFilemakerJobBoardScrape({
      extractionPath: 'deterministic',
      maxOffers: 5,
      mode: 'preview',
      sourceUrl,
    });

    expect(result.summary.scrapedOffers).toBe(1);
    expect(mocks.collectJobBoardOfferUrlsMock).not.toHaveBeenCalled();
    expect(mocks.collectJobBoardOfferUrlsDeterministicallyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'pracuj_pl',
        sourceUrl,
      })
    );
    expect(mocks.probeJobBoardOfferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extractionPath: 'deterministic',
        forcePlaywright: false,
        provider: 'pracuj_pl',
        sourceUrl: offerUrl,
      })
    );
  });

  it('skips already stored offer URLs before probing the offer page', async () => {
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValueOnce(
      settingsDatabase({
        jobListings: [
          {
            id: 'listing-1',
            organizationId: 'org-1',
            title: 'Developer',
            description: 'Existing listing',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
            status: 'open',
          },
        ],
      })
    );

    const result = await runFilemakerJobBoardScrape({
      maxOffers: 5,
      mode: 'preview',
      sourceUrl,
    });

    expect(mocks.probeJobBoardOfferMock).not.toHaveBeenCalled();
    expect(result.summary).toMatchObject({
      scrapedOffers: 1,
      skippedOffers: 1,
    });
    expect(result.offers[0]).toMatchObject({
      listingId: 'listing-1',
      status: 'skipped',
      match: {
        organizationId: 'org-1',
        organizationName: 'Acme Inc',
      },
    });
  });

  it('does not pre-skip existing offer URLs when always add is selected', async () => {
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValueOnce(
      settingsDatabase({
        jobListings: [
          {
            id: 'listing-1',
            organizationId: 'org-1',
            title: 'Developer',
            description: 'Existing listing',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
            status: 'open',
          },
        ],
      })
    );

    const result = await runFilemakerJobBoardScrape({
      duplicateStrategy: 'add',
      maxOffers: 5,
      mode: 'preview',
      sourceUrl,
    });

    expect(mocks.probeJobBoardOfferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceUrl: offerUrl,
      })
    );
    expect(result.summary).toMatchObject({
      scrapedOffers: 1,
      skippedOffers: 0,
    });
    expect(result.offers[0]).toMatchObject({
      status: 'preview',
      offer: {
        sourceUrl: offerUrl,
      },
    });
  });

  it('creates a new organisation instead of attaching unrelated offers to a short Ch match', async () => {
    mocks.readFilemakerCampaignSettingValueMock
      .mockResolvedValueOnce(
        settingsDatabase({
          organizations: [
            {
              id: 'org-ch',
              name: 'Ch',
            },
          ],
        })
      )
      .mockResolvedValueOnce(null);
    mocks.getFilemakerOrganizationsCollectionMock.mockResolvedValue(
      createCollection([
        {
          id: 'org-ch',
          name: 'Ch',
          tradingName: null,
        },
      ])
    );
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Tech Company' },
        listing: {
          title: 'Backend Developer',
          description: 'Build platforms',
          city: 'Krakow',
          salary: null,
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

    const result = await runFilemakerJobBoardScrape({
      maxOffers: 5,
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdListings: 1,
      createdOrganizations: 1,
      matchedOffers: 1,
    });
    expect(result.offers[0]?.match).toMatchObject({
      organizationName: 'Tech Company',
      reason: 'created from scraped job-board employer',
    });
    expect(result.offers[0]?.match?.organizationId).not.toBe('org-ch');
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.organizations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'org-ch', name: 'Ch' }),
        expect.objectContaining({ name: 'Tech Company' }),
      ])
    );
    expect(persisted.jobListings[0]).toMatchObject({
      organizationId: result.offers[0]?.match?.organizationId,
      title: 'Backend Developer',
    });
  });

  it('uses structured hiring organization instead of Pracuj employer-directory metadata', async () => {
    const badEmployerName =
      'Informacje i opinie o pracodawcach – profile pracodawców Poznań(wielkopolskie), Poznań, Poland';
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: badEmployerName },
        listing: {
          title: 'Backend Developer',
          description: 'Build vessel management integrations',
          city: 'Poznań',
          salary: null,
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
      runId: 'offer-run-real-employer',
      snapshot: {
        jsonLd: [
          JSON.stringify({
            '@type': 'JobPosting',
            hiringOrganization: {
              '@type': 'Organization',
              name: 'Baltic Logistics SA',
              url: 'https://www.pracuj.pl/pracodawcy/baltic-logistics,123',
            },
            title: 'Backend Developer',
          }),
        ],
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      maxOffers: 5,
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdListings: 1,
      createdOrganizations: 1,
      matchedOffers: 1,
    });
    expect(result.offers[0]?.offer.companyName).toBe('Baltic Logistics SA');
    expect(result.offers[0]?.match).toMatchObject({
      organizationName: 'Baltic Logistics SA',
      reason: 'created from scraped job-board employer',
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.organizations).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Baltic Logistics SA' })])
    );
    expect(persisted.organizations).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: badEmployerName })])
    );
  });

  it('uses Pracuj employer profile URL instead of generic discovery page title', async () => {
    const badEmployerName = 'Odkrywaj najlepsze miejsca pracy';
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: badEmployerName },
        listing: {
          title: 'Frontend Developer',
          description: 'Build React applications',
          city: 'Poznań',
          salary: null,
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
      runId: 'offer-run-profile-url-employer',
      snapshot: {
        companyLinks: ['https://www.pracuj.pl/pracodawcy/acme-software,987'],
        companyProfile: {
          headings: [badEmployerName],
          title: badEmployerName,
          url: 'https://www.pracuj.pl/pracodawcy/acme-software,987',
        },
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      maxOffers: 5,
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdListings: 1,
      createdOrganizations: 1,
      matchedOffers: 1,
    });
    expect(result.offers[0]?.offer.companyName).toBe('Acme Software');
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.organizations).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Acme Software' })])
    );
    expect(persisted.organizations).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: badEmployerName })])
    );
  });

  it('does not create an organisation when Pracuj directory metadata is the only employer name', async () => {
    const badEmployerName =
      'Informacje i opinie o pracodawcach – profile pracodawców Poznań(wielkopolskie), Poznań, Poland';
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: badEmployerName },
        listing: {
          title: 'Backend Developer',
          description: 'Build vessel management integrations',
          city: 'Poznań',
          salary: null,
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
      runId: 'offer-run-bad-employer',
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      maxOffers: 5,
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdListings: 0,
      createdOrganizations: 0,
      matchedOffers: 0,
      scrapedOffers: 0,
    });
    expect(mocks.upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });

  it('falls back to Playwright link collection when the combined path finds no deterministic links', async () => {
    mocks.collectJobBoardOfferUrlsDeterministicallyMock.mockResolvedValueOnce({
      links: [],
      provider: 'pracuj_pl',
      runId: null,
      sourceSite: 'pracuj.pl',
      sourceUrl,
      visitedUrls: [sourceUrl],
      warnings: [],
    });

    const result = await runFilemakerJobBoardScrape({
      extractionPath: 'deterministic_then_playwright',
      maxOffers: 5,
      mode: 'preview',
      sourceUrl,
    });

    expect(result.summary.scrapedOffers).toBe(1);
    expect(mocks.collectJobBoardOfferUrlsDeterministicallyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'pracuj_pl',
        sourceUrl,
      })
    );
    expect(mocks.collectJobBoardOfferUrlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'pracuj_pl',
        sourceUrl,
      })
    );
    expect(mocks.probeJobBoardOfferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extractionPath: 'deterministic_then_playwright',
        forcePlaywright: true,
        provider: 'pracuj_pl',
        sourceUrl: offerUrl,
      })
    );
  });

  it('uses a direct offer URL without browser link collection on the deterministic path', async () => {
    await runFilemakerJobBoardScrape({
      extractionPath: 'deterministic',
      maxOffers: 5,
      mode: 'preview',
      sourceUrl: offerUrl,
    });

    expect(mocks.collectJobBoardOfferUrlsMock).not.toHaveBeenCalled();
    expect(mocks.collectJobBoardOfferUrlsDeterministicallyMock).not.toHaveBeenCalled();
    expect(mocks.probeJobBoardOfferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        extractionPath: 'deterministic',
        forcePlaywright: false,
        sourceUrl: offerUrl,
      })
    );
  });

  it('does not probe a Pracuj category URL as an offer when deterministic link collection is empty', async () => {
    mocks.collectJobBoardOfferUrlsDeterministicallyMock.mockResolvedValueOnce({
      links: [],
      provider: 'pracuj_pl',
      runId: null,
      sourceSite: 'pracuj.pl',
      sourceUrl,
      visitedUrls: [sourceUrl],
      warnings: [],
    });

    const result = await runFilemakerJobBoardScrape({
      extractionPath: 'deterministic',
      maxOffers: 5,
      mode: 'preview',
      sourceUrl,
    });

    expect(result.summary.scrapedOffers).toBe(0);
    expect(mocks.probeJobBoardOfferMock).not.toHaveBeenCalled();
    expect(result.warnings).toContain(`No job offer links were found on ${sourceUrl}.`);
  });

  it('emits live scrape events while collecting and probing offers', async () => {
    const events: Array<Record<string, unknown>> = [];

    const result = await runFilemakerJobBoardScrape(
      {
        maxOffers: 5,
        mode: 'preview',
        sourceUrl,
      },
      {
        onEvent: (event) => {
          events.push(event as unknown as Record<string, unknown>);
        },
      }
    );

    expect(result.summary.scrapedOffers).toBe(1);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: 'Preparing job-board scraper.', type: 'status' }),
        expect.objectContaining({ type: 'links', urls: [offerUrl] }),
        expect.objectContaining({
          index: 1,
          result: expect.objectContaining({
            offer: expect.objectContaining({ companyName: 'Acme Inc', title: 'Developer' }),
            status: 'preview',
          }),
          total: 1,
          type: 'offer',
        }),
        expect.objectContaining({ result, type: 'done' }),
      ])
    );
  });

  it('uses the job-board runtime action browser mode when no run override is provided', async () => {
    mocks.resolveRuntimeActionExecutionSettingsMock.mockResolvedValueOnce({
      ...defaultPlaywrightActionExecutionSettings,
      headless: false,
    });

    const result = await runFilemakerJobBoardScrape({
      maxOffers: 5,
      mode: 'preview',
      sourceUrl,
    });

    expect(mocks.collectJobBoardOfferUrlsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: null,
        sourceUrl,
      })
    );
    expect(mocks.probeJobBoardOfferMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: null,
        sourceUrl: offerUrl,
      })
    );
    expect(result.browserMode).toBe('headed');
  });

  it('imports scraped offers into Filemaker job listings under scraped employer organisations', async () => {
    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary.createdListings).toBe(1);
    expect(mocks.upsertFilemakerCampaignSettingValueMock).toHaveBeenCalledWith(
      FILEMAKER_DATABASE_KEY,
      expect.any(String)
    );
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    const organizationId = result.offers[0]?.match?.organizationId;
    expect(persisted.organizations[0]).toMatchObject({
      id: organizationId,
      name: 'Acme Inc',
    });
    expect(persisted.jobListings[0]).toMatchObject({
      expiresAt: '2026-05-28T23:59:59.000Z',
      organizationId,
      postedAt: '2026-04-28T09:00:00.000Z',
      salaryCurrency: 'PLN',
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      title: 'Developer',
    });
    expect(mocks.readFilemakerCampaignSettingValueMock).toHaveBeenCalledTimes(2);
  });

  it('stores evaluator listing metadata as reusable lexicon pills', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          contractType: 'b2b',
          employmentType: 'full-time',
          experienceLevel: 'senior',
          workMode: 'remote',
          technologies: ['React', 'TypeScript'],
          benefits: ['private medical care'],
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
      runId: 'offer-run-listing-lexicon',
      snapshot: { provider: 'pracuj_pl' },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdLexiconTerms: 7,
      createdListings: 1,
      linkedLexiconTerms: 7,
    });
    expect(result.offers[0]?.offer.pills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'contract_type', label: 'B2B contract' }),
        expect.objectContaining({ category: 'employment_type', label: 'full-time' }),
        expect.objectContaining({ category: 'experience_level', label: 'senior' }),
        expect.objectContaining({ category: 'work_mode', label: 'remote work' }),
        expect.objectContaining({ category: 'technology', label: 'React' }),
        expect.objectContaining({ category: 'technology', label: 'TypeScript' }),
        expect.objectContaining({ category: 'benefit', label: 'private medical care' }),
      ])
    );
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.lexiconTerms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'technology', label: 'React' }),
        expect.objectContaining({ category: 'technology', label: 'TypeScript' }),
        expect.objectContaining({ category: 'benefit', label: 'private medical care' }),
      ])
    );
    expect(persisted.jobListings[0].lexiconTermIds).toHaveLength(7);
  });

  it('stores sequencer snapshot facts as reusable lexicon pills', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.84,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-snapshot-lexicon',
      snapshot: {
        facts: [
          { label: 'Employment type', value: 'FULL_TIME' },
          { label: 'Work mode', value: 'HYBRID' },
          { label: 'Experience level', value: 'Senior' },
          { label: 'Technologies', value: 'React, TypeScript' },
          { label: 'Benefits', value: 'private medical care' },
        ],
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdLexiconTerms: 6,
      createdListings: 1,
      linkedLexiconTerms: 6,
    });
    expect(result.offers[0]?.offer.pills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'employment_type', label: 'full-time' }),
        expect.objectContaining({ category: 'work_mode', label: 'hybrid' }),
        expect.objectContaining({ category: 'experience_level', label: 'Senior' }),
        expect.objectContaining({ category: 'technology', label: 'React' }),
        expect.objectContaining({ category: 'technology', label: 'TypeScript' }),
        expect.objectContaining({ category: 'benefit', label: 'private medical care' }),
      ])
    );
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0].lexiconTermIds).toHaveLength(6);
  });

  it('does not persist raw Pracuj location and assistant pills as Other lexicon terms', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Frontend Developer',
          description: 'Build products',
          city: 'Wrocław',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.84,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-pracuj-noisy-pills',
      snapshot: {
        pills: ['React', 'TypeScript', 'Lower Silesia', 'Asystent Pracuj.pl'],
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdLexiconTerms: 2,
      createdListings: 1,
      linkedLexiconTerms: 2,
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.lexiconTerms).toEqual([
      expect.objectContaining({ category: 'technology', typeKey: 'technology', label: 'React' }),
      expect.objectContaining({
        category: 'technology',
        typeKey: 'technology',
        label: 'TypeScript',
      }),
    ]);
    expect(persisted.lexiconTerms.map((term: { label: string }) => term.label)).not.toEqual(
      expect.arrayContaining(['Lower Silesia', 'Asystent Pracuj.pl'])
    );
    expect(persisted.jobListings[0].lexiconTermIds).toHaveLength(2);
  });

  it('normalizes visible Polish posted and expiry dates before persisting listings', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
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
      runId: 'offer-run-dates',
      snapshot: {
        facts: [
          { label: 'Opublikowano', value: 'Opublikowano 28 kwietnia 2026' },
          { label: 'Ważna do', value: 'Oferta ważna do 28 maja 2026' },
        ],
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary.createdListings).toBe(1);
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      expiresAt: '2026-05-28',
      organizationId: result.offers[0]?.match?.organizationId,
      postedAt: '2026-04-28',
      sourceUrl: offerUrl,
      title: 'Developer',
    });
  });

  it('fills posted and expiry dates from sequencer plain text when visible facts are missing', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.84,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-plain-text-dates',
      snapshot: {
        plainText:
          'Frontend Developer Acme Inc Opublikowano 28 kwietnia 2026 Oferta ważna do 28 maja 2026 Aplikuj teraz',
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary.createdListings).toBe(1);
    expect(result.offers[0].offer).toMatchObject({
      expiresAt: '2026-05-28',
      postedAt: '2026-04-28',
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      expiresAt: '2026-05-28',
      postedAt: '2026-04-28',
    });
  });

  it('fills salary fields from JobPosting JSON-LD when the evaluator misses salary data', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.83,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-jsonld-salary',
      snapshot: {
        jsonLd: [
          JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'JobPosting',
            title: 'Developer',
            baseSalary: {
              '@type': 'MonetaryAmount',
              currency: 'PLN',
              value: {
                '@type': 'QuantitativeValue',
                minValue: 12_000,
                maxValue: 18_000,
                unitText: 'MONTH',
              },
            },
          }),
        ],
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary.createdListings).toBe(1);
    expect(result.offers[0].offer).toMatchObject({
      salaryCurrency: 'PLN',
      salaryMax: 18_000,
      salaryMin: 12_000,
      salaryPeriod: 'monthly',
      salaryText: '12000 - 18000 PLN MONTH',
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      salaryCurrency: 'PLN',
      salaryMax: 18_000,
      salaryMin: 12_000,
      salaryPeriod: 'monthly',
    });
  });

  it('fills salary fields from visible sequencer salary facts when JSON-LD is missing', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.83,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-fact-salary',
      snapshot: {
        facts: [{ label: 'Wynagrodzenie', value: '120 - 160 zł / godz.' }],
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary.createdListings).toBe(1);
    expect(result.offers[0].offer).toMatchObject({
      salaryCurrency: 'PLN',
      salaryMax: 160,
      salaryMin: 120,
      salaryPeriod: 'hourly',
      salaryText: '120 - 160 zł / godz.',
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      salaryCurrency: 'PLN',
      salaryMax: 160,
      salaryMin: 120,
      salaryPeriod: 'hourly',
    });
  });

  it('fills salary fields from visible sequencer salary pills with compact k amounts', async () => {
    const justJoinSourceUrl = 'https://justjoin.it/';
    const justJoinOfferUrl = 'https://justjoin.it/job-offer/acme-developer';
    mocks.collectJobBoardOfferUrlsMock.mockResolvedValueOnce({
      links: [{ title: 'Developer', url: justJoinOfferUrl }],
      provider: 'justjoin_it',
      runId: 'collect-run-justjoin-salary',
      sourceSite: 'justjoin.it',
      sourceUrl: justJoinSourceUrl,
      visitedUrls: [justJoinSourceUrl],
      warnings: [],
    });
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.83,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: justJoinOfferUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'justjoin_it',
      runId: 'offer-run-pill-salary',
      snapshot: {
        pills: ['18k - 24k PLN net/month', 'remote'],
        provider: 'justjoin_it',
      },
      sourceSite: 'justjoin.it',
      sourceUrl: justJoinOfferUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      provider: 'justjoin_it',
      sourceUrl: justJoinSourceUrl,
    });

    expect(result.summary.createdListings).toBe(1);
    expect(result.offers[0].offer).toMatchObject({
      salaryCurrency: 'PLN',
      salaryMax: 24_000,
      salaryMin: 18_000,
      salaryPeriod: 'monthly',
      salaryText: '18k - 24k PLN net/month',
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      salaryCurrency: 'PLN',
      salaryMax: 24_000,
      salaryMin: 18_000,
      salaryPeriod: 'monthly',
    });
  });

  it('fills salary currency from visible symbol currency salary pills', async () => {
    const noFluffSourceUrl = 'https://nofluffjobs.com/pl';
    const noFluffOfferUrl = 'https://nofluffjobs.com/pl/job/frontend-dev-acme';
    mocks.collectJobBoardOfferUrlsMock.mockResolvedValueOnce({
      links: [{ title: 'Frontend Developer', url: noFluffOfferUrl }],
      provider: 'nofluffjobs',
      runId: 'collect-run-nofluff-symbol-salary',
      sourceSite: 'nofluffjobs.com',
      sourceUrl: noFluffSourceUrl,
      visitedUrls: [noFluffSourceUrl],
      warnings: [],
    });
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Frontend Developer',
          description: 'Build interfaces',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.83,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: noFluffOfferUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'nofluffjobs',
      runId: 'offer-run-symbol-salary',
      snapshot: {
        pills: ['€4,000 - €6,000 gross/month', 'remote'],
        provider: 'nofluffjobs',
      },
      sourceSite: 'nofluffjobs.com',
      sourceUrl: noFluffOfferUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      provider: 'nofluffjobs',
      sourceUrl: noFluffSourceUrl,
    });

    expect(result.summary.createdListings).toBe(1);
    expect(result.offers[0].offer).toMatchObject({
      salaryCurrency: 'EUR',
      salaryMax: 6_000,
      salaryMin: 4_000,
      salaryPeriod: 'monthly',
      salaryText: '€4,000 - €6,000 gross/month',
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      salaryCurrency: 'EUR',
      salaryMax: 6_000,
      salaryMin: 4_000,
      salaryPeriod: 'monthly',
    });
  });

  it('keeps single-bound visible salary pills as min-only or max-only values', async () => {
    const justJoinSourceUrl = 'https://justjoin.it/';
    const justJoinOfferUrl = 'https://justjoin.it/job-offer/acme-senior-developer';
    const justJoinMinOfferUrl = 'https://justjoin.it/job-offer/acme-mid-developer';
    mocks.collectJobBoardOfferUrlsMock.mockResolvedValueOnce({
      links: [
        { title: 'Senior Developer', url: justJoinOfferUrl },
        { title: 'Mid Developer', url: justJoinMinOfferUrl },
      ],
      provider: 'justjoin_it',
      runId: 'collect-run-justjoin-single-bound-salary',
      sourceSite: 'justjoin.it',
      sourceUrl: justJoinSourceUrl,
      visitedUrls: [justJoinSourceUrl],
      warnings: [],
    });
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Senior Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.83,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: justJoinOfferUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'justjoin_it',
      runId: 'offer-run-single-bound-salary',
      snapshot: {
        pills: ['up to 24k PLN net/month', 'remote'],
        provider: 'justjoin_it',
      },
      sourceSite: 'justjoin.it',
      sourceUrl: justJoinOfferUrl,
      steps: [],
    });
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Mid Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.83,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: justJoinMinOfferUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'justjoin_it',
      runId: 'offer-run-single-lower-bound-salary',
      snapshot: {
        pills: ['from 18k PLN net/month', 'remote'],
        provider: 'justjoin_it',
      },
      sourceSite: 'justjoin.it',
      sourceUrl: justJoinMinOfferUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      delayMs: 0,
      mode: 'import',
      provider: 'justjoin_it',
      sourceUrl: justJoinSourceUrl,
    });

    expect(result.summary.createdListings).toBe(2);
    expect(result.offers[0].offer).toMatchObject({
      salaryCurrency: 'PLN',
      salaryMax: 24_000,
      salaryMin: null,
      salaryPeriod: 'monthly',
      salaryText: 'up to 24k PLN net/month',
    });
    expect(result.offers[1].offer).toMatchObject({
      salaryCurrency: 'PLN',
      salaryMax: null,
      salaryMin: 18_000,
      salaryPeriod: 'monthly',
      salaryText: 'from 18k PLN net/month',
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          salaryCurrency: 'PLN',
          salaryMax: 24_000,
          salaryMin: null,
          salaryPeriod: 'monthly',
        }),
        expect.objectContaining({
          salaryCurrency: 'PLN',
          salaryMax: null,
          salaryMin: 18_000,
          salaryPeriod: 'monthly',
        }),
      ])
    );
  });

  it('fills salary fields from salary lines in sequencer plain text snapshots', async () => {
    const noFluffSourceUrl = 'https://nofluffjobs.com/pl';
    const noFluffOfferUrl = 'https://nofluffjobs.com/pl/job/backend-dev-acme';
    mocks.collectJobBoardOfferUrlsMock.mockResolvedValueOnce({
      links: [{ title: 'Backend Developer', url: noFluffOfferUrl }],
      provider: 'nofluffjobs',
      runId: 'collect-run-nofluff-salary',
      sourceSite: 'nofluffjobs.com',
      sourceUrl: noFluffSourceUrl,
      visitedUrls: [noFluffSourceUrl],
      warnings: [],
    });
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Backend Developer',
          description: 'Build APIs',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.83,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: noFluffOfferUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'nofluffjobs',
      runId: 'offer-run-plain-text-salary',
      snapshot: {
        plainText:
          'Backend Developer Acme Inc. Experience senior. Salary 20 000 - 28 000 PLN net/month. Benefits private medical care.',
        provider: 'nofluffjobs',
      },
      sourceSite: 'nofluffjobs.com',
      sourceUrl: noFluffOfferUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      provider: 'nofluffjobs',
      sourceUrl: noFluffSourceUrl,
    });

    expect(result.summary.createdListings).toBe(1);
    expect(result.offers[0].offer).toMatchObject({
      salaryCurrency: 'PLN',
      salaryMax: 28_000,
      salaryMin: 20_000,
      salaryPeriod: 'monthly',
    });
    expect(result.offers[0].offer.salaryText).toContain('Salary 20 000 - 28 000 PLN net/month');
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      salaryCurrency: 'PLN',
      salaryMax: 28_000,
      salaryMin: 20_000,
      salaryPeriod: 'monthly',
    });
  });

  it('creates offers from sequencer snapshot data when the evaluator returns no fields', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: null,
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-snapshot-fallback',
      snapshot: {
        facts: [{ label: 'Location', value: 'Kraków' }],
        companyProfile: {
          facts: [
            { label: 'KRS', value: '0000123456' },
            { label: 'REGON', value: '012345678' },
          ],
          headings: ['Acme Inc'],
          plainText: null,
          sections: [],
          title: 'Acme Inc',
          url: null,
          websiteUrls: ['https://acme.example', 'https://www.facebook.com/acmeinc'],
        },
        jsonLd: [
          JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'JobPosting',
            title: 'Snapshot Backend Developer',
            datePosted: '2026-04-20',
            validThrough: '2026-05-20',
            hiringOrganization: {
              '@type': 'Organization',
              name: 'Acme Inc',
              url: 'https://acme.example/careers',
              sameAs: ['https://www.linkedin.com/company/acme-inc', 'https://github.com/acme'],
              description: 'Acme builds enterprise commerce systems.',
              industry: 'Enterprise software',
              numberOfEmployees: 250,
              taxID: '5210123456',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Konstruktorska 12A',
                postalCode: '02-673',
                addressLocality: 'Warszawa',
                addressCountry: 'Poland',
              },
            },
            jobLocation: {
              '@type': 'Place',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Rynek 1',
                postalCode: '31-042',
                addressLocality: 'Kraków',
                addressRegion: 'Małopolskie',
                addressCountry: 'Poland',
              },
            },
          }),
        ],
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdListings: 1,
      matchedOffers: 1,
      skippedOffers: 0,
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    const organizationId = result.offers[0]?.match?.organizationId;
    const organization = persisted.organizations.find(
      (entry: { id?: string }) => entry.id === organizationId
    );
    expect(persisted.jobListings[0]).toMatchObject({
      expiresAt: '2026-05-20',
      location: 'Kraków',
      organizationId,
      postedAt: '2026-04-20',
      sourceUrl: offerUrl,
      title: 'Snapshot Backend Developer',
    });
    expect(organization).toMatchObject({
      jobBoardCompanyProfileUrl: 'https://acme.example/careers',
    });
    expect(organization.jobBoardCompanyProfile).toContain(
      'Description: Acme builds enterprise commerce systems.'
    );
    expect(organization.jobBoardCompanyProfile).toContain(
      'Website: https://acme.example'
    );
    expect(organization.jobBoardCompanyProfile).toContain(
      'Profile URL: https://acme.example/careers'
    );
    expect(organization.jobBoardCompanyProfile).toContain(
      'Social URL: https://www.linkedin.com/company/acme-inc'
    );
    expect(organization.jobBoardCompanyProfile).toContain(
      'Social URL: https://www.facebook.com/acmeinc'
    );
    expect(organization.jobBoardCompanyProfile).toContain(
      'Social URL: https://github.com/acme'
    );
    expect(organization.jobBoardCompanyProfile).toContain(
      'Industry: Enterprise software'
    );
    expect(organization.jobBoardCompanyProfile).toContain('Company size: 250');
    expect(organization.jobBoardCompanyProfile).toContain('NIP: 5210123456');
    expect(organization.jobBoardCompanyProfile).toContain('KRS: 0000123456');
    expect(organization.jobBoardCompanyProfile).toContain('REGON: 012345678');
    expect(organization.jobBoardCompanyProfile).toContain(
      'Address: Konstruktorska 12A, 02-673 Warszawa, Poland'
    );
    expect(persisted.lexiconTerms).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ category: 'address' })])
    );
  });

  it('falls back to sequencer job sections for scraped offer descriptions', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: '',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.88,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-description-fallback',
      snapshot: {
        facts: [],
        provider: 'pracuj_pl',
        sections: [
          {
            heading: 'Opis stanowiska',
            text: 'Build merchant dashboards from the sequencer snapshot.',
          },
          {
            heading: 'Wymagania',
            text: 'React, TypeScript, and production ownership.',
          },
          {
            heading: 'Informacje o firmie',
            text: 'Company background for Acme should remain in the profile area.',
          },
        ],
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary.createdListings).toBe(1);
    expect(result.offers[0].offer.description).toContain('Opis stanowiska');
    expect(result.offers[0].offer.description).toContain(
      'Build merchant dashboards from the sequencer snapshot.'
    );
    expect(result.offers[0].offer.description).toContain('Wymagania');
    expect(result.offers[0].offer.description).not.toContain('Company background for Acme');
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0].description).toContain(
      'Build merchant dashboards from the sequencer snapshot.'
    );
    expect(persisted.jobListings[0].description).toContain(
      'React, TypeScript, and production ownership.'
    );
  });

  it('extracts job listing addresses from company profile text when structured address data is missing', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.82,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-profile-text-address',
      snapshot: {
        companyProfile: {
          facts: [],
          headings: ['Acme Inc'],
          plainText:
            'Dane firmy. Strona internetowa: https://acme.example. E-mail: Kontakt@Acme.Example. Telefon: +48 22 123 45 67. Branża: IT consulting. Zatrudnienie: 201-500 pracowników. Adres siedziby: Prosta 20, 00-850 Warszawa. NIP 5210123456.',
          sections: [],
          title: 'Acme Inc',
          url: 'https://www.pracuj.pl/pracodawcy/acme,1001',
          websiteUrls: [],
        },
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      addressUpdates: 1,
      createdListings: 1,
      matchedOffers: 1,
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.addresses[0]).toMatchObject({
      city: 'Warszawa',
      country: 'Poland',
      countryId: 'PL',
      postalCode: '00-850',
      street: 'Prosta',
      streetNumber: '20',
    });
    expect(persisted.jobListings[0]).toMatchObject({
      addressId: persisted.addresses[0].id,
      city: 'Warszawa',
      country: 'Poland',
      countryId: 'PL',
      postalCode: '00-850',
      street: 'Prosta',
      streetNumber: '20',
    });
    expect(persisted.addressLinks[0]).toMatchObject({
      addressId: persisted.addresses[0].id,
      isDefault: true,
      ownerId: persisted.jobListings[0].id,
      ownerKind: 'job_listing',
    });
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain(
      'Address: Prosta 20, 00-850 Warszawa, Poland'
    );
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain(
      'Website: https://acme.example'
    );
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain(
      'Email: kontakt@acme.example'
    );
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain(
      'Phone: +48 22 123 45 67'
    );
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain('Industry: IT consulting');
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain(
      'Company size: 201-500 pracowników'
    );
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain('NIP: 5210123456');
    expect(persisted.lexiconTerms).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ category: 'address' })])
    );
  });

  it('extracts job listing addresses from company profile text without postal codes', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.82,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-profile-text-address-no-postal',
      snapshot: {
        companyProfile: {
          facts: [],
          headings: ['Acme Inc'],
          plainText:
            'Dane firmy. Adres siedziby: Puławska 180, Mokotów, Warszawa(Masovian). Branża: IT consulting.',
          sections: [],
          title: 'Acme Inc',
          url: 'https://www.pracuj.pl/pracodawcy/acme,1001',
          websiteUrls: [],
        },
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      addressUpdates: 1,
      createdListings: 1,
      matchedOffers: 1,
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.addresses[0]).toMatchObject({
      city: 'Warszawa',
      country: 'Poland',
      countryId: 'PL',
      postalCode: '',
      street: 'Puławska',
      streetNumber: '180',
    });
    expect(persisted.jobListings[0]).toMatchObject({
      addressId: persisted.addresses[0].id,
      city: 'Warszawa',
      country: 'Poland',
      countryId: 'PL',
      postalCode: '',
      street: 'Puławska',
      streetNumber: '180',
    });
    expect(persisted.addressLinks[0]).toMatchObject({
      addressId: persisted.addresses[0].id,
      isDefault: true,
      ownerId: persisted.jobListings[0].id,
      ownerKind: 'job_listing',
    });
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain(
      'Address: Puławska 180, Mokotów, Warszawa(Masovian)'
    );
    expect(persisted.lexiconTerms).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ category: 'address' })])
    );
  });

  it('extracts job listing addresses from company profile text without district or postal code', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
          postedAt: null,
          expiresAt: null,
        },
        confidence: 0.82,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-profile-text-address-no-district',
      snapshot: {
        companyProfile: {
          facts: [],
          headings: ['Acme Inc'],
          plainText:
            'Dane firmy. Adres siedziby: Puławska 180, Warszawa(Masovian). Branża: IT consulting.',
          sections: [],
          title: 'Acme Inc',
          url: 'https://www.pracuj.pl/pracodawcy/acme,1001',
          websiteUrls: [],
        },
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      addressUpdates: 1,
      createdListings: 1,
      matchedOffers: 1,
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.addresses[0]).toMatchObject({
      city: 'Warszawa',
      country: 'Poland',
      countryId: 'PL',
      postalCode: '',
      street: 'Puławska',
      streetNumber: '180',
    });
    expect(persisted.jobListings[0]).toMatchObject({
      addressId: persisted.addresses[0].id,
      city: 'Warszawa',
      country: 'Poland',
      countryId: 'PL',
      postalCode: '',
      street: 'Puławska',
      streetNumber: '180',
    });
    expect(persisted.addressLinks[0]).toMatchObject({
      addressId: persisted.addresses[0].id,
      isDefault: true,
      ownerId: persisted.jobListings[0].id,
      ownerKind: 'job_listing',
    });
    expect(persisted.lexiconTerms).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ category: 'address' })])
    );
  });

  it('creates scraped employer organisations instead of matching settings-only organisations', async () => {
    const mongoCollection = createCollection([]);
    mocks.getFilemakerOrganizationsCollectionMock.mockResolvedValue(mongoCollection);
    mocks.readFilemakerCampaignSettingValueMock
      .mockResolvedValueOnce(
        settingsDatabase({
          organizations: [
            {
              id: 'org-1',
              name: 'Acme Inc',
              createdAt: '2020-01-01T00:00:00.000Z',
              updatedAt: '2020-01-01T00:00:00.000Z',
            },
          ],
        })
      )
      .mockResolvedValueOnce(null);

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdListings: 1,
      createdOrganizations: 1,
      matchedOffers: 1,
      verifiedListings: 1,
    });
    const organizationId = result.offers[0]?.match?.organizationId;
    expect(organizationId).toEqual(expect.stringContaining('filemaker-job-board-organization-'));
    expect(organizationId).not.toBe('org-1');
    expect(mongoCollection.updateOne).toHaveBeenCalledWith(
      { id: organizationId },
      {
        $set: expect.objectContaining({
          id: organizationId,
          name: 'Acme Inc',
          updatedBy: 'filemaker:job-board-scrape',
        }),
        $setOnInsert: expect.objectContaining({
          _id: organizationId,
          createdAt: expect.any(String),
        }),
      },
      { upsert: true }
    );
    const update = mongoCollection.updateOne.mock.calls[0]?.[1] as {
      $setOnInsert?: { createdAt?: string };
    };
    expect(update.$setOnInsert?.createdAt).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('saves already scraped offer drafts without collecting or probing again', async () => {
    const result = await saveFilemakerJobBoardScrapeDrafts({
      action: 'save_drafts',
      duplicateStrategy: 'skip',
      importStrategy: 'create_unmatched',
      minimumMatchConfidence: 85,
      offers: [
        {
          companyName: 'Acme Inc',
          companyProfile: 'Acme Inc builds commerce software.',
          companyProfileUrl: 'https://www.pracuj.pl/pracodawcy/acme,1001',
          description: 'Build products',
          expiresAt: null,
          location: 'Warszawa',
          postedAt: null,
          salaryCurrency: 'PLN',
          salaryMax: 18_000,
          salaryMin: 12_000,
          salaryPeriod: 'monthly',
          salaryText: '12 000 - 18 000 PLN',
          sourceExternalId: '1001',
          sourceSite: 'pracuj.pl',
          sourceUrl: offerUrl,
          pills: [],
          title: 'Developer',
        },
      ],
      organizationScope: 'all',
      provider: 'auto',
      selectedOrganizationIds: [],
      sourceUrl,
      status: 'open',
    });

    expect(mocks.collectJobBoardOfferUrlsMock).not.toHaveBeenCalled();
    expect(mocks.probeJobBoardOfferMock).not.toHaveBeenCalled();
    expect(result.summary).toMatchObject({
      createdListings: 1,
      createdOrganizations: 1,
      matchedOffers: 1,
      scrapedOffers: 1,
      verifiedListings: 1,
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      sourceUrl: offerUrl,
      title: 'Developer',
    });
    expect(persisted.jobListings[0].organizationId).toEqual(result.offers[0]?.match?.organizationId);
    expect(persisted.jobListings[0].organizationId).not.toBe('org-1');
  });

  it('skips existing listings when manually saving scraped drafts with skip selected', async () => {
    mocks.readFilemakerCampaignSettingValueMock
      .mockResolvedValueOnce(
        settingsDatabase({
          addresses: [
            {
              id: 'address-warszawa',
              city: 'Warszawa',
              country: 'Poland',
              countryId: 'PL',
              postalCode: '',
              street: '',
              streetNumber: '',
            },
          ],
          addressLinks: [
            {
              id: 'address-link-listing-1',
              addressId: 'address-warszawa',
              isDefault: true,
              ownerId: 'listing-1',
              ownerKind: 'job_listing',
            },
          ],
          jobListings: [
            {
              id: 'listing-1',
              addressId: 'address-warszawa',
              city: 'Warszawa',
              country: 'Poland',
              countryId: 'PL',
              organizationId: 'org-1',
              postalCode: '',
              street: '',
              streetNumber: '',
              title: 'Developer',
              description: 'Existing listing',
              sourceExternalId: '1001',
              sourceSite: 'pracuj.pl',
              sourceUrl: offerUrl,
              status: 'open',
            },
          ],
        })
      )
      .mockResolvedValueOnce(null);

    const result = await saveFilemakerJobBoardScrapeDrafts({
      action: 'save_drafts',
      duplicateStrategy: 'skip',
      importStrategy: 'create_unmatched',
      minimumMatchConfidence: 85,
      offers: [
        {
          companyName: 'Acme Inc',
          companyProfile: '',
          companyProfileUrl: null,
          description: 'Updated description from preview',
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
          sourceUrl: offerUrl,
          pills: [],
          title: 'Developer',
        },
      ],
      organizationScope: 'all',
      provider: 'auto',
      selectedOrganizationIds: [],
      sourceUrl,
      status: 'open',
    });

    expect(result.summary).toMatchObject({
      createdListings: 0,
      matchedOffers: 1,
      scrapedOffers: 1,
      skippedOffers: 1,
      updatedListings: 0,
      verifiedListings: 1,
    });
    expect(result.offers[0]).toMatchObject({
      listingId: 'listing-1',
      status: 'skipped',
    });
    expect(mocks.upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });

  it('stores scraped job-board pills as lexicon terms and maps scraped location to a job listing address', async () => {
    const events: Array<Record<string, unknown>> = [];
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
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
      runId: 'offer-run-lexicon',
      snapshot: {
        pills: [
          'Puławska 180, Mokotów, Warszawa(Masovian)',
          'contract of employment, B2B contract',
          'full-time',
          'specialist (Mid / Regular)',
          'full office work',
          'Immediate employment',
        ],
        provider: 'pracuj_pl',
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape(
      {
        mode: 'import',
        sourceUrl,
      },
      {
        onEvent: (event) => {
          events.push(event as unknown as Record<string, unknown>);
        },
      }
    );

    expect(result.summary).toMatchObject({
      addressUpdates: 1,
      createdLexiconTerms: 5,
      createdListings: 1,
      linkedLexiconTerms: 5,
      verifiedListings: 1,
    });
    expect(result.offers[0]?.offer.pills.map((pill) => pill.category)).toEqual([
      'contract_type',
      'employment_type',
      'experience_level',
      'work_mode',
      'start_date',
    ]);
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.addresses[0]).toMatchObject({
      city: 'Warszawa',
      country: 'Poland',
      countryId: 'PL',
      postalCode: '',
      street: 'Puławska',
      streetNumber: '180',
    });
    expect(persisted.jobListings[0]).toMatchObject({
      addressId: persisted.addresses[0].id,
      city: 'Warszawa',
      country: 'Poland',
      countryId: 'PL',
      postalCode: '',
      street: 'Puławska',
      streetNumber: '180',
    });
    expect(persisted.addressLinks[0]).toMatchObject({
      addressId: persisted.addresses[0].id,
      isDefault: true,
      ownerId: persisted.jobListings[0].id,
      ownerKind: 'job_listing',
    });
    expect(persisted.lexiconTerms).toHaveLength(5);
    expect(persisted.jobListingLexiconLinks).toHaveLength(5);
    expect(persisted.jobListings[0].lexiconTermIds).toHaveLength(5);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'write',
          write: expect.objectContaining({ action: 'listing_address_updated' }),
        }),
        expect.objectContaining({
          type: 'write',
          write: expect.objectContaining({ action: 'listing_lexicon_linked' }),
        }),
      ])
    );
  });

  it('keeps scraped lexicon types separate when labels repeat across sections', async () => {
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: { name: 'Acme Inc' },
        listing: {
          title: 'Frontend Developer',
          description: 'Build products',
          city: 'Warszawa',
          salary: null,
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
      runId: 'offer-run-lexicon-types',
      snapshot: {
        provider: 'pracuj_pl',
        sections: [
          { heading: 'Technologies', text: 'React\nTypeScript' },
          { heading: 'Requirements', text: 'React\nEnglish B2' },
          { heading: 'Benefits', text: 'Private medical care' },
          { heading: 'Responsibilities', text: 'Build reusable UI components' },
        ],
      },
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape({
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdLexiconTerms: 6,
      createdListings: 1,
      linkedLexiconTerms: 6,
      verifiedListings: 1,
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.lexiconTerms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'technology', label: 'React' }),
        expect.objectContaining({ category: 'requirement', typeKey: 'requirement', label: 'React' }),
        expect.objectContaining({ category: 'technology', label: 'TypeScript' }),
        expect.objectContaining({ category: 'requirement', label: 'English B2' }),
        expect.objectContaining({ category: 'benefit', label: 'Private medical care' }),
        expect.objectContaining({
          category: 'responsibility',
          label: 'Build reusable UI components',
        }),
      ])
    );
    expect(
      persisted.lexiconTerms.filter((term: { label?: string }) => term.label === 'React')
    ).toHaveLength(2);
    expect(persisted.lexiconTerms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'technology', typeKey: 'technology', label: 'React' }),
        expect.objectContaining({ category: 'requirement', typeKey: 'requirement', label: 'React' }),
      ])
    );
    expect(persisted.jobListings[0].lexiconTermIds).toHaveLength(6);
  });

  it('applies AI classified scraped Other pills to the listing lexicon', async () => {
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValueOnce(
      settingsDatabase({
        jobListings: [
          {
            id: 'listing-1',
            organizationId: 'org-1',
            title: 'Frontend Developer',
            description: 'Build products',
            location: 'Wrocław',
            sourceExternalId: '1001',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
            status: 'open',
            lexiconTermIds: [],
          },
        ],
      })
    );

    const result = await applyFilemakerJobBoardLexiconClassifications({
      listingId: 'listing-1',
      runId: 'ai-run-1',
      classifications: [
        {
          confidence: 0.94,
          label: 'React',
          normalizedLabel: 'React',
          reason: 'Framework/library',
          typeKey: 'technology',
        },
      ],
      offer: {
        companyName: 'Acme Inc',
        companyProfile: '',
        companyProfileUrl: null,
        description: 'Build interfaces',
        expiresAt: null,
        location: 'Wrocław',
        pills: [],
        postedAt: null,
        salaryCurrency: null,
        salaryMax: null,
        salaryMin: null,
        salaryPeriod: 'monthly',
        salaryText: '',
        sourceExternalId: '1001',
        sourceSite: 'pracuj.pl',
        sourceUrl: offerUrl,
        title: 'Frontend Developer',
        unclassifiedPills: [
          {
            label: 'React',
            position: 0,
            reason: 'unclassified',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
          },
        ],
      },
    });

    expect(result).toMatchObject({
      listingId: 'listing-1',
      summary: {
        acceptedClassifications: 1,
        createdLexiconTerms: 1,
        linkedLexiconTerms: 1,
        persisted: true,
        rejectedClassifications: 0,
      },
    });
    expect(result.offer.pills).toEqual([
      expect.objectContaining({ category: 'technology', label: 'React' }),
    ]);
    expect(result.offer.unclassifiedPills).toHaveLength(0);
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.lexiconTerms).toEqual([
      expect.objectContaining({
        category: 'technology',
        label: 'React',
        normalizedLabel: 'react',
        typeKey: 'technology',
      }),
    ]);
    expect(persisted.jobListingLexiconLinks).toEqual([
      expect.objectContaining({
        jobListingId: 'listing-1',
        sourceValue: 'React',
        typeKey: 'technology',
      }),
    ]);
    expect(persisted.jobListings[0].lexiconTermIds).toHaveLength(1);
  });

  it('uses an existing lexicon term when the AI returns the wrong type', async () => {
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValueOnce(
      settingsDatabase({
        jobListings: [
          {
            id: 'listing-1',
            organizationId: 'org-1',
            title: 'Frontend Developer',
            description: 'Build products',
            location: 'Wrocław',
            sourceExternalId: '1001',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
            status: 'open',
            lexiconTermIds: [],
          },
        ],
        lexiconTerms: [
          {
            id: 'filemaker-lexicon-term-other-react',
            createdAt: '2026-04-28T00:00:00.000Z',
            updatedAt: '2026-04-28T00:00:00.000Z',
            label: 'React',
            normalizedLabel: 'react',
            typeKey: 'other',
            category: 'other',
            sourceSite: 'pracuj.pl',
            sourceProvider: 'pracuj.pl',
            firstSeenAt: '2026-04-28T00:00:00.000Z',
            lastSeenAt: '2026-04-28T00:00:00.000Z',
            occurrenceCount: 50,
          },
          {
            id: 'filemaker-lexicon-term-technology-react',
            createdAt: '2026-04-28T00:00:00.000Z',
            updatedAt: '2026-04-28T00:00:00.000Z',
            label: 'React',
            normalizedLabel: 'react',
            typeKey: 'technology',
            category: 'technology',
            sourceSite: 'pracuj.pl',
            sourceProvider: 'pracuj.pl',
            firstSeenAt: '2026-04-28T00:00:00.000Z',
            lastSeenAt: '2026-04-28T00:00:00.000Z',
            occurrenceCount: 7,
          },
        ],
      })
    );

    const result = await applyFilemakerJobBoardLexiconClassifications({
      listingId: 'listing-1',
      runId: 'ai-run-1',
      classifications: [
        {
          action: 'classify',
          confidence: 0.94,
          label: 'React',
          normalizedLabel: 'React',
          reason: 'Model confused the pill with a perk.',
          typeKey: 'benefit',
        },
      ],
      offer: {
        companyName: 'Acme Inc',
        companyProfile: '',
        companyProfileUrl: null,
        description: 'Build interfaces',
        expiresAt: null,
        location: 'Wrocław',
        pills: [],
        postedAt: null,
        salaryCurrency: null,
        salaryMax: null,
        salaryMin: null,
        salaryPeriod: 'monthly',
        salaryText: '',
        sourceExternalId: '1001',
        sourceSite: 'pracuj.pl',
        sourceUrl: offerUrl,
        title: 'Frontend Developer',
        unclassifiedPills: [
          {
            label: 'React',
            position: 0,
            reason: 'unclassified',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
          },
        ],
      },
    });

    expect(result).toMatchObject({
      summary: {
        acceptedClassifications: 1,
        createdLexiconTerms: 0,
        linkedLexiconTerms: 1,
        persisted: true,
        rejectedClassifications: 0,
      },
    });
    expect(result.offer.pills).toEqual([
      expect.objectContaining({ category: 'technology', label: 'React', typeKey: 'technology' }),
    ]);
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.lexiconTerms).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'React',
        normalizedLabel: 'react',
        occurrenceCount: 8,
        typeKey: 'technology',
      }),
      expect.objectContaining({
        label: 'React',
        normalizedLabel: 'react',
        occurrenceCount: 50,
        typeKey: 'other',
      }),
    ]));
    expect(persisted.jobListingLexiconLinks).toEqual([
      expect.objectContaining({
        jobListingId: 'listing-1',
        sourceValue: 'React',
        typeKey: 'technology',
      }),
    ]);
  });

  it('uses direct validation patterns even when the AI returns Other with low confidence', async () => {
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValueOnce(
      settingsDatabase({
        jobListings: [
          {
            id: 'listing-1',
            organizationId: 'org-1',
            title: 'Frontend Developer',
            description: 'Build products',
            location: 'Wrocław',
            sourceExternalId: '1001',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
            status: 'open',
            lexiconTermIds: [],
          },
        ],
      })
    );

    const result = await applyFilemakerJobBoardLexiconClassifications({
      listingId: 'listing-1',
      runId: 'ai-run-1',
      classifications: [
        {
          action: 'classify',
          confidence: 0.2,
          label: 'React',
          normalizedLabel: 'React',
          reason: 'Model was unsure.',
          typeKey: 'other',
        },
      ],
      offer: {
        companyName: 'Acme Inc',
        companyProfile: '',
        companyProfileUrl: null,
        description: 'Build interfaces',
        expiresAt: null,
        location: 'Wrocław',
        pills: [],
        postedAt: null,
        salaryCurrency: null,
        salaryMax: null,
        salaryMin: null,
        salaryPeriod: 'monthly',
        salaryText: '',
        sourceExternalId: '1001',
        sourceSite: 'pracuj.pl',
        sourceUrl: offerUrl,
        title: 'Frontend Developer',
        unclassifiedPills: [
          {
            label: 'React',
            position: 0,
            reason: 'raw other pill',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
          },
        ],
      },
    });

    expect(result).toMatchObject({
      summary: {
        acceptedClassifications: 1,
        createdLexiconTerms: 1,
        linkedLexiconTerms: 1,
        persisted: true,
        rejectedClassifications: 0,
      },
    });
    expect(result.offer.pills).toEqual([
      expect.objectContaining({ category: 'technology', label: 'React', typeKey: 'technology' }),
    ]);
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.lexiconTerms).toEqual([
      expect.objectContaining({
        label: 'React',
        normalizedLabel: 'react',
        typeKey: 'technology',
      }),
    ]);
  });

  it('uses validation patterns to override wrongly classified location pills', async () => {
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValueOnce(
      settingsDatabase({
        jobListings: [
          {
            id: 'listing-1',
            organizationId: 'org-1',
            title: 'Frontend Developer',
            description: 'Build products',
            location: 'Wrocław',
            sourceExternalId: '1001',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
            status: 'open',
            lexiconTermIds: [],
          },
        ],
      })
    );

    const result = await applyFilemakerJobBoardLexiconClassifications({
      listingId: 'listing-1',
      runId: 'ai-run-1',
      classifications: [
        {
          action: 'classify',
          confidence: 0.94,
          label: 'Lower Silesia',
          normalizedLabel: 'Lower Silesia',
          reason: 'Model confused a region with a stack item.',
          typeKey: 'technology',
        },
      ],
      offer: {
        companyName: 'Acme Inc',
        companyProfile: '',
        companyProfileUrl: null,
        description: 'Build interfaces',
        expiresAt: null,
        location: 'Wrocław',
        pills: [],
        postedAt: null,
        salaryCurrency: null,
        salaryMax: null,
        salaryMin: null,
        salaryPeriod: 'monthly',
        salaryText: '',
        sourceExternalId: '1001',
        sourceSite: 'pracuj.pl',
        sourceUrl: offerUrl,
        title: 'Frontend Developer',
        unclassifiedPills: [
          {
            label: 'Lower Silesia',
            position: 0,
            reason: 'raw other pill',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
          },
        ],
      },
    });

    expect(result.summary).toMatchObject({
      acceptedClassifications: 0,
      createdLexiconTerms: 0,
      linkedLexiconTerms: 0,
      persisted: false,
      rejectedClassifications: 1,
    });
    expect(result.offer.pills).toEqual([]);
    expect(mocks.upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });

  it('does not persist ignored provider UI pills from AI classifications', async () => {
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValueOnce(
      settingsDatabase({
        jobListings: [
          {
            id: 'listing-1',
            organizationId: 'org-1',
            title: 'Frontend Developer',
            description: 'Build products',
            location: 'Wrocław',
            sourceExternalId: '1001',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
            status: 'open',
            lexiconTermIds: [],
          },
        ],
      })
    );

    const result = await applyFilemakerJobBoardLexiconClassifications({
      listingId: 'listing-1',
      runId: 'ai-run-1',
      classifications: [
        {
          action: 'ignore',
          confidence: 0.99,
          label: 'Asystent Pracuj.pl',
          normalizedLabel: 'Asystent Pracuj.pl',
          reason: 'Provider UI text, not a job attribute.',
          typeKey: 'technology',
        },
      ],
      offer: {
        companyName: 'Acme Inc',
        companyProfile: '',
        companyProfileUrl: null,
        description: 'Build interfaces',
        expiresAt: null,
        location: 'Wrocław',
        pills: [],
        postedAt: null,
        salaryCurrency: null,
        salaryMax: null,
        salaryMin: null,
        salaryPeriod: 'monthly',
        salaryText: '',
        sourceExternalId: '1001',
        sourceSite: 'pracuj.pl',
        sourceUrl: offerUrl,
        title: 'Frontend Developer',
        unclassifiedPills: [
          {
            label: 'Asystent Pracuj.pl',
            position: 0,
            reason: 'raw other pill',
            sourceSite: 'pracuj.pl',
            sourceUrl: offerUrl,
          },
        ],
      },
    });

    expect(result).toMatchObject({
      offer: {
        pills: [],
        unclassifiedPills: [expect.objectContaining({ label: 'Asystent Pracuj.pl' })],
      },
      summary: {
        acceptedClassifications: 0,
        createdLexiconTerms: 0,
        linkedLexiconTerms: 0,
        persisted: false,
        rejectedClassifications: 1,
      },
    });
    expect(result.warnings).toEqual([
      'Kept "Asystent Pracuj.pl" unclassified: ignored noise or provider UI text.',
    ]);
    expect(mocks.upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });

  it('verifies imports against the persisted FileMaker settings copy after writing', async () => {
    mocks.readFilemakerCampaignSettingValueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(settingsDatabase({ jobListings: [], organizations: [] }));

    const events: Array<Record<string, unknown>> = [];
    const result = await runFilemakerJobBoardScrape(
      {
        mode: 'import',
        sourceUrl,
      },
      {
        onEvent: (event) => {
          events.push(event as unknown as Record<string, unknown>);
        },
      }
    );

    expect(result.summary).toMatchObject({
      createdListings: 1,
      verifiedListings: 0,
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'Import verification could not find organisation Acme Inc.',
        'Import verification could not find listing Developer.',
      ])
    );
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Verifying persisted import.',
          type: 'status',
        }),
        expect.objectContaining({
          type: 'warning',
          warning: 'Import verification could not find listing Developer.',
        }),
      ])
    );
  });

  it('creates unmatched employers by default and stores Pracuj company profile data', async () => {
    const events: Array<Record<string, unknown>> = [];
    mocks.getFilemakerOrganizationsCollectionMock.mockResolvedValue({
      find: vi.fn(() => ({
        limit: vi.fn(() => ({
          toArray: vi.fn(async () => []),
        })),
      })),
      updateOne: vi.fn(async () => ({ acknowledged: true, modifiedCount: 0, upsertedCount: 1 })),
    });
    mocks.probeJobBoardOfferMock.mockResolvedValueOnce({
      error: null,
      evaluation: {
        company: {
          name: 'New Employer',
          description: 'New Employer builds digital products for enterprise clients.',
          website: 'https://new-employer.example',
          size: '201-500',
          addressLine: 'Konstruktorska 12A',
          city: 'Warszawa',
          postalCode: '02-673',
          country: 'Poland',
          profileUrl: 'https://www.pracuj.pl/pracodawcy/new-employer,123',
        },
        listing: {
          title: 'Frontend Developer',
          description: 'Build interfaces',
          city: 'Kraków',
          salary: null,
          postedAt: '2026-04-27T09:00:00.000Z',
          expiresAt: '2026-05-27T23:59:59.000Z',
        },
        confidence: 0.91,
        modelId: 'model-1',
        error: null,
        evaluatedAt: '2026-04-28T10:00:00.000Z',
      },
      finalUrl: offerUrl,
      fetchStatus: 200,
      ok: true,
      provider: 'pracuj_pl',
      runId: 'offer-run-2',
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      steps: [],
    });

    const result = await runFilemakerJobBoardScrape(
      {
        mode: 'import',
        sourceUrl,
      },
      {
        onEvent: (event) => {
          events.push(event as unknown as Record<string, unknown>);
        },
      }
    );

    expect(result.summary).toMatchObject({
      createdListings: 1,
      createdOrganizations: 1,
      matchedOffers: 1,
      profileUpdates: 1,
      unmatchedOffers: 0,
      verifiedListings: 1,
    });
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'write',
          write: expect.objectContaining({
            action: 'organization_created',
            profileUpdated: true,
          }),
        }),
        expect.objectContaining({
          type: 'write',
          write: expect.objectContaining({
            action: 'listing_created',
            result: expect.objectContaining({ status: 'created' }),
          }),
        }),
      ])
    );
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.organizations[0]).toMatchObject({
      name: 'New Employer',
      jobBoardCompanyProfileUrl: 'https://www.pracuj.pl/pracodawcy/new-employer,123',
    });
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain(
      'Description: New Employer builds digital products for enterprise clients.'
    );
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain(
      'Website: https://new-employer.example'
    );
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain('Company size: 201-500');
    expect(persisted.organizations[0].jobBoardCompanyProfile).toContain(
      'Address: Konstruktorska 12A, 02-673 Warszawa, Poland'
    );
    expect(persisted.jobListings[0]).toMatchObject({
      expiresAt: '2026-05-27T23:59:59.000Z',
      organizationId: persisted.organizations[0].id,
      postedAt: '2026-04-27T09:00:00.000Z',
      title: 'Frontend Developer',
      sourceUrl: offerUrl,
    });
    expect(persisted.lexiconTerms).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ category: 'address' })])
    );
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

    const result = await runFilemakerJobBoardScrape({
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
        addresses: [
          {
            id: 'address-warszawa',
            city: 'Warszawa',
            country: 'Poland',
            countryId: 'PL',
            postalCode: '',
            street: '',
            streetNumber: '',
          },
        ],
        addressLinks: [
          {
            id: 'address-link-listing-1',
            addressId: 'address-warszawa',
            isDefault: true,
            ownerId: 'listing-1',
            ownerKind: 'job_listing',
          },
        ],
        jobListings: [
          {
            id: 'listing-1',
            addressId: 'address-warszawa',
            city: 'Warszawa',
            country: 'Poland',
            countryId: 'PL',
            organizationId: 'org-1',
            postalCode: '',
            street: '',
            streetNumber: '',
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

    const result = await runFilemakerJobBoardScrape({
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

  it('matches existing listings by normalized source URL when skipping duplicates', async () => {
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValue(
      settingsDatabase({
        addresses: [
          {
            id: 'address-warszawa',
            city: 'Warszawa',
            country: 'Poland',
            countryId: 'PL',
            postalCode: '',
            street: '',
            streetNumber: '',
          },
        ],
        addressLinks: [
          {
            id: 'address-link-listing-normalized-url',
            addressId: 'address-warszawa',
            isDefault: true,
            ownerId: 'listing-normalized-url',
            ownerKind: 'job_listing',
          },
        ],
        jobListings: [
          {
            id: 'listing-normalized-url',
            addressId: 'address-warszawa',
            city: 'Warszawa',
            country: 'Poland',
            countryId: 'PL',
            organizationId: 'org-1',
            postalCode: '',
            street: '',
            streetNumber: '',
            title: 'Developer',
            description: 'Existing listing',
            sourceSite: 'pracuj.pl',
            sourceUrl: `${offerUrl}?utm_source=newsletter#application`,
            status: 'open',
          },
        ],
      })
    );

    const result = await runFilemakerJobBoardScrape({
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
      listingId: 'listing-normalized-url',
      status: 'skipped',
    });
    expect(mocks.upsertFilemakerCampaignSettingValueMock).not.toHaveBeenCalled();
  });

  it('does not skip listings from another job board with the same external id', async () => {
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValue(
      settingsDatabase({
        jobListings: [
          {
            id: 'listing-justjoin',
            organizationId: 'org-1',
            title: 'Developer',
            description: 'Existing Just Join IT listing',
            sourceExternalId: '1001',
            sourceSite: 'justjoin.it',
            sourceUrl: 'https://justjoin.it/job-offer/1001',
            status: 'open',
          },
        ],
      })
    );

    const result = await saveFilemakerJobBoardScrapeDrafts({
      action: 'save_drafts',
      duplicateStrategy: 'skip',
      importStrategy: 'create_unmatched',
      minimumMatchConfidence: 85,
      offers: [
        {
          companyName: 'Acme Inc',
          companyProfile: '',
          companyProfileUrl: null,
          description: 'Build products',
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
          sourceUrl: offerUrl,
          pills: [],
          title: 'Developer',
        },
      ],
      organizationScope: 'all',
      provider: 'auto',
      selectedOrganizationIds: [],
      sourceUrl,
      status: 'open',
    });

    expect(result.summary).toMatchObject({
      createdListings: 1,
      skippedOffers: 0,
      updatedListings: 0,
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings).toHaveLength(2);
    expect(persisted.jobListings[1]).toMatchObject({
      sourceExternalId: '1001',
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
    });
    expect(persisted.jobListings[1].id).not.toBe('listing-justjoin');
  });

  it('creates distinct scraped listings with the same title and location when source identity differs', async () => {
    const existingOfferUrl = 'https://www.pracuj.pl/praca/developer-warszawa,oferta,9999';
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValue(
      settingsDatabase({
        jobListings: [
          {
            id: 'listing-existing',
            organizationId: 'org-1',
            title: 'Developer',
            description: 'Existing listing',
            location: 'Warszawa',
            sourceExternalId: '9999',
            sourceSite: 'pracuj.pl',
            sourceUrl: existingOfferUrl,
            status: 'open',
          },
        ],
      })
    );

    const result = await runFilemakerJobBoardScrape({
      duplicateStrategy: 'skip',
      mode: 'import',
      sourceUrl,
    });

    expect(result.summary).toMatchObject({
      createdListings: 1,
      skippedOffers: 0,
      updatedListings: 0,
    });
    expect(result.offers[0]).toMatchObject({
      status: 'created',
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings).toHaveLength(2);
    expect(persisted.jobListings[1]).toMatchObject({
      sourceUrl: offerUrl,
      title: 'Developer',
    });
  });
});

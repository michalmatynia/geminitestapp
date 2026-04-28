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
  runFilemakerJobBoardScrape,
  saveFilemakerJobBoardScrapeDrafts,
} from './filemaker-job-board-scrape';

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

  it('imports matched offers into Filemaker job listings', async () => {
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
    expect(persisted.organizations[0]).toMatchObject({
      id: 'org-1',
      name: 'Acme Inc',
    });
    expect(persisted.jobListings[0]).toMatchObject({
      organizationId: 'org-1',
      salaryCurrency: 'PLN',
      sourceSite: 'pracuj.pl',
      sourceUrl: offerUrl,
      title: 'Developer',
    });
    expect(mocks.readFilemakerCampaignSettingValueMock).toHaveBeenCalledTimes(2);
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
      matchedOffers: 1,
      scrapedOffers: 1,
      verifiedListings: 1,
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      organizationId: 'org-1',
      sourceUrl: offerUrl,
      title: 'Developer',
    });
  });

  it('updates existing listings when manually saving scraped drafts with skip selected', async () => {
    mocks.readFilemakerCampaignSettingValueMock
      .mockResolvedValueOnce(
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
      skippedOffers: 0,
      updatedListings: 1,
      verifiedListings: 1,
    });
    expect(result.offers[0]).toMatchObject({
      listingId: 'listing-1',
      status: 'updated',
    });
    const persisted = JSON.parse(mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0][1]);
    expect(persisted.jobListings[0]).toMatchObject({
      id: 'listing-1',
      description: 'Updated description from preview',
      sourceUrl: offerUrl,
      title: 'Developer',
    });
  });

  it('stores scraped job-board pills as lexicon terms and maps the first Pracuj pill to an organisation address', async () => {
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
      createdLexiconTerms: 6,
      createdListings: 1,
      linkedLexiconTerms: 6,
      verifiedListings: 1,
    });
    expect(result.offers[0]?.offer.pills.map((pill) => pill.category)).toEqual([
      'address',
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
      street: 'Puławska',
      streetNumber: '180',
    });
    expect(persisted.organizations[0]).toMatchObject({
      addressId: persisted.addresses[0].id,
      displayAddressId: persisted.addresses[0].id,
      id: 'org-1',
    });
    expect(persisted.addressLinks[0]).toMatchObject({
      addressId: persisted.addresses[0].id,
      isDefault: true,
      ownerId: 'org-1',
      ownerKind: 'organization',
    });
    expect(persisted.lexiconTerms).toHaveLength(6);
    expect(persisted.jobListingLexiconLinks).toHaveLength(6);
    expect(persisted.jobListings[0].lexiconTermIds).toHaveLength(6);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'write',
          write: expect.objectContaining({ action: 'organization_address_updated' }),
        }),
        expect.objectContaining({
          type: 'write',
          write: expect.objectContaining({ action: 'listing_lexicon_linked' }),
        }),
      ])
    );
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
          profileUrl: 'https://www.pracuj.pl/pracodawcy/new-employer,123',
        },
        listing: {
          title: 'Frontend Developer',
          description: 'Build interfaces',
          city: 'Kraków',
          salary: null,
          postedAt: null,
          expiresAt: null,
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
      jobBoardCompanyProfile: 'New Employer builds digital products for enterprise clients.',
      jobBoardCompanyProfileUrl: 'https://www.pracuj.pl/pracodawcy/new-employer,123',
    });
    expect(persisted.jobListings[0]).toMatchObject({
      organizationId: persisted.organizations[0].id,
      title: 'Frontend Developer',
      sourceUrl: offerUrl,
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
        jobListings: [
          {
            id: 'listing-normalized-url',
            organizationId: 'org-1',
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

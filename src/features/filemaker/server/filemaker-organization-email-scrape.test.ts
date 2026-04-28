import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  ensureMongoFilemakerEmailIndexesMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  getMongoFilemakerEmailCollectionsMock: vi.fn(),
  getMongoFilemakerOrganizationByIdMock: vi.fn(),
  listMongoFilemakerWebsitesForOrganizationMock: vi.fn(),
  runFilemakerOrganizationPresenceScrapeForOrganizationMock: vi.fn(),
  runPlaywrightEngineTaskMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/playwright/server/instances', () => ({
  createCustomPlaywrightInstance: (input: Record<string, unknown>) => ({
    kind: 'custom',
    ...input,
  }),
}));

vi.mock('@/features/playwright/server/runtime', () => ({
  runPlaywrightEngineTask: (...args: unknown[]) =>
    mocks.runPlaywrightEngineTaskMock(...args),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: { captureException: mocks.captureExceptionMock },
}));

vi.mock('./filemaker-email-repository', () => ({
  FILEMAKER_EMAIL_LINKS_COLLECTION: 'filemaker_email_links',
  FILEMAKER_EMAILS_COLLECTION: 'filemaker_emails',
  ensureMongoFilemakerEmailIndexes: mocks.ensureMongoFilemakerEmailIndexesMock,
  getMongoFilemakerEmailCollections: mocks.getMongoFilemakerEmailCollectionsMock,
}));

vi.mock('./filemaker-organizations-repository', () => ({
  getMongoFilemakerOrganizationById: mocks.getMongoFilemakerOrganizationByIdMock,
}));

vi.mock('./filemaker-organization-presence-scrape', () => ({
  runFilemakerOrganizationPresenceScrapeForOrganization: (...args: unknown[]) =>
    mocks.runFilemakerOrganizationPresenceScrapeForOrganizationMock(...args),
}));

vi.mock('./filemaker-website-repository', () => ({
  listMongoFilemakerWebsitesForOrganization:
    mocks.listMongoFilemakerWebsitesForOrganizationMock,
}));

vi.mock('./filemaker-email-mx-verifier', () => ({
  createMxVerifier: () => ({
    hasMx: () => Promise.resolve(true),
    lookup: () => Promise.resolve({ outcome: 'mx', hasMail: true }),
  }),
}));

import { runFilemakerOrganizationEmailScrape } from './filemaker-organization-email-scrape';

type MockCollection = {
  createIndex: ReturnType<typeof vi.fn>;
  findOne: ReturnType<typeof vi.fn>;
  insertOne: ReturnType<typeof vi.fn>;
};

const organization = {
  city: 'Warsaw',
  id: 'org-1',
  krs: '0000123456',
  legacyUuid: 'legacy-org-1',
  name: 'Acme Sp. z o.o.',
  postalCode: '00-001',
  street: 'Main',
  streetNumber: '1',
  taxId: '1234567890',
  tradingName: 'Acme',
};

const createMockCollection = (): MockCollection => ({
  createIndex: vi.fn().mockResolvedValue('index'),
  findOne: vi.fn().mockResolvedValue(null),
  insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
});

const createMockEmailCollections = (): {
  emails: MockCollection;
  links: MockCollection;
} => ({
  emails: createMockCollection(),
  links: createMockCollection(),
});

const createMockDb = (collections: {
  emails: MockCollection;
  links: MockCollection;
}): { collection: ReturnType<typeof vi.fn> } => ({
  collection: vi.fn((name: string) => {
    if (name === 'filemaker_emails') return collections.emails;
    if (name === 'filemaker_email_links') return collections.links;
    throw new Error(`Unexpected collection ${name}`);
  }),
});

describe('runFilemakerOrganizationEmailScrape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureMongoFilemakerEmailIndexesMock.mockResolvedValue(undefined);
    mocks.getMongoFilemakerOrganizationByIdMock.mockResolvedValue(organization);
    mocks.listMongoFilemakerWebsitesForOrganizationMock.mockResolvedValue([
      {
        id: 'website-1',
        normalizedUrl: '',
        organizationId: 'org-1',
        url: 'acme.example',
      },
    ]);
    mocks.runFilemakerOrganizationPresenceScrapeForOrganizationMock.mockResolvedValue({
      organizationId: 'org-1',
      organizationName: 'Acme Sp. z o.o.',
      persisted: { linked: [], skipped: [] },
      runId: 'presence-run-1',
      socialProfiles: [],
      visitedUrls: [],
      warnings: [],
      websites: [],
    });
    mocks.runPlaywrightEngineTaskMock.mockResolvedValue({
      artifacts: [],
      error: null,
      logs: [],
      result: {
        returnValue: {
          emails: [
            {
              address: 'Info@Acme.Example',
              sourceUrls: ['https://acme.example/contact'],
            },
          ],
          visitedUrls: ['https://acme.example/', 'https://acme.example/contact'],
          warnings: ['Minor warning'],
        },
      },
      runId: 'run-1',
      status: 'completed',
    });
  });

  it('skips email Playwright when discovery still leaves no linked website to scrape', async () => {
    mocks.listMongoFilemakerWebsitesForOrganizationMock.mockResolvedValue([]);

    const result = await runFilemakerOrganizationEmailScrape({
      organizationId: 'org-1',
    });

    expect(result).toMatchObject({
      organizationId: 'org-1',
      organizationName: 'Acme Sp. z o.o.',
      runId: null,
      runtimeKey: 'filemaker_organization_email_scrape',
      skipped: [{ address: '*', reason: 'No linked organisation websites to scrape.' }],
      websites: [],
      websiteDiscovery: expect.objectContaining({ runId: 'presence-run-1' }),
    });
    expect(mocks.runFilemakerOrganizationPresenceScrapeForOrganizationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        existingWebsites: [],
        organization,
      })
    );
    expect(mocks.runPlaywrightEngineTaskMock).not.toHaveBeenCalled();
    expect(mocks.getMongoFilemakerEmailCollectionsMock).not.toHaveBeenCalled();
  });

  it('uses discovered organization websites to enhance the email scrape', async () => {
    mocks.listMongoFilemakerWebsitesForOrganizationMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'website-discovered',
          normalizedUrl: 'https://discovered.example/',
          url: 'https://discovered.example/',
        },
      ]);
    const collections = createMockEmailCollections();
    const db = createMockDb(collections);
    mocks.getMongoFilemakerEmailCollectionsMock.mockResolvedValue(collections);
    mocks.getMongoDbMock.mockResolvedValue(db);

    await runFilemakerOrganizationEmailScrape({
      organizationId: 'org-1',
    });

    expect(mocks.runFilemakerOrganizationPresenceScrapeForOrganizationMock).toHaveBeenCalled();
    expect(mocks.runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          input: expect.objectContaining({
            websites: ['https://discovered.example/'],
          }),
          startUrl: 'https://discovered.example/',
        }),
      })
    );
  });

  it('promotes scraped emails into email and organization-link collections', async () => {
    const collections = createMockEmailCollections();
    const db = createMockDb(collections);
    mocks.getMongoFilemakerEmailCollectionsMock.mockResolvedValue(collections);
    mocks.getMongoDbMock.mockResolvedValue(db);

    const result = await runFilemakerOrganizationEmailScrape({
      maxPages: 6,
      organizationId: 'org-1',
    });

    expect(mocks.runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instance: expect.objectContaining({
          family: 'scrape',
          kind: 'custom',
          tags: expect.arrayContaining(['filemaker', 'organization', 'email-scrape']),
        }),
        request: expect.objectContaining({
          actionId: 'filemaker_organization_email_scrape',
          actionName: 'Filemaker organisation email scrape',
          browserEngine: 'chromium',
          input: expect.objectContaining({
            maxPages: 6,
            runtimeKey: 'filemaker_organization_email_scrape',
            websites: ['https://acme.example/'],
          }),
          preventNewPages: true,
          runtimeKey: 'filemaker_organization_email_scrape',
          startUrl: 'https://acme.example/',
        }),
      })
    );
    expect(mocks.ensureMongoFilemakerEmailIndexesMock).toHaveBeenCalledWith(collections);
    expect(collections.emails.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        domainHasMx: true,
        domainMxCheckedAt: expect.any(Date),
        domainMxLookupOutcome: 'mx',
        email: 'info@acme.example',
        importBatchId: 'organization-email-scrape:org-1:run-1',
        importSourceKind: 'organization-email-scrape',
        legacyUuids: [],
        status: 'unverified',
        updatedBy: 'filemaker:organization-email-scrape',
      })
    );
    const insertedEmail = collections.emails.insertOne.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(collections.links.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        emailId: insertedEmail?.['id'],
        importBatchId: 'organization-email-scrape:org-1:run-1',
        importSourceKind: 'organization-email-scrape',
        legacyEmailAddress: 'info@acme.example',
        legacyOrganizationName: 'Acme Sp. z o.o.',
        legacyOrganizationUuid: 'legacy-org-1',
        organizationId: 'org-1',
        partyId: 'org-1',
        partyKind: 'organization',
      })
    );
    expect(result).toMatchObject({
      organizationId: 'org-1',
      organizationName: 'Acme Sp. z o.o.',
      runId: 'run-1',
      visitedUrls: ['https://acme.example/', 'https://acme.example/contact'],
      warnings: ['Minor warning'],
      websites: ['https://acme.example/'],
    });
    expect(result.promoted).toEqual([
      expect.objectContaining({
        address: 'info@acme.example',
        emailId: insertedEmail?.['id'],
        sourceUrls: ['https://acme.example/contact'],
        status: 'created',
      }),
    ]);
  });

  it('persists MX lookup outcomes and exposes DNS failure metrics', async () => {
    const collections = createMockEmailCollections();
    const db = createMockDb(collections);
    mocks.getMongoFilemakerEmailCollectionsMock.mockResolvedValue(collections);
    mocks.getMongoDbMock.mockResolvedValue(db);
    mocks.runPlaywrightEngineTaskMock.mockResolvedValue({
      artifacts: [],
      error: null,
      logs: [],
      result: {
        returnValue: {
          emails: [
            { address: 'sales@nomx.example', sourceUrls: ['https://acme.example/contact'] },
            { address: 'team@slow.example', sourceUrls: ['https://acme.example/contact'] },
            { address: 'ops@broken.example', sourceUrls: ['https://acme.example/contact'] },
            { address: 'hello@relay.example', sourceUrls: ['https://acme.example/contact'] },
          ],
          visitedUrls: ['https://acme.example/'],
          warnings: [],
        },
      },
      runId: 'run-1',
      status: 'completed',
    });
    const outcomesByDomain = {
      'broken.example': { outcome: 'error', hasMail: false },
      'nomx.example': { outcome: 'none', hasMail: false },
      'relay.example': { outcome: 'a-only', hasMail: true },
      'slow.example': { outcome: 'timeout', hasMail: false },
    } as const;
    const lookup = vi.fn(
      async (domain: string) =>
        outcomesByDomain[domain as keyof typeof outcomesByDomain] ?? {
          outcome: 'mx',
          hasMail: true,
        } as const
    );

    const result = await runFilemakerOrganizationEmailScrape({
      organizationId: 'org-1',
      mxVerifier: {
        hasMx: vi.fn().mockResolvedValue(true),
        lookup,
      },
    });

    expect(result.metrics).toMatchObject({
      domainsWithoutMx: 1,
      mxLookupErrors: 1,
      mxLookupTimeouts: 1,
    });
    expect(lookup).toHaveBeenCalledTimes(4);
    const insertedEmails = collections.emails.insertOne.mock.calls.map(([document]) => document);
    expect(insertedEmails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domainHasMx: false,
          domainMxLookupOutcome: 'none',
          email: 'sales@nomx.example',
        }),
        expect.objectContaining({
          domainHasMx: false,
          domainMxLookupOutcome: 'timeout',
          email: 'team@slow.example',
        }),
        expect.objectContaining({
          domainHasMx: false,
          domainMxLookupOutcome: 'error',
          email: 'ops@broken.example',
        }),
        expect.objectContaining({
          domainHasMx: true,
          domainMxLookupOutcome: 'a-only',
          email: 'hello@relay.example',
        }),
      ])
    );
  });

  it('returns a skipped result without touching email collections when Playwright fails', async () => {
    mocks.runPlaywrightEngineTaskMock.mockResolvedValue({
      artifacts: [],
      error: 'Navigation timeout',
      logs: ['page.goto timed out'],
      result: null,
      runId: 'run-failed',
      status: 'failed',
    });

    const result = await runFilemakerOrganizationEmailScrape({
      organizationId: 'org-1',
    });

    expect(result).toMatchObject({
      organizationId: 'org-1',
      organizationName: 'Acme Sp. z o.o.',
      promoted: [],
      runId: 'run-failed',
      skipped: [{ address: '*', reason: 'Navigation timeout' }],
      warnings: ['page.goto timed out'],
      websites: ['https://acme.example/'],
    });
    expect(mocks.getMongoFilemakerEmailCollectionsMock).not.toHaveBeenCalled();
    expect(mocks.ensureMongoFilemakerEmailIndexesMock).not.toHaveBeenCalled();
  });

  it('links an existing email without recreating it', async () => {
    const collections = createMockEmailCollections();
    const db = createMockDb(collections);
    collections.emails.findOne.mockResolvedValue({
      id: 'email-existing',
      email: 'info@acme.example',
    });
    mocks.getMongoFilemakerEmailCollectionsMock.mockResolvedValue(collections);
    mocks.getMongoDbMock.mockResolvedValue(db);

    const result = await runFilemakerOrganizationEmailScrape({
      organizationId: 'org-1',
    });

    expect(collections.emails.insertOne).not.toHaveBeenCalled();
    expect(collections.links.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        emailId: 'email-existing',
        legacyEmailAddress: 'info@acme.example',
        organizationId: 'org-1',
        partyId: 'org-1',
      })
    );
    expect(result.promoted).toEqual([
      expect.objectContaining({
        address: 'info@acme.example',
        emailId: 'email-existing',
        status: 'linked',
      }),
    ]);
  });

  it('reports already-linked emails without writing a duplicate link', async () => {
    const collections = createMockEmailCollections();
    const db = createMockDb(collections);
    collections.emails.findOne.mockResolvedValue({
      id: 'email-existing',
      email: 'info@acme.example',
    });
    collections.links.findOne.mockResolvedValue({
      id: 'link-existing',
      emailId: 'email-existing',
      partyId: 'org-1',
      partyKind: 'organization',
    });
    mocks.getMongoFilemakerEmailCollectionsMock.mockResolvedValue(collections);
    mocks.getMongoDbMock.mockResolvedValue(db);

    const result = await runFilemakerOrganizationEmailScrape({
      organizationId: 'org-1',
    });

    expect(collections.emails.insertOne).not.toHaveBeenCalled();
    expect(collections.links.insertOne).not.toHaveBeenCalled();
    expect(result.promoted).toEqual([
      expect.objectContaining({
        address: 'info@acme.example',
        emailId: 'email-existing',
        linkId: 'link-existing',
        status: 'already-linked',
      }),
    ]);
  });

  it('treats raced link inserts as already linked', async () => {
    const collections = createMockEmailCollections();
    const db = createMockDb(collections);
    collections.emails.findOne.mockResolvedValue({
      id: 'email-existing',
      email: 'info@acme.example',
    });
    collections.links.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'link-raced',
        emailId: 'email-existing',
        partyId: 'org-1',
        partyKind: 'organization',
      });
    collections.links.insertOne.mockRejectedValue(new Error('duplicate key'));
    mocks.getMongoFilemakerEmailCollectionsMock.mockResolvedValue(collections);
    mocks.getMongoDbMock.mockResolvedValue(db);

    const result = await runFilemakerOrganizationEmailScrape({
      organizationId: 'org-1',
    });

    expect(collections.links.insertOne).toHaveBeenCalledTimes(1);
    expect(mocks.captureExceptionMock).not.toHaveBeenCalled();
    expect(result.skipped).toEqual([]);
    expect(result.promoted).toEqual([
      expect.objectContaining({
        address: 'info@acme.example',
        emailId: 'email-existing',
        linkId: 'link-raced',
        status: 'already-linked',
      }),
    ]);
  });
});

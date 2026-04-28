import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  ensureMongoFilemakerEmailIndexesMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  getMongoFilemakerEmailCollectionsMock: vi.fn(),
  getMongoFilemakerOrganizationByIdMock: vi.fn(),
  listMongoFilemakerWebsitesForOrganizationMock: vi.fn(),
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

vi.mock('./filemaker-website-repository', () => ({
  listMongoFilemakerWebsitesForOrganization:
    mocks.listMongoFilemakerWebsitesForOrganizationMock,
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

  it('skips Playwright when the organization has no linked website to scrape', async () => {
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
    });
    expect(mocks.runPlaywrightEngineTaskMock).not.toHaveBeenCalled();
    expect(mocks.getMongoFilemakerEmailCollectionsMock).not.toHaveBeenCalled();
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
});

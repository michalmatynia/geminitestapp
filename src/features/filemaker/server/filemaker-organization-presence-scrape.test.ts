import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoFilemakerOrganizationByIdMock: vi.fn(),
  listMongoFilemakerWebsitesForOrganizationMock: vi.fn(),
  runPlaywrightEngineTaskMock: vi.fn(),
  upsertMongoFilemakerOrganizationWebsiteDiscoveryMock: vi.fn(),
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

vi.mock('./filemaker-organizations-repository', () => ({
  getMongoFilemakerOrganizationById: mocks.getMongoFilemakerOrganizationByIdMock,
}));

vi.mock('./filemaker-website-repository', () => ({
  listMongoFilemakerWebsitesForOrganization:
    mocks.listMongoFilemakerWebsitesForOrganizationMock,
  upsertMongoFilemakerOrganizationWebsiteDiscovery: (...args: unknown[]) =>
    mocks.upsertMongoFilemakerOrganizationWebsiteDiscoveryMock(...args),
}));

import { runFilemakerOrganizationPresenceScrape } from './filemaker-organization-presence-scrape';

const organization = {
  city: 'Warsaw',
  id: 'org-1',
  krs: '0000123456',
  name: 'Acme Sp. z o.o.',
  postalCode: '00-001',
  street: 'Main',
  streetNumber: '1',
  taxId: '1234567890',
  tradingName: 'Acme',
};

describe('runFilemakerOrganizationPresenceScrape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMongoFilemakerOrganizationByIdMock.mockResolvedValue(organization);
    mocks.listMongoFilemakerWebsitesForOrganizationMock.mockResolvedValue([
      {
        id: 'website-1',
        normalizedUrl: '',
        url: 'acme.example',
      },
    ]);
    mocks.runPlaywrightEngineTaskMock.mockResolvedValue({
      artifacts: [],
      error: null,
      logs: [],
      result: {
        returnValue: {
          socialProfiles: [
            {
              confidence: 80,
              platform: 'linkedin',
              sourceUrl: 'https://acme.example/',
              title: 'Acme LinkedIn',
              url: 'https://www.linkedin.com/company/acme',
            },
          ],
          visitedUrls: ['https://acme.example/'],
          warnings: ['Minor warning'],
          websites: [
            {
              confidence: 95,
              reason: 'Matched organisation tokens: acme.',
              sourceUrl: null,
              title: 'Acme',
              url: 'https://acme.example/',
            },
          ],
        },
      },
      runId: 'presence-run-1',
      status: 'completed',
    });
    mocks.upsertMongoFilemakerOrganizationWebsiteDiscoveryMock.mockResolvedValue({
      linked: [{ id: 'website-1', linkId: 'link-1', status: 'already-linked' }],
      skipped: [],
    });
  });

  it('runs the native Playwright sequence and persists websites plus social profiles', async () => {
    const result = await runFilemakerOrganizationPresenceScrape({
      organizationId: 'org-1',
      maxPages: 5,
      maxSearchResults: 7,
    });

    expect(mocks.runPlaywrightEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instance: expect.objectContaining({
          family: 'scrape',
          kind: 'custom',
          tags: expect.arrayContaining(['filemaker', 'organization', 'website-social-scrape']),
        }),
        request: expect.objectContaining({
          actionId: 'filemaker_organization_presence_scrape',
          actionName: 'Filemaker organisation website and social scrape',
          browserEngine: 'chromium',
          input: expect.objectContaining({
            maxPages: 5,
            maxSearchResults: 7,
            seedWebsites: ['https://acme.example/'],
          }),
          runtimeKey: 'filemaker_organization_presence_scrape',
          startUrl: 'https://acme.example/',
        }),
      })
    );
    expect(mocks.upsertMongoFilemakerOrganizationWebsiteDiscoveryMock).toHaveBeenCalledWith({
      organization,
      runId: 'presence-run-1',
      socialProfiles: [
        expect.objectContaining({
          platform: 'linkedin',
          url: 'https://www.linkedin.com/company/acme',
        }),
      ],
      websites: [
        expect.objectContaining({
          url: 'https://acme.example/',
        }),
      ],
    });
    expect(result).toMatchObject({
      organizationId: 'org-1',
      persisted: {
        linked: [{ id: 'website-1', linkId: 'link-1', status: 'already-linked' }],
      },
      runId: 'presence-run-1',
      socialProfiles: [
        expect.objectContaining({
          platform: 'linkedin',
        }),
      ],
      warnings: ['Minor warning'],
      websites: [
        expect.objectContaining({
          url: 'https://acme.example/',
        }),
      ],
    });
  });

  it('returns warnings without persistence when the Playwright sequence fails', async () => {
    mocks.runPlaywrightEngineTaskMock.mockResolvedValue({
      artifacts: [],
      error: 'Navigation timeout',
      logs: ['page.goto failed'],
      result: null,
      runId: 'presence-run-failed',
      status: 'failed',
    });

    const result = await runFilemakerOrganizationPresenceScrape({
      organizationId: 'org-1',
    });

    expect(mocks.upsertMongoFilemakerOrganizationWebsiteDiscoveryMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      persisted: { linked: [], skipped: [] },
      runId: 'presence-run-failed',
      warnings: ['Navigation timeout', 'page.goto failed'],
      websites: [],
    });
  });
});

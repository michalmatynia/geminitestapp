import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listIntegrationsMock, listConnectionsMock } = vi.hoisted(() => ({
  listIntegrationsMock: vi.fn(),
  listConnectionsMock: vi.fn(),
}));

vi.mock('@/shared/lib/integration-repository', () => ({
  getMongoIntegrationRepository: () => ({
    listIntegrations: (...args: unknown[]) => listIntegrationsMock(...args),
    listConnections: (...args: unknown[]) => listConnectionsMock(...args),
  }),
}));

import { getIntegrationsWithConnections } from './integration-repository';

describe('getIntegrationsWithConnections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listIntegrationsMock.mockResolvedValue([
      {
        id: 'integration-tradera-1',
        name: 'Tradera',
        slug: 'tradera',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T11:00:00.000Z',
      },
    ]);
    listConnectionsMock.mockResolvedValue([
      {
        id: 'conn-tradera-1',
        integrationId: 'integration-tradera-1',
        name: 'Tradera browser',
        username: 'seller@example.com',
        password: 'encrypted-secret',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'super secret script',
        traderaDefaultTemplateId: null,
        traderaDefaultDurationHours: 72,
        traderaAutoRelistEnabled: true,
        traderaAutoRelistLeadMinutes: 180,
        traderaApiAppId: 123,
        traderaApiPublicKey: 'public-key',
        traderaApiUserId: 456,
        traderaApiSandbox: false,
      },
    ]);
  });

  it('returns only safe lightweight connection data for with-connections payloads', async () => {
    const result = await getIntegrationsWithConnections();

    expect(result).toEqual([
      {
        id: 'integration-tradera-1',
        name: 'Tradera',
        slug: 'tradera',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T11:00:00.000Z',
        connections: [
          {
            id: 'conn-tradera-1',
            integrationId: 'integration-tradera-1',
            name: 'Tradera browser',
            hasPlaywrightStorageState: false,
            traderaBrowserMode: 'scripted',
            hasPlaywrightListingScript: true,
            scanner1688StartUrl: null,
            scanner1688LoginMode: null,
            scanner1688DefaultSearchMode: null,
            scanner1688CandidateResultLimit: null,
            scanner1688MinimumCandidateScore: null,
            scanner1688MaxExtractedImages: null,
            scanner1688AllowUrlImageSearchFallback: null,
            traderaDefaultTemplateId: null,
            traderaDefaultDurationHours: 72,
            traderaAutoRelistEnabled: true,
            traderaAutoRelistLeadMinutes: 180,
            traderaApiAppId: 123,
            traderaApiPublicKey: 'public-key',
            traderaApiUserId: 456,
            traderaApiSandbox: false,
          },
        ],
      },
    ]);
    expect(result[0]?.connections[0]).not.toHaveProperty('password');
    expect(result[0]?.connections[0]).not.toHaveProperty('playwrightListingScript');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseJsonBodyMock,
  listConnectionsMock,
  getIntegrationByIdMock,
  createConnectionMock,
  encryptSecretMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  listConnectionsMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  createConnectionMock: vi.fn(),
  encryptSecretMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: async () => ({
    listConnections: (...args: unknown[]) => listConnectionsMock(...args),
    getIntegrationById: (...args: unknown[]) => getIntegrationByIdMock(...args),
    createConnection: (...args: unknown[]) => createConnectionMock(...args),
  }),
  encryptSecret: (...args: unknown[]) => encryptSecretMock(...args),
}));

import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from '@/features/integrations/services/tradera-listing/default-script';
import { GET_handler, POST_handler } from './handler';

describe('integration connections handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listConnectionsMock.mockResolvedValue([
      {
        id: 'conn-tradera-1',
        integrationId: 'integration-tradera-1',
        name: 'Tradera browser',
        username: 'seller@example.com',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T11:00:00.000Z',
        hasPlaywrightStorageState: true,
        playwrightStorageStateUpdatedAt: '2026-04-02T11:00:00.000Z',
        allegroUseSandbox: false,
        hasLinkedInAccessToken: false,
        linkedinTokenUpdatedAt: null,
        linkedinExpiresAt: null,
        linkedinScope: null,
        linkedinPersonUrn: null,
        linkedinProfileUrl: null,
        hasBaseApiToken: false,
        baseTokenUpdatedAt: null,
        baseLastInventoryId: null,
        playwrightHeadless: true,
        playwrightSlowMo: 0,
        playwrightTimeout: 30000,
        playwrightNavigationTimeout: 30000,
        playwrightHumanizeMouse: true,
        playwrightMouseJitter: 5,
        playwrightClickDelayMin: 50,
        playwrightClickDelayMax: 150,
        playwrightInputDelayMin: 20,
        playwrightInputDelayMax: 80,
        playwrightActionDelayMin: 500,
        playwrightActionDelayMax: 1500,
        playwrightProxyEnabled: false,
        playwrightProxyServer: '',
        playwrightProxyUsername: '',
        playwrightProxyPassword: null,
        playwrightEmulateDevice: false,
        playwrightDeviceName: 'Desktop Chrome',
        playwrightPersonaId: null,
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
        traderaDefaultTemplateId: null,
        traderaDefaultDurationHours: 72,
        traderaAutoRelistEnabled: true,
        traderaAutoRelistLeadMinutes: 180,
        traderaApiAppId: null,
        traderaApiPublicKey: null,
        traderaApiUserId: null,
        traderaApiSandbox: false,
        traderaApiAppKey: null,
        traderaApiToken: null,
        traderaApiTokenUpdatedAt: null,
      },
    ]);
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-tradera-1',
      slug: 'tradera',
    });
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Tradera browser',
        username: 'seller@example.com',
        password: 'secret',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      },
    });
    createConnectionMock.mockResolvedValue({
      id: 'conn-tradera-1',
      integrationId: 'integration-tradera-1',
      name: 'Tradera browser',
      username: 'seller@example.com',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      hasPlaywrightStorageState: false,
      playwrightStorageStateUpdatedAt: null,
      allegroUseSandbox: false,
      hasLinkedInAccessToken: false,
      linkedinTokenUpdatedAt: null,
      linkedinExpiresAt: null,
      linkedinScope: null,
      linkedinPersonUrn: null,
      linkedinProfileUrl: null,
      hasBaseApiToken: false,
      baseTokenUpdatedAt: null,
      baseLastInventoryId: null,
      playwrightHeadless: true,
      playwrightSlowMo: 0,
      playwrightTimeout: 30000,
      playwrightNavigationTimeout: 30000,
      playwrightHumanizeMouse: true,
      playwrightMouseJitter: 5,
      playwrightClickDelayMin: 50,
      playwrightClickDelayMax: 150,
      playwrightInputDelayMin: 20,
      playwrightInputDelayMax: 80,
      playwrightActionDelayMin: 500,
      playwrightActionDelayMax: 1500,
      playwrightProxyEnabled: false,
      playwrightProxyServer: '',
      playwrightProxyUsername: '',
      playwrightProxyPassword: null,
      playwrightEmulateDevice: false,
      playwrightDeviceName: 'Desktop Chrome',
      playwrightPersonaId: null,
      traderaBrowserMode: 'scripted',
      playwrightListingScript: 'export default async function run() {}',
      traderaDefaultTemplateId: null,
      traderaDefaultDurationHours: 72,
      traderaAutoRelistEnabled: true,
      traderaAutoRelistLeadMinutes: 180,
      traderaApiAppId: null,
      traderaApiPublicKey: null,
      traderaApiUserId: null,
      traderaApiSandbox: false,
      traderaApiAppKey: null,
      traderaApiToken: null,
      traderaApiTokenUpdatedAt: null,
    });
    encryptSecretMock.mockImplementation((value: string) => `enc:${value}`);
  });

  it('includes scripted Tradera fields when listing connections', async () => {
    const response = await GET_handler(
      new Request('http://localhost/api/v2/integrations/integration-tradera-1/connections') as never,
      {} as never,
      { id: 'integration-tradera-1' }
    );

    const payload = await response.json();

    expect(payload).toEqual([
      expect.objectContaining({
        id: 'conn-tradera-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
        hasPlaywrightListingScript: true,
      }),
    ]);
  });

  it('persists scripted Tradera fields when creating a connection', async () => {
    const response = await POST_handler(
      new Request('http://localhost/api/v2/integrations/integration-tradera-1/connections', {
        method: 'POST',
      }) as never,
      {} as never,
      { id: 'integration-tradera-1' }
    );

    const payload = await response.json();

    expect(createConnectionMock).toHaveBeenCalledWith('integration-tradera-1', {
      name: 'Tradera browser',
      username: 'seller@example.com',
      password: 'enc:secret',
      traderaBrowserMode: 'scripted',
      playwrightListingScript: 'export default async function run() {}',
    });
    expect(payload).toMatchObject({
      id: 'conn-tradera-1',
      traderaBrowserMode: 'scripted',
      playwrightListingScript: 'export default async function run() {}',
      hasPlaywrightListingScript: true,
    });
  });

  it('normalizes the managed Tradera default script to runtime fallback on create', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Tradera browser',
        username: 'seller@example.com',
        password: 'secret',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      },
    });
    createConnectionMock.mockResolvedValue({
      id: 'conn-tradera-1',
      integrationId: 'integration-tradera-1',
      name: 'Tradera browser',
      username: 'seller@example.com',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      traderaBrowserMode: 'scripted',
      playwrightListingScript: null,
    });

    const response = await POST_handler(
      new Request('http://localhost/api/v2/integrations/integration-tradera-1/connections', {
        method: 'POST',
      }) as never,
      {} as never,
      { id: 'integration-tradera-1' }
    );

    const payload = await response.json();

    expect(createConnectionMock).toHaveBeenCalledWith('integration-tradera-1', {
      name: 'Tradera browser',
      username: 'seller@example.com',
      password: 'enc:secret',
      traderaBrowserMode: 'scripted',
      playwrightListingScript: null,
    });
    expect(payload).toMatchObject({
      id: 'conn-tradera-1',
      traderaBrowserMode: 'scripted',
      playwrightListingScript: null,
      hasPlaywrightListingScript: false,
    });
  });

  it('rejects invalid scripted Tradera Playwright scripts during create', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Tradera browser',
        username: 'seller@example.com',
        password: 'secret',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: `
          if (true) {
            return { ok: true };
        `,
      },
    });

    await expect(
      POST_handler(
        new Request('http://localhost/api/v2/integrations/integration-tradera-1/connections', {
          method: 'POST',
        }) as never,
        {} as never,
        { id: 'integration-tradera-1' }
      )
    ).rejects.toThrow(
      'Invalid Tradera Playwright listing script. Reset to the managed default or fix the syntax.'
    );

    expect(createConnectionMock).not.toHaveBeenCalled();
  });

  it('allows creating a Vinted browser connection without credentials', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-vinted-1',
      slug: 'vinted',
    });
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Vinted Browser',
      },
    });
    createConnectionMock.mockResolvedValue({
      id: 'conn-vinted-1',
      integrationId: 'integration-vinted-1',
      name: 'Vinted Browser',
      username: undefined,
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      playwrightStorageStateUpdatedAt: null,
      playwrightPersonaId: null,
      traderaBrowserMode: 'builtin',
      traderaDefaultDurationHours: 72,
      traderaAutoRelistEnabled: true,
      traderaAutoRelistLeadMinutes: 180,
      traderaApiSandbox: false,
    });

    const response = await POST_handler(
      new Request('http://localhost/api/v2/integrations/integration-vinted-1/connections', {
        method: 'POST',
      }) as never,
      {} as never,
      { id: 'integration-vinted-1' }
    );

    const payload = await response.json();

    expect(createConnectionMock).toHaveBeenCalledWith('integration-vinted-1', {
      name: 'Vinted Browser',
    });
    expect(encryptSecretMock).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      id: 'conn-vinted-1',
      name: 'Vinted Browser',
    });
  });
});

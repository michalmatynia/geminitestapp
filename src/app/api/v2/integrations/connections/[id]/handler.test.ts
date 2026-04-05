import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseJsonBodyMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
  updateConnectionMock,
  encryptSecretMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  encryptSecretMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
}));

vi.mock('@/features/auth/server', () => ({
  auth: vi.fn(),
  findAuthUserById: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: async () => ({
    getConnectionById: (...args: unknown[]) => getConnectionByIdMock(...args),
    getIntegrationById: (...args: unknown[]) => getIntegrationByIdMock(...args),
    updateConnection: (...args: unknown[]) => updateConnectionMock(...args),
  }),
  encryptSecret: (...args: unknown[]) => encryptSecretMock(...args),
}));

import { PUT_handler, deleteQuerySchema } from './handler';

describe('integration connection by-id handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Tradera browser',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      },
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'conn-tradera-1',
      integrationId: 'integration-tradera-1',
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-tradera-1',
      slug: 'tradera',
    });
    updateConnectionMock.mockResolvedValue({
      id: 'conn-tradera-1',
      integrationId: 'integration-tradera-1',
      name: 'Tradera browser',
      username: 'seller@example.com',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
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

  it('persists scripted Tradera fields and returns them in the response', async () => {
    const response = await PUT_handler(
      new Request('http://localhost/api/v2/integrations/connections/conn-tradera-1', {
        method: 'PUT',
      }) as never,
      {} as never,
      { id: 'conn-tradera-1' }
    );

    const payload = await response.json();

    expect(updateConnectionMock).toHaveBeenCalledWith('conn-tradera-1', {
      name: 'Tradera browser',
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

  it('persists an explicit headed preference for Playwright-backed Tradera connections', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Tradera browser',
        playwrightHeadless: false,
      },
    });
    updateConnectionMock.mockResolvedValue({
      id: 'conn-tradera-1',
      integrationId: 'integration-tradera-1',
      name: 'Tradera browser',
      username: 'seller@example.com',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      playwrightHeadless: false,
      traderaBrowserMode: 'scripted',
      traderaDefaultDurationHours: 72,
      traderaAutoRelistEnabled: true,
      traderaAutoRelistLeadMinutes: 180,
      traderaApiSandbox: false,
    });

    const response = await PUT_handler(
      new Request('http://localhost/api/v2/integrations/connections/conn-tradera-1', {
        method: 'PUT',
      }) as never,
      {} as never,
      { id: 'conn-tradera-1' }
    );

    const payload = await response.json();

    expect(updateConnectionMock).toHaveBeenCalledWith(
      'conn-tradera-1',
      expect.objectContaining({
        name: 'Tradera browser',
        playwrightHeadless: false,
      })
    );
    expect(payload).toMatchObject({
      id: 'conn-tradera-1',
      playwrightHeadless: false,
    });
  });

  it('rejects invalid scripted Tradera Playwright scripts during update', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Tradera browser',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: `
          if (true) {
            return { ok: true };
        `,
      },
    });

    await expect(
      PUT_handler(
        new Request('http://localhost/api/v2/integrations/connections/conn-tradera-1', {
          method: 'PUT',
        }) as never,
        {} as never,
        { id: 'conn-tradera-1' }
      )
    ).rejects.toThrow(
      'Invalid Tradera Playwright listing script. Reset to the managed default or fix the syntax.'
    );

    expect(updateConnectionMock).not.toHaveBeenCalled();
  });

  it('still exports the delete query schema', () => {
    expect(typeof deleteQuerySchema.safeParse).toBe('function');
  });
});

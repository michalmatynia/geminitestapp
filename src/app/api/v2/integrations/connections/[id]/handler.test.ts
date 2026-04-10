import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  parseJsonBodyMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
  updateConnectionMock,
  encryptSecretMock,
  getSettingValueMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  encryptSecretMock: vi.fn(),
  getSettingValueMock: vi.fn(),
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

vi.mock('@/shared/lib/ai/server-settings', () => ({
  getSettingValue: (...args: unknown[]) => getSettingValueMock(...args),
}));

import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from '@/features/integrations/services/tradera-listing/default-script';
import { PUT_handler, deleteQuerySchema } from './handler';

describe('integration connection by-id handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettingValueMock.mockResolvedValue(null);
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Tradera browser',
        playwrightBrowser: 'chromium',
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
      playwrightBrowser: 'chromium',
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
      playwrightBrowser: 'chromium',
      traderaBrowserMode: 'scripted',
      playwrightListingScript: 'export default async function run() {}',
    });
    expect(payload).toMatchObject({
      id: 'conn-tradera-1',
      playwrightBrowser: 'chromium',
      traderaBrowserMode: 'scripted',
      playwrightListingScript: 'export default async function run() {}',
      hasPlaywrightListingScript: true,
    });
  });

  it('persists Tradera parameter mapper payloads and returns them in the response', async () => {
    const rulesJson = JSON.stringify({
      version: 1,
      rules: [{ id: 'rule-1', fieldLabel: 'Jewellery Material' }],
    });
    const catalogJson = JSON.stringify({
      version: 1,
      entries: [{ id: 'cat-jewellery:jewellerymaterial', fieldLabel: 'Jewellery Material' }],
    });

    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Tradera browser',
        traderaParameterMapperRulesJson: rulesJson,
        traderaParameterMapperCatalogJson: catalogJson,
      },
    });
    updateConnectionMock.mockResolvedValue({
      id: 'conn-tradera-1',
      integrationId: 'integration-tradera-1',
      name: 'Tradera browser',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      traderaParameterMapperRulesJson: rulesJson,
      traderaParameterMapperCatalogJson: catalogJson,
    });

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
      traderaParameterMapperRulesJson: rulesJson,
      traderaParameterMapperCatalogJson: catalogJson,
    });
    expect(payload).toMatchObject({
      id: 'conn-tradera-1',
      traderaParameterMapperRulesJson: rulesJson,
      traderaParameterMapperCatalogJson: catalogJson,
    });
  });

  it('normalizes the managed Tradera default script to runtime fallback on update', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Tradera browser',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      },
    });
    updateConnectionMock.mockResolvedValue({
      id: 'conn-tradera-1',
      integrationId: 'integration-tradera-1',
      name: 'Tradera browser',
      username: 'seller@example.com',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      traderaBrowserMode: 'scripted',
      playwrightListingScript: null,
    });

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
      playwrightListingScript: null,
    });
    expect(payload).toMatchObject({
      id: 'conn-tradera-1',
      traderaBrowserMode: 'scripted',
      playwrightListingScript: null,
      hasPlaywrightListingScript: false,
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

  it('allows clearing the username for Vinted browser connections', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Vinted Browser',
        username: '',
      },
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'conn-vinted-1',
      integrationId: 'integration-vinted-1',
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-vinted-1',
      slug: 'vinted',
    });
    updateConnectionMock.mockResolvedValue({
      id: 'conn-vinted-1',
      integrationId: 'integration-vinted-1',
      name: 'Vinted Browser',
      username: '',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      traderaBrowserMode: 'builtin',
      traderaDefaultDurationHours: 72,
      traderaAutoRelistEnabled: true,
      traderaAutoRelistLeadMinutes: 180,
      traderaApiSandbox: false,
    });

    const response = await PUT_handler(
      new Request('http://localhost/api/v2/integrations/connections/conn-vinted-1', {
        method: 'PUT',
      }) as never,
      {} as never,
      { id: 'conn-vinted-1' }
    );

    const payload = await response.json();

    expect(updateConnectionMock).toHaveBeenCalledWith('conn-vinted-1', {
      name: 'Vinted Browser',
      username: '',
    });
    expect(payload).toMatchObject({
      id: 'conn-vinted-1',
      name: 'Vinted Browser',
      username: '',
    });
  });

  it('persists programmable Playwright fields and can reset explicit Playwright overrides', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Programmable Browser',
        playwrightPersonaId: 'persona-1',
        playwrightImportScript: 'export default async function run() {}',
        resetPlaywrightOverrides: true,
      },
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright-1',
      slug: 'playwright-programmable',
    });
    updateConnectionMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      playwrightPersonaId: 'persona-1',
      playwrightImportScript: 'export default async function run() {}',
      playwrightHeadless: null,
    });

    const response = await PUT_handler(
      new Request('http://localhost/api/v2/integrations/connections/conn-playwright-1', {
        method: 'PUT',
      }) as never,
      {} as never,
      { id: 'conn-playwright-1' }
    );

    const payload = await response.json();

    expect(updateConnectionMock).toHaveBeenCalledWith(
      'conn-playwright-1',
      expect.objectContaining({
        name: 'Programmable Browser',
        playwrightPersonaId: 'persona-1',
        playwrightImportScript: 'export default async function run() {}',
        playwrightHeadless: null,
        playwrightSlowMo: null,
        playwrightTimeout: null,
        playwrightNavigationTimeout: null,
      })
    );
    expect(payload).toMatchObject({
      id: 'conn-playwright-1',
      playwrightPersonaId: 'persona-1',
      playwrightImportScript: 'export default async function run() {}',
      playwrightHeadless: true,
    });
  });

  it('resolves response Playwright settings from persona baselines after updates', async () => {
    getSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'persona-1',
          name: 'Human runner',
          settings: {
            slowMo: 125,
            humanizeMouse: false,
            browser: 'chrome',
          },
        },
      ])
    );
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Programmable Browser',
        playwrightPersonaId: 'persona-1',
        resetPlaywrightOverrides: true,
      },
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright-1',
      slug: 'playwright-programmable',
    });
    updateConnectionMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      playwrightPersonaId: 'persona-1',
      playwrightHeadless: null,
    });

    const response = await PUT_handler(
      new Request('http://localhost/api/v2/integrations/connections/conn-playwright-1', {
        method: 'PUT',
      }) as never,
      {} as never,
      { id: 'conn-playwright-1' }
    );

    const payload = await response.json();

    expect(payload).toMatchObject({
      id: 'conn-playwright-1',
      playwrightPersonaId: 'persona-1',
      playwrightSlowMo: 125,
      playwrightHumanizeMouse: false,
      playwrightBrowser: 'chrome',
    });
  });

  it('still exports the delete query schema', () => {
    expect(typeof deleteQuerySchema.safeParse).toBe('function');
  });
});

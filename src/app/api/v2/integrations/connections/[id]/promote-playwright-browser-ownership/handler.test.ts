import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAYWRIGHT_ACTIONS_SETTINGS_KEY } from '@/shared/contracts/playwright-steps';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  fetchResolvedPlaywrightRuntimeActionsMock: vi.fn(),
  parseAndValidatePlaywrightActionsSettingValueMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  updateOneMock: vi.fn(),
  clearSettingsCacheMock: vi.fn(),
  encodeSettingValueMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccessMock,
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => mocks.parseJsonBodyMock(...args),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: async () => ({
    getConnectionById: (...args: unknown[]) => mocks.getConnectionByIdMock(...args),
    getIntegrationById: (...args: unknown[]) => mocks.getIntegrationByIdMock(...args),
    updateConnection: (...args: unknown[]) => mocks.updateConnectionMock(...args),
  }),
}));

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  fetchResolvedPlaywrightRuntimeActions: (...args: unknown[]) =>
    mocks.fetchResolvedPlaywrightRuntimeActionsMock(...args),
}));

vi.mock('@/shared/lib/browser-execution/playwright-actions-settings-validation', () => ({
  parseAndValidatePlaywrightActionsSettingValue: (...args: unknown[]) =>
    mocks.parseAndValidatePlaywrightActionsSettingValueMock(...args),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => mocks.getMongoDbMock(...args),
}));

vi.mock('@/shared/lib/settings-cache', () => ({
  clearSettingsCache: (...args: unknown[]) => mocks.clearSettingsCacheMock(...args),
}));

vi.mock('@/shared/lib/settings/settings-compression', () => ({
  encodeSettingValue: (...args: unknown[]) => mocks.encodeSettingValueMock(...args),
}));

import { POST_handler } from './handler';

describe('promote playwright browser ownership handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Programmable Browser',
        playwrightListingScript: 'export default async function runListing() {}',
        playwrightImportScript: 'export default async function runImport() {}',
        playwrightImportBaseUrl: 'https://example.test',
        playwrightListingActionId: 'listing-base',
        playwrightImportActionId: 'import-base',
        playwrightImportCaptureRoutesJson: '{"routes":[],"appearanceMode":""}',
        playwrightFieldMapperJson: '[]',
        proxyPassword: null,
      },
    });
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      playwrightPersonaId: 'persona-marketplace',
      playwrightBrowser: 'chrome',
      playwrightListingActionId: 'listing-base',
      playwrightImportActionId: 'import-base',
    });
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright-1',
      slug: 'playwright-programmable',
    });
    mocks.fetchResolvedPlaywrightRuntimeActionsMock.mockResolvedValue([
      {
        id: 'listing-base',
        name: 'Listing Base',
        description: null,
        runtimeKey: null,
        blocks: [],
        stepSetIds: [],
        personaId: null,
        executionSettings: {},
        createdAt: '2026-04-17T10:00:00.000Z',
        updatedAt: '2026-04-17T10:00:00.000Z',
      },
      {
        id: 'import-base',
        name: 'Import Base',
        description: null,
        runtimeKey: null,
        blocks: [],
        stepSetIds: [],
        personaId: null,
        executionSettings: {},
        createdAt: '2026-04-17T10:00:00.000Z',
        updatedAt: '2026-04-17T10:00:00.000Z',
      },
    ]);
    mocks.parseAndValidatePlaywrightActionsSettingValueMock.mockImplementation((value: string) => ({
      ok: true,
      value,
    }));
    mocks.updateOneMock.mockResolvedValue({ acknowledged: true });
    mocks.getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        updateOne: mocks.updateOneMock,
      })),
    });
    mocks.encodeSettingValueMock.mockImplementation((_key: string, value: string) => `encoded:${value}`);
  });

  it('promotes programmable legacy browser behavior into connection-scoped action drafts', async () => {
    const response = await POST_handler(
      new Request(
        'http://localhost/api/v2/integrations/connections/conn-playwright-1/promote-playwright-browser-ownership',
        { method: 'POST' }
      ) as never,
      {} as never,
      { id: 'conn-playwright-1' }
    );

    const payload = await response.json();

    expect(mocks.assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(mocks.updateOneMock).toHaveBeenCalledWith(
      { key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: expect.stringContaining('encoded:['),
        }),
        $setOnInsert: expect.objectContaining({
          key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
        }),
      }),
      { upsert: true }
    );
    expect(mocks.clearSettingsCacheMock).toHaveBeenCalledTimes(1);
    expect(mocks.updateConnectionMock).toHaveBeenCalledWith('conn-playwright-1', {
      name: 'Programmable Browser',
      playwrightListingScript: 'export default async function runListing() {}',
      playwrightImportScript: 'export default async function runImport() {}',
      playwrightImportBaseUrl: 'https://example.test',
      playwrightImportCaptureRoutesJson: '{"routes":[],"appearanceMode":""}',
      playwrightFieldMapperJson: '[]',
      playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
      playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
      resetPlaywrightOverrides: true,
    });
    expect(payload).toEqual({
      connectionId: 'conn-playwright-1',
      listingActionId: 'programmable_connection__conn-playwright-1__listing_session',
      importActionId: 'programmable_connection__conn-playwright-1__import_session',
      listingDraftActionName: 'Programmable Browser / Listing session',
      importDraftActionName: 'Programmable Browser / Import session',
    });
  });

  it('rejects promotion when a masked proxy password still requires manual input', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      playwrightProxyEnabled: true,
      playwrightProxyServer: 'proxy.example:9000',
      playwrightProxyUsername: 'user-1',
      playwrightProxyHasPassword: true,
      playwrightListingActionId: 'listing-base',
      playwrightImportActionId: 'import-base',
    });

    await expect(
      POST_handler(
        new Request(
          'http://localhost/api/v2/integrations/connections/conn-playwright-1/promote-playwright-browser-ownership',
          { method: 'POST' }
        ) as never,
        {} as never,
        { id: 'conn-playwright-1' }
      )
    ).rejects.toThrow(
      'Re-enter the programmable connection proxy password before promoting browser ownership into action drafts.'
    );

    expect(mocks.updateOneMock).not.toHaveBeenCalled();
    expect(mocks.updateConnectionMock).not.toHaveBeenCalled();
  });
});

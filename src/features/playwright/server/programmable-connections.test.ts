import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listConnectionsMock: vi.fn(),
  createConnectionMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  requireProgrammableIntegrationByIdMock: vi.fn(),
  requireProgrammableConnectionByIdMock: vi.fn(),
  encryptSecretMock: vi.fn(),
  fetchResolvedPlaywrightRuntimeActionsMock: vi.fn(),
}));

vi.mock('./programmable-storage', () => ({
  listPlaywrightProgrammableConnectionRecords: (...args: unknown[]) =>
    mocks.listConnectionsMock(...args),
  createPlaywrightProgrammableConnectionRecord: (...args: unknown[]) =>
    mocks.createConnectionMock(...args),
  updatePlaywrightProgrammableConnectionRecord: (...args: unknown[]) =>
    mocks.updateConnectionMock(...args),
  requirePlaywrightProgrammableIntegrationById: (...args: unknown[]) =>
    mocks.requireProgrammableIntegrationByIdMock(...args),
  requirePlaywrightProgrammableConnectionById: (...args: unknown[]) =>
    mocks.requireProgrammableConnectionByIdMock(...args),
}));

vi.mock('@/shared/lib/security/encryption', () => ({
  encryptSecret: (...args: unknown[]) => mocks.encryptSecretMock(...args),
}));

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  fetchResolvedPlaywrightRuntimeActions: (...args: unknown[]) =>
    mocks.fetchResolvedPlaywrightRuntimeActionsMock(...args),
}));

import {
  createPlaywrightProgrammableConnection,
  listPlaywrightProgrammableConnections,
  updatePlaywrightProgrammableConnection,
} from './programmable-connections';

describe('playwright programmable connections server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireProgrammableIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright-1',
      slug: 'playwright-programmable',
    });
    mocks.fetchResolvedPlaywrightRuntimeActionsMock.mockResolvedValue([
      {
        id: 'listing-draft',
        name: 'Listing Draft',
        description: null,
        runtimeKey: null,
        blocks: [],
        stepSetIds: [],
        personaId: null,
        executionSettings: {},
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T11:00:00.000Z',
      },
      {
        id: 'import-draft',
        name: 'Import Draft',
        description: null,
        runtimeKey: null,
        blocks: [],
        stepSetIds: [],
        personaId: null,
        executionSettings: {},
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T11:00:00.000Z',
      },
    ]);
    mocks.encryptSecretMock.mockImplementation((value: string) => `enc:${value}`);
  });

  it('lists programmable connections without exposing legacy browser fields', async () => {
    mocks.listConnectionsMock.mockResolvedValue([
      {
        id: 'conn-playwright-2',
        integrationId: 'integration-playwright-1',
        name: 'Programmable Browser',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T11:00:00.000Z',
        playwrightListingActionId: 'listing-draft',
        playwrightImportActionId: 'import-draft',
      },
    ]);

    const result = await listPlaywrightProgrammableConnections('integration-playwright-1');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'conn-playwright-2',
        playwrightListingActionId: 'listing-draft',
        playwrightImportActionId: 'import-draft',
        playwrightLegacyBrowserMigration: expect.objectContaining({
          hasLegacyBrowserBehavior: false,
          requiresManualProxyPasswordInput: false,
        }),
      }),
    ]);
    expect(result[0]).not.toHaveProperty('playwrightPersonaId');
    expect(result[0]).not.toHaveProperty('playwrightBrowser');
  });

  it('creates programmable connections without credentials and returns the programmable response shape', async () => {
    mocks.createConnectionMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      playwrightImportScript: 'export default async function run() {}',
      playwrightImportBaseUrl: 'https://example.test',
      playwrightImportCaptureRoutesJson: '{"routes":[],"appearanceMode":""}',
      playwrightFieldMapperJson: '[]',
      playwrightImportAutomationFlowJson: '{"name":"Draft import","blocks":[]}',
    });

    const result = await createPlaywrightProgrammableConnection({
      integrationId: 'integration-playwright-1',
      data: {
        name: 'Programmable Browser',
        playwrightImportScript: 'export default async function run() {}',
        playwrightImportBaseUrl: 'https://example.test',
        playwrightImportCaptureRoutesJson: '{"routes":[],"appearanceMode":""}',
        playwrightFieldMapperJson: '[]',
        playwrightImportAutomationFlowJson: '{"name":"Draft import","blocks":[]}',
      },
    });

    expect(mocks.createConnectionMock).toHaveBeenCalledWith({
      integrationId: 'integration-playwright-1',
      input: {
        name: 'Programmable Browser',
        playwrightImportScript: 'export default async function run() {}',
        playwrightImportBaseUrl: 'https://example.test',
        playwrightImportCaptureRoutesJson: '{"routes":[],"appearanceMode":""}',
        playwrightFieldMapperJson: '[]',
        playwrightImportAutomationFlowJson: '{"name":"Draft import","blocks":[]}',
      },
    });
    expect(result).toMatchObject({
      id: 'conn-playwright-1',
      playwrightImportScript: 'export default async function run() {}',
      playwrightImportBaseUrl: 'https://example.test',
      playwrightImportCaptureRoutesJson: '{"routes":[],"appearanceMode":""}',
      playwrightFieldMapperJson: '[]',
      playwrightImportAutomationFlowJson: '{"name":"Draft import","blocks":[]}',
      playwrightLegacyBrowserMigration: expect.objectContaining({
        hasLegacyBrowserBehavior: false,
        listingDraftActionName: 'Programmable Browser / Listing session',
      }),
    });
  });

  it('rejects legacy browser fields for programmable create', async () => {
    await expect(
      createPlaywrightProgrammableConnection({
        integrationId: 'integration-playwright-1',
        data: {
          name: 'Programmable Browser',
          ...( { playwrightPersonaId: 'persona-1' } as Record<string, unknown> ),
        } as never,
      })
    ).rejects.toThrow(
      'Programmable connections no longer accept connection-level Playwright browser settings. Edit the selected Step Sequencer action instead.'
    );

    expect(mocks.createConnectionMock).not.toHaveBeenCalled();
  });

  it('updates programmable connections and hides browser settings after cleanup', async () => {
    mocks.requireProgrammableConnectionByIdMock.mockResolvedValue({
      connection: {
        id: 'conn-playwright-1',
        integrationId: 'integration-playwright-1',
      },
      integration: {
        id: 'integration-playwright-1',
        slug: 'playwright-programmable',
      },
    });
    mocks.updateConnectionMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T11:00:00.000Z',
      playwrightListingActionId: 'listing-draft',
      playwrightImportActionId: 'import-draft',
    });

    const result = await updatePlaywrightProgrammableConnection({
      connectionId: 'conn-playwright-1',
      data: {
        name: 'Programmable Browser',
        resetPlaywrightOverrides: true,
      },
    });

    expect(mocks.updateConnectionMock).toHaveBeenCalledWith({
      connectionId: 'conn-playwright-1',
      input: {
        name: 'Programmable Browser',
        ...{
          playwrightPersonaId: null,
          playwrightIdentityProfile: null,
          playwrightSlowMo: null,
          playwrightTimeout: null,
          playwrightNavigationTimeout: null,
          playwrightLocale: null,
          playwrightTimezoneId: null,
          playwrightHumanizeMouse: null,
          playwrightMouseJitter: null,
          playwrightClickDelayMin: null,
          playwrightClickDelayMax: null,
          playwrightInputDelayMin: null,
          playwrightInputDelayMax: null,
          playwrightActionDelayMin: null,
          playwrightActionDelayMax: null,
          playwrightProxyEnabled: null,
          playwrightProxyServer: null,
          playwrightProxyUsername: null,
          playwrightProxyPassword: null,
          playwrightProxySessionAffinity: null,
          playwrightProxySessionMode: null,
          playwrightProxyProviderPreset: null,
          playwrightEmulateDevice: null,
          playwrightDeviceName: null,
        },
      },
    });
    expect(result).toMatchObject({
      id: 'conn-playwright-1',
      playwrightListingActionId: 'listing-draft',
      playwrightImportActionId: 'import-draft',
      playwrightLegacyBrowserMigration: expect.objectContaining({
        hasLegacyBrowserBehavior: false,
      }),
    });
  });
});

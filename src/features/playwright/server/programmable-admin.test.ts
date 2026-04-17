import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAYWRIGHT_ACTIONS_SETTINGS_KEY } from '@/shared/contracts/playwright-steps';

const mocks = vi.hoisted(() => ({
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  listConnectionsMock: vi.fn(),
  fetchResolvedPlaywrightRuntimeActionsMock: vi.fn(),
  parseAndValidatePlaywrightActionsSettingValueMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  updateOneMock: vi.fn(),
  clearSettingsCacheMock: vi.fn(),
  encodeSettingValueMock: vi.fn(),
  runPlaywrightProgrammableListingForConnectionMock: vi.fn(),
  runPlaywrightProgrammableImportForConnectionMock: vi.fn(),
  runPlaywrightImportAutomationFlowMock: vi.fn(),
  buildPlaywrightImportInputMock: vi.fn(),
  parsePlaywrightFieldMapperJsonMock: vi.fn(),
  mapPlaywrightImportProductsMock: vi.fn(),
}));

vi.mock('./programmable-storage', () => ({
  requirePlaywrightProgrammableConnectionById: async ({ connectionId }: { connectionId: string }) => {
    const connection = await mocks.getConnectionByIdMock(connectionId);
    const integrationId =
      typeof connection?.integrationId === 'string' ? connection.integrationId : undefined;
    const integration =
      typeof integrationId === 'string'
        ? await mocks.getIntegrationByIdMock(integrationId)
        : null;
    return { connection, integration };
  },
  requirePlaywrightProgrammableIntegrationById: async ({ integrationId }: { integrationId: string }) =>
    mocks.getIntegrationByIdMock(integrationId),
  updatePlaywrightProgrammableConnectionRecord: (...args: unknown[]) =>
    mocks.updateConnectionMock(...args),
  listPlaywrightProgrammableConnectionRecords: (...args: unknown[]) =>
    mocks.listConnectionsMock(...args),
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

vi.mock('./programmable', () => ({
  runPlaywrightProgrammableListingForConnection: (...args: unknown[]) =>
    mocks.runPlaywrightProgrammableListingForConnectionMock(...args),
  runPlaywrightProgrammableImportForConnection: (...args: unknown[]) =>
    mocks.runPlaywrightProgrammableImportForConnectionMock(...args),
}));

vi.mock('./automation-flow', () => ({
  runPlaywrightImportAutomationFlow: (...args: unknown[]) =>
    mocks.runPlaywrightImportAutomationFlowMock(...args),
}));

vi.mock('./import-input', () => ({
  buildPlaywrightImportInput: (...args: unknown[]) => mocks.buildPlaywrightImportInputMock(...args),
}));

vi.mock('@/features/integrations/services/playwright-listing/field-mapper', () => ({
  parsePlaywrightFieldMapperJson: (...args: unknown[]) =>
    mocks.parsePlaywrightFieldMapperJsonMock(...args),
  mapPlaywrightImportProducts: (...args: unknown[]) =>
    mocks.mapPlaywrightImportProductsMock(...args),
}));

import {
  cleanupAllPlaywrightProgrammableConnectionsBrowserPersistence,
  cleanupPlaywrightProgrammableConnectionBrowserPersistence,
  promotePlaywrightProgrammableConnectionBrowserOwnership,
  runPlaywrightProgrammableConnectionTest,
} from './programmable-admin';

describe('programmable admin server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('promotes a programmable connection into connection-scoped action drafts', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      playwrightPersonaId: 'persona-marketplace',
      playwrightBrowser: 'chrome',
      playwrightListingActionId: 'listing-base',
      playwrightImportActionId: 'import-base',
    });

    const result = await promotePlaywrightProgrammableConnectionBrowserOwnership({
      connectionId: 'conn-playwright-1',
      payload: {
        name: 'Programmable Browser',
        playwrightListingScript: 'export default async function runListing() {}',
        playwrightImportScript: 'export default async function runImport() {}',
        playwrightImportBaseUrl: 'https://example.test',
        playwrightListingActionId: 'listing-base',
        playwrightImportActionId: 'import-base',
        playwrightImportCaptureRoutesJson: '{"routes":[],"appearanceMode":""}',
        playwrightFieldMapperJson: '[]',
        playwrightImportAutomationFlowJson: '{"name":"Draft import","blocks":[]}',
        proxyPassword: null,
      },
    });

    expect(mocks.updateOneMock).toHaveBeenCalledWith(
      { key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: expect.stringContaining('encoded:['),
        }),
      }),
      { upsert: true }
    );
    expect(mocks.clearSettingsCacheMock).toHaveBeenCalledTimes(1);
    expect(mocks.updateConnectionMock).toHaveBeenCalledWith({
      connectionId: 'conn-playwright-1',
      input: {
        name: 'Programmable Browser',
        playwrightDraftMapperJson: null,
        playwrightListingScript: 'export default async function runListing() {}',
        playwrightImportScript: 'export default async function runImport() {}',
        playwrightImportBaseUrl: 'https://example.test',
        playwrightImportCaptureRoutesJson: '{"routes":[],"appearanceMode":""}',
        playwrightFieldMapperJson: '[]',
        playwrightImportAutomationFlowJson: '{"name":"Draft import","blocks":[]}',
        playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
        playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
        resetPlaywrightOverrides: true,
      },
    });
    expect(result).toEqual({
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
      promotePlaywrightProgrammableConnectionBrowserOwnership({
        connectionId: 'conn-playwright-1',
        payload: {
          name: 'Programmable Browser',
        },
      })
    ).rejects.toThrow(
      'Re-enter the programmable connection proxy password before promoting browser ownership into action drafts.'
    );

    expect(mocks.updateOneMock).not.toHaveBeenCalled();
    expect(mocks.updateConnectionMock).not.toHaveBeenCalled();
  });

  it('cleans one programmable connection when it already points at generated drafts', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      playwrightPersonaId: 'persona-marketplace',
      playwrightBrowser: 'chrome',
      playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
      playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
    });
    mocks.fetchResolvedPlaywrightRuntimeActionsMock.mockResolvedValue([
      {
        id: 'programmable_connection__conn-playwright-1__listing_session',
        name: 'Programmable Browser / Listing session',
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
        id: 'programmable_connection__conn-playwright-1__import_session',
        name: 'Programmable Browser / Import session',
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
    mocks.updateConnectionMock.mockResolvedValue({
      id: 'conn-playwright-1',
      playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
      playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
    });

    await expect(
      cleanupPlaywrightProgrammableConnectionBrowserPersistence('conn-playwright-1')
    ).resolves.toEqual({
      connectionId: 'conn-playwright-1',
      cleaned: true,
      playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
      playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
    });
  });

  it('rejects one-connection cleanup before promotion is complete', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      playwrightBrowser: 'chrome',
      playwrightListingActionId: 'listing-base',
      playwrightImportActionId: 'import-base',
    });

    await expect(
      cleanupPlaywrightProgrammableConnectionBrowserPersistence('conn-playwright-1')
    ).rejects.toThrow(
      'This programmable connection cannot clear stored browser fields yet. Promote it into action drafts first, or re-select the generated programmable draft actions.'
    );
  });

  it('bulk-cleans every programmable connection already pointing at generated drafts', async () => {
    mocks.listConnectionsMock.mockResolvedValue([
      {
        id: 'conn-playwright-1',
        integrationId: 'integration-playwright-1',
        name: 'Programmable Browser 1',
        playwrightPersonaId: 'persona-marketplace',
        playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
        playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
      },
      {
        id: 'conn-playwright-2',
        integrationId: 'integration-playwright-1',
        name: 'Programmable Browser 2',
        playwrightBrowser: 'chrome',
        playwrightListingActionId: 'programmable_connection__conn-playwright-2__listing_session',
        playwrightImportActionId: 'programmable_connection__conn-playwright-2__import_session',
      },
      {
        id: 'conn-playwright-3',
        integrationId: 'integration-playwright-1',
        name: 'Programmable Browser 3',
        playwrightBrowser: 'chrome',
        playwrightListingActionId: 'listing-base',
        playwrightImportActionId: 'import-base',
      },
    ]);
    mocks.fetchResolvedPlaywrightRuntimeActionsMock.mockResolvedValue([
      {
        id: 'programmable_connection__conn-playwright-1__listing_session',
        name: 'Listing 1',
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
        id: 'programmable_connection__conn-playwright-1__import_session',
        name: 'Import 1',
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
        id: 'programmable_connection__conn-playwright-2__listing_session',
        name: 'Listing 2',
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
        id: 'programmable_connection__conn-playwright-2__import_session',
        name: 'Import 2',
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
    mocks.updateConnectionMock
      .mockResolvedValueOnce({ id: 'conn-playwright-1' })
      .mockResolvedValueOnce({ id: 'conn-playwright-2' });

    await expect(
      cleanupAllPlaywrightProgrammableConnectionsBrowserPersistence('integration-playwright-1')
    ).resolves.toEqual({
      integrationId: 'integration-playwright-1',
      cleanedCount: 2,
      cleanedConnectionIds: ['conn-playwright-1', 'conn-playwright-2'],
    });
  });

  it('rejects bulk cleanup when nothing is cleanup-ready', async () => {
    mocks.listConnectionsMock.mockResolvedValue([
      {
        id: 'conn-playwright-3',
        integrationId: 'integration-playwright-1',
        name: 'Programmable Browser 3',
        playwrightBrowser: 'chrome',
        playwrightListingActionId: 'listing-base',
        playwrightImportActionId: 'import-base',
      },
    ]);

    await expect(
      cleanupAllPlaywrightProgrammableConnectionsBrowserPersistence('integration-playwright-1')
    ).rejects.toThrow('No programmable connections are ready for stored browser-field cleanup.');
  });

  it('runs a listing test with the default sample payload', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
    });
    mocks.runPlaywrightProgrammableListingForConnectionMock.mockResolvedValue({
      ok: true,
    });

    const result = await runPlaywrightProgrammableConnectionTest({
      connectionId: 'conn-playwright-1',
      scriptType: 'listing',
    });

    expect(mocks.runPlaywrightProgrammableListingForConnectionMock).toHaveBeenCalledWith({
      connection: expect.objectContaining({ id: 'conn-playwright-1' }),
      input: expect.objectContaining({
        title: 'Programmable Playwright Sample Product',
      }),
    });
    expect(result).toEqual({
      ok: true,
      scriptType: 'listing',
      input: expect.objectContaining({
        title: 'Programmable Playwright Sample Product',
      }),
      result: { ok: true },
    });
  });

  it('runs an import test and maps the returned products', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      playwrightFieldMapperJson: '[{\"source\":\"title\",\"target\":\"name\"}]',
    });
    mocks.buildPlaywrightImportInputMock.mockReturnValue({
      sourceUrl: 'https://example.test/import',
    });
    mocks.runPlaywrightProgrammableImportForConnectionMock.mockResolvedValue({
      rawResult: { ok: true },
      products: [{ title: 'Raw title' }],
    });
    mocks.parsePlaywrightFieldMapperJsonMock.mockReturnValue([{ source: 'title', target: 'name' }]);
    mocks.mapPlaywrightImportProductsMock.mockReturnValue([{ name: 'Mapped title' }]);

    await expect(
      runPlaywrightProgrammableConnectionTest({
        connectionId: 'conn-playwright-1',
        scriptType: 'import',
      })
    ).resolves.toEqual({
      ok: true,
      scriptType: 'import',
      input: {
        sourceUrl: 'https://example.test/import',
      },
      result: {
        rawResult: { ok: true },
        scrapedItems: [{ title: 'Raw title' }],
        rawProducts: [{ title: 'Raw title' }],
        mappedProducts: [{ name: 'Mapped title' }],
      },
    });
  });

  it('runs saved import automation flows in dry-run mode during import tests', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      playwrightFieldMapperJson: '[{\"source\":\"title\",\"target\":\"name\"}]',
      playwrightImportAutomationFlowJson: JSON.stringify({
        name: 'Draft import',
        blocks: [
          {
            kind: 'for_each',
            items: { type: 'path', path: 'vars.scrapedItems' },
            blocks: [{ kind: 'map_product' }, { kind: 'create_draft' }],
          },
        ],
      }),
    });
    mocks.buildPlaywrightImportInputMock.mockReturnValue({
      sourceUrl: 'https://example.test/import',
    });
    mocks.runPlaywrightImportAutomationFlowMock.mockResolvedValue({
      flow: { name: 'Draft import', blocks: [] },
      input: { sourceUrl: 'https://example.test/import' },
      rawResult: { ok: true },
      scrapedItems: [{ title: 'Raw title' }],
      rawProducts: [{ title: 'Raw title' }],
      drafts: [],
      draftPayloads: [{ sku: 'SKU-1' }],
      writeOutcomes: [
        {
          kind: 'draft',
          status: 'dry_run',
          index: 0,
          payload: { sku: 'SKU-1' },
          record: null,
        },
      ],
      products: [],
      productPayloads: [],
      results: { drafts: [{ sku: 'SKU-1' }] },
      vars: {
        scrapedItems: [{ title: 'Raw title' }],
        rawProducts: [{ title: 'Raw title' }],
      },
    });
    mocks.parsePlaywrightFieldMapperJsonMock.mockReturnValue([{ source: 'title', target: 'name' }]);
    mocks.mapPlaywrightImportProductsMock.mockReturnValue([{ name: 'Mapped title' }]);

    await expect(
      runPlaywrightProgrammableConnectionTest({
        connectionId: 'conn-playwright-1',
        scriptType: 'import',
      })
    ).resolves.toEqual({
      ok: true,
      scriptType: 'import',
      input: {
        sourceUrl: 'https://example.test/import',
      },
      result: {
        rawResult: { ok: true },
        scrapedItems: [{ title: 'Raw title' }],
        rawProducts: [{ title: 'Raw title' }],
        mappedProducts: [{ name: 'Mapped title' }],
        automationFlow: {
          executionMode: 'dry_run',
          flow: { name: 'Draft import', blocks: [] },
          drafts: [],
          draftPayloads: [{ sku: 'SKU-1' }],
          writeOutcomes: [
            {
              kind: 'draft',
              status: 'dry_run',
              index: 0,
              payload: { sku: 'SKU-1' },
              record: null,
            },
          ],
          products: [],
          productPayloads: [],
          results: { drafts: [{ sku: 'SKU-1' }] },
          vars: {
            scrapedItems: [{ title: 'Raw title' }],
            rawProducts: [{ title: 'Raw title' }],
          },
        },
      },
    });

    expect(mocks.runPlaywrightImportAutomationFlowMock).toHaveBeenCalledWith({
      connection: expect.objectContaining({ id: 'conn-playwright-1' }),
      input: { sourceUrl: 'https://example.test/import' },
        flow: {
          name: 'Draft import',
          blocks: [
            {
              kind: 'for_each',
              items: { type: 'path', path: 'vars.scrapedItems' },
              blocks: [{ kind: 'map_product' }, { kind: 'create_draft' }],
            },
          ],
      },
      dryRun: true,
    });
    expect(mocks.runPlaywrightProgrammableImportForConnectionMock).not.toHaveBeenCalled();
  });

  it('runs saved import automation flows in commit mode during flow runs', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      playwrightFieldMapperJson: '[{\"source\":\"title\",\"target\":\"name\"}]',
      playwrightImportAutomationFlowJson: JSON.stringify({
        name: 'Commit import',
        blocks: [{ kind: 'create_product' }],
      }),
    });
    mocks.buildPlaywrightImportInputMock.mockReturnValue({
      sourceUrl: 'https://example.test/import',
    });
    mocks.runPlaywrightImportAutomationFlowMock.mockResolvedValue({
      flow: { name: 'Commit import', blocks: [] },
      input: { sourceUrl: 'https://example.test/import' },
      rawResult: { ok: true },
      scrapedItems: [{ title: 'Raw title' }],
      rawProducts: [{ title: 'Raw title' }],
      drafts: [{ id: 'draft-1' }],
      draftPayloads: [{ sku: 'SKU-1' }],
      writeOutcomes: [
        {
          kind: 'draft',
          status: 'created',
          index: 0,
          payload: { sku: 'SKU-1' },
          record: { id: 'draft-1' },
        },
        {
          kind: 'product',
          status: 'created',
          index: 0,
          payload: { sku: 'SKU-1' },
          record: { id: 'product-1' },
        },
      ],
      products: [{ id: 'product-1' }],
      productPayloads: [{ sku: 'SKU-1' }],
      results: { products: [{ id: 'product-1' }] },
      vars: {
        scrapedItems: [{ title: 'Raw title' }],
        rawProducts: [{ title: 'Raw title' }],
      },
    });
    mocks.parsePlaywrightFieldMapperJsonMock.mockReturnValue([{ source: 'title', target: 'name' }]);
    mocks.mapPlaywrightImportProductsMock.mockReturnValue([{ name: 'Mapped title' }]);

    await expect(
      runPlaywrightProgrammableConnectionTest({
        connectionId: 'conn-playwright-1',
        executionMode: 'commit',
        scriptType: 'import',
      })
    ).resolves.toEqual({
      ok: true,
      scriptType: 'import',
      input: {
        sourceUrl: 'https://example.test/import',
      },
      result: {
        rawResult: { ok: true },
        scrapedItems: [{ title: 'Raw title' }],
        rawProducts: [{ title: 'Raw title' }],
        mappedProducts: [{ name: 'Mapped title' }],
        automationFlow: {
          executionMode: 'commit',
          flow: { name: 'Commit import', blocks: [] },
          drafts: [{ id: 'draft-1' }],
          draftPayloads: [{ sku: 'SKU-1' }],
          writeOutcomes: [
            {
              kind: 'draft',
              status: 'created',
              index: 0,
              payload: { sku: 'SKU-1' },
              record: { id: 'draft-1' },
            },
            {
              kind: 'product',
              status: 'created',
              index: 0,
              payload: { sku: 'SKU-1' },
              record: { id: 'product-1' },
            },
          ],
          products: [{ id: 'product-1' }],
          productPayloads: [{ sku: 'SKU-1' }],
          results: { products: [{ id: 'product-1' }] },
          vars: {
            scrapedItems: [{ title: 'Raw title' }],
            rawProducts: [{ title: 'Raw title' }],
          },
        },
      },
    });

    expect(mocks.runPlaywrightImportAutomationFlowMock).toHaveBeenCalledWith({
      connection: expect.objectContaining({ id: 'conn-playwright-1' }),
      input: { sourceUrl: 'https://example.test/import' },
      flow: {
        name: 'Commit import',
        blocks: [{ kind: 'create_product' }],
      },
      dryRun: false,
    });
  });

  it('rejects import flow commits when no automation flow is configured', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      playwrightFieldMapperJson: '[{\"source\":\"title\",\"target\":\"name\"}]',
      playwrightImportAutomationFlowJson: null,
    });
    mocks.buildPlaywrightImportInputMock.mockReturnValue({
      sourceUrl: 'https://example.test/import',
    });

    await expect(
      runPlaywrightProgrammableConnectionTest({
        connectionId: 'conn-playwright-1',
        executionMode: 'commit',
        scriptType: 'import',
      })
    ).rejects.toThrow('Import flow execution requires saved automation flow JSON.');

    expect(mocks.runPlaywrightImportAutomationFlowMock).not.toHaveBeenCalled();
    expect(mocks.runPlaywrightProgrammableImportForConnectionMock).not.toHaveBeenCalled();
  });
});

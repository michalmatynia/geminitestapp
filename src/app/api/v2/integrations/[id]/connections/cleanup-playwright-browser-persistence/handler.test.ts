import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  listConnectionsMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  fetchResolvedPlaywrightRuntimeActionsMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccessMock,
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: async () => ({
    getIntegrationById: (...args: unknown[]) => mocks.getIntegrationByIdMock(...args),
    listConnections: (...args: unknown[]) => mocks.listConnectionsMock(...args),
    updateConnection: (...args: unknown[]) => mocks.updateConnectionMock(...args),
  }),
}));

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  fetchResolvedPlaywrightRuntimeActions: (...args: unknown[]) =>
    mocks.fetchResolvedPlaywrightRuntimeActionsMock(...args),
}));

import { POST_handler } from './handler';

describe('bulk cleanup playwright browser persistence handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright-1',
      slug: 'playwright-programmable',
    });
    mocks.fetchResolvedPlaywrightRuntimeActionsMock.mockResolvedValue([
      {
        id: 'programmable_connection__conn-playwright-1__listing_session',
        name: 'Programmable Browser 1 / Listing session',
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
        name: 'Programmable Browser 1 / Import session',
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
        name: 'Programmable Browser 2 / Listing session',
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
        name: 'Programmable Browser 2 / Import session',
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
  });

  it('cleans every programmable connection that is already pointing at its generated drafts', async () => {
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
    mocks.updateConnectionMock
      .mockResolvedValueOnce({ id: 'conn-playwright-1' })
      .mockResolvedValueOnce({ id: 'conn-playwright-2' });

    const response = await POST_handler(
      new Request(
        'http://localhost/api/v2/integrations/integration-playwright-1/connections/cleanup-playwright-browser-persistence',
        { method: 'POST' }
      ) as never,
      {} as never,
      { id: 'integration-playwright-1' }
    );

    expect(mocks.updateConnectionMock).toHaveBeenNthCalledWith(1, 'conn-playwright-1', {
      resetPlaywrightOverrides: true,
      playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
      playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
    });
    expect(mocks.updateConnectionMock).toHaveBeenNthCalledWith(2, 'conn-playwright-2', {
      resetPlaywrightOverrides: true,
      playwrightListingActionId: 'programmable_connection__conn-playwright-2__listing_session',
      playwrightImportActionId: 'programmable_connection__conn-playwright-2__import_session',
    });
    await expect(response.json()).resolves.toEqual({
      integrationId: 'integration-playwright-1',
      cleanedCount: 2,
      cleanedConnectionIds: ['conn-playwright-1', 'conn-playwright-2'],
    });
  });

  it('rejects bulk cleanup when no programmable connections are ready', async () => {
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
      POST_handler(
        new Request(
          'http://localhost/api/v2/integrations/integration-playwright-1/connections/cleanup-playwright-browser-persistence',
          { method: 'POST' }
        ) as never,
        {} as never,
        { id: 'integration-playwright-1' }
      )
    ).rejects.toThrow(
      'No programmable connections are ready for stored browser-field cleanup.'
    );

    expect(mocks.updateConnectionMock).not.toHaveBeenCalled();
  });
});

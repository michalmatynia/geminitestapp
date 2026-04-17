import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  fetchResolvedPlaywrightRuntimeActionsMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccessMock,
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

import { POST_handler } from './handler';

describe('cleanup playwright browser persistence handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-playwright-1',
      slug: 'playwright-programmable',
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
  });

  it('clears stored legacy browser fields when the connection already points at its generated drafts', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      playwrightPersonaId: 'persona-marketplace',
      playwrightBrowser: 'chrome',
      playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
      playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
    });
    mocks.updateConnectionMock.mockResolvedValue({
      id: 'conn-playwright-1',
      playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
      playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
    });

    const response = await POST_handler(
      new Request(
        'http://localhost/api/v2/integrations/connections/conn-playwright-1/cleanup-playwright-browser-persistence',
        { method: 'POST' }
      ) as never,
      {} as never,
      { id: 'conn-playwright-1' }
    );

    expect(mocks.updateConnectionMock).toHaveBeenCalledWith('conn-playwright-1', {
      resetPlaywrightOverrides: true,
      playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
      playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
    });
    await expect(response.json()).resolves.toEqual({
      connectionId: 'conn-playwright-1',
      cleaned: true,
      playwrightListingActionId: 'programmable_connection__conn-playwright-1__listing_session',
      playwrightImportActionId: 'programmable_connection__conn-playwright-1__import_session',
    });
  });

  it('rejects cleanup when the connection is not yet pointing at the generated drafts', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'conn-playwright-1',
      integrationId: 'integration-playwright-1',
      name: 'Programmable Browser',
      playwrightPersonaId: 'persona-marketplace',
      playwrightBrowser: 'chrome',
      playwrightListingActionId: 'listing-base',
      playwrightImportActionId: 'import-base',
    });

    await expect(
      POST_handler(
        new Request(
          'http://localhost/api/v2/integrations/connections/conn-playwright-1/cleanup-playwright-browser-persistence',
          { method: 'POST' }
        ) as never,
        {} as never,
        { id: 'conn-playwright-1' }
      )
    ).rejects.toThrow(
      'This programmable connection cannot clear stored browser fields yet. Promote it into action drafts first, or re-select the generated programmable draft actions.'
    );

    expect(mocks.updateConnectionMock).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  cleanupBrowserPersistenceMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccessMock,
}));

vi.mock('@/features/playwright/server', () => ({
  cleanupPlaywrightProgrammableConnectionBrowserPersistence: (...args: unknown[]) =>
    mocks.cleanupBrowserPersistenceMock(...args),
}));

import { postHandler } from './handler';

describe('playwright programmable cleanup browser persistence handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to the shared Playwright server action', async () => {
    mocks.cleanupBrowserPersistenceMock.mockResolvedValue({
      connectionId: 'conn-playwright-1',
      cleaned: true,
      playwrightListingActionId: 'listing-action',
      playwrightImportActionId: 'import-action',
    });

    const response = await postHandler(
      new Request('http://localhost/api/playwright/programmable/connections/conn-playwright-1/cleanup-browser-persistence', {
        method: 'POST',
      }) as never,
      {} as never,
      { id: 'conn-playwright-1' }
    );

    expect(mocks.assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(mocks.cleanupBrowserPersistenceMock).toHaveBeenCalledWith('conn-playwright-1');
    await expect(response.json()).resolves.toEqual({
      connectionId: 'conn-playwright-1',
      cleaned: true,
      playwrightListingActionId: 'listing-action',
      playwrightImportActionId: 'import-action',
    });
  });
});

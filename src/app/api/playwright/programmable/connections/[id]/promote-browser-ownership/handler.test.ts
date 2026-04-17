import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  promoteBrowserOwnershipMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccessMock,
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => mocks.parseJsonBodyMock(...args),
}));

vi.mock('@/features/playwright/server', () => ({
  promotePlaywrightProgrammableBrowserOwnershipSchema: { safeParse: vi.fn() },
  promotePlaywrightProgrammableConnectionBrowserOwnership: (...args: unknown[]) =>
    mocks.promoteBrowserOwnershipMock(...args),
}));

import { POST_handler } from './handler';

describe('playwright programmable promote browser ownership handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to the shared Playwright server action', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Programmable Browser',
      },
    });
    mocks.promoteBrowserOwnershipMock.mockResolvedValue({
      connectionId: 'conn-playwright-1',
      listingActionId: 'listing-action',
      importActionId: 'import-action',
      listingDraftActionName: 'Listing action',
      importDraftActionName: 'Import action',
    });

    const response = await POST_handler(
      new Request('http://localhost/api/playwright/programmable/connections/conn-playwright-1/promote-browser-ownership', {
        method: 'POST',
      }) as never,
      {} as never,
      { id: 'conn-playwright-1' }
    );

    expect(mocks.assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(mocks.promoteBrowserOwnershipMock).toHaveBeenCalledWith({
      connectionId: 'conn-playwright-1',
      payload: { name: 'Programmable Browser' },
    });
    await expect(response.json()).resolves.toEqual({
      connectionId: 'conn-playwright-1',
      listingActionId: 'listing-action',
      importActionId: 'import-action',
      listingDraftActionName: 'Listing action',
      importDraftActionName: 'Import action',
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  cleanupAllBrowserPersistenceMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccessMock,
}));

vi.mock('@/features/playwright/server', () => ({
  cleanupAllPlaywrightProgrammableConnectionsBrowserPersistence: (...args: unknown[]) =>
    mocks.cleanupAllBrowserPersistenceMock(...args),
}));

import { POST_handler } from './handler';

describe('v2 bulk cleanup playwright browser persistence handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to the shared Playwright server action', async () => {
    mocks.cleanupAllBrowserPersistenceMock.mockResolvedValue({
      integrationId: 'integration-playwright-1',
      cleanedCount: 2,
      cleanedConnectionIds: ['conn-playwright-1', 'conn-playwright-2'],
    });

    const response = await POST_handler(
      new Request('http://localhost/api/v2/integrations/integration-playwright-1/connections/cleanup-playwright-browser-persistence', {
        method: 'POST',
      }) as never,
      {} as never,
      { id: 'integration-playwright-1' }
    );

    expect(mocks.assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(mocks.cleanupAllBrowserPersistenceMock).toHaveBeenCalledWith(
      'integration-playwright-1'
    );
    await expect(response.json()).resolves.toEqual({
      integrationId: 'integration-playwright-1',
      cleanedCount: 2,
      cleanedConnectionIds: ['conn-playwright-1', 'conn-playwright-2'],
    });
  });
});

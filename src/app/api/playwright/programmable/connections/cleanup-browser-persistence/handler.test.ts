import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  requirePlaywrightProgrammableIntegrationMock: vi.fn(),
  cleanupAllBrowserPersistenceMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccessMock,
}));

vi.mock('@/features/playwright/server', () => ({
  cleanupAllPlaywrightProgrammableConnectionsBrowserPersistence: (...args: unknown[]) =>
    mocks.cleanupAllBrowserPersistenceMock(...args),
}));

vi.mock('../../shared', () => ({
  requirePlaywrightProgrammableIntegration: (...args: unknown[]) =>
    mocks.requirePlaywrightProgrammableIntegrationMock(...args),
}));

import { postHandler } from './handler';

describe('playwright programmable bulk cleanup browser persistence handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to the shared Playwright server action with the resolved integration id', async () => {
    mocks.requirePlaywrightProgrammableIntegrationMock.mockResolvedValue({
      id: 'integration-playwright-1',
    });
    mocks.cleanupAllBrowserPersistenceMock.mockResolvedValue({
      integrationId: 'integration-playwright-1',
      cleanedCount: 2,
      cleanedConnectionIds: ['conn-playwright-1', 'conn-playwright-2'],
    });

    const response = await postHandler(
      new Request('http://localhost/api/playwright/programmable/connections/cleanup-browser-persistence', {
        method: 'POST',
      }) as never,
      {} as never
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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

import { assertSettingsManageAccess } from './settings-manage-access';

describe('assertSettingsManageAccess', () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it('allows elevated users or users with settings.manage permission', async () => {
    authMock.mockResolvedValueOnce({
      user: { isElevated: true, permissions: [] },
    });
    await expect(assertSettingsManageAccess()).resolves.toBeUndefined();

    authMock.mockResolvedValueOnce({
      user: { isElevated: false, permissions: ['settings.manage'] },
    });
    await expect(assertSettingsManageAccess()).resolves.toBeUndefined();
  });

  it('rejects users without settings management access', async () => {
    authMock.mockResolvedValue({
      user: { isElevated: false, permissions: ['products.read'] },
    });

    await expect(assertSettingsManageAccess()).rejects.toThrow(/Unauthorized/);
  });
});

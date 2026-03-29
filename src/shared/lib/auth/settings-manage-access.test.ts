import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readOptionalServerAuthSessionMock } = vi.hoisted(() => ({
  readOptionalServerAuthSessionMock: vi.fn(),
}));

vi.mock('@/features/auth/optional-server-auth', () => ({
  readOptionalServerAuthSession: readOptionalServerAuthSessionMock,
}));

import { assertSettingsManageAccess } from '@/features/auth/settings-manage-access';

describe('assertSettingsManageAccess', () => {
  beforeEach(() => {
    readOptionalServerAuthSessionMock.mockReset();
  });

  it('allows elevated users or users with settings.manage permission', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValueOnce({
      user: { isElevated: true, permissions: [] },
    });
    await expect(assertSettingsManageAccess()).resolves.toBeUndefined();

    readOptionalServerAuthSessionMock.mockResolvedValueOnce({
      user: { isElevated: false, permissions: ['settings.manage'] },
    });
    await expect(assertSettingsManageAccess()).resolves.toBeUndefined();
  });

  it('rejects users without settings management access', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: { isElevated: false, permissions: ['products.read'] },
    });

    await expect(assertSettingsManageAccess()).rejects.toThrow(/Unauthorized/);
  });

  it('treats missing request scope as unauthorized instead of surfacing the auth runtime error', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue(null);

    await expect(assertSettingsManageAccess()).rejects.toThrow(/Unauthorized/);
  });
});

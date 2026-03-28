import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readOptionalServerAuthSessionMock } = vi.hoisted(() => ({
  readOptionalServerAuthSessionMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  readOptionalServerAuthSession: readOptionalServerAuthSessionMock,
}));

import { requireFilemakerMailAdminSession } from './filemaker-mail-access';

describe('requireFilemakerMailAdminSession', () => {
  beforeEach(() => {
    readOptionalServerAuthSessionMock.mockReset();
  });

  it('allows elevated sessions', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        email: 'admin@example.com',
        isElevated: true,
      },
    });

    await expect(requireFilemakerMailAdminSession()).resolves.toBeUndefined();
  });

  it('rejects non-elevated or missing sessions', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValueOnce({
      user: {
        email: 'user@example.com',
        role: 'user',
      },
    });

    await expect(requireFilemakerMailAdminSession()).rejects.toMatchObject({
      message: 'Admin access is required for Filemaker mail.',
      httpStatus: 403,
    });

    readOptionalServerAuthSessionMock.mockResolvedValueOnce(null);

    await expect(requireFilemakerMailAdminSession()).rejects.toMatchObject({
      message: 'Admin access is required for Filemaker mail.',
      httpStatus: 403,
    });
  });
});

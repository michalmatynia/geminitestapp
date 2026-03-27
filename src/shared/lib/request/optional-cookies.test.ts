import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

import { readOptionalRequestCookies } from './optional-cookies';

describe('readOptionalRequestCookies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cookies when request scope is available', async () => {
    const cookieStore = {
      get: vi.fn().mockReturnValue({ value: '1' }),
    };
    cookiesMock.mockResolvedValue(cookieStore);

    await expect(readOptionalRequestCookies()).resolves.toBe(cookieStore);
  });

  it('returns null when request scope is missing', async () => {
    cookiesMock.mockRejectedValue(new Error('`cookies` was called outside a request scope'));

    await expect(readOptionalRequestCookies()).resolves.toBeNull();
  });

  it('rethrows unrelated failures', async () => {
    const error = new Error('boom');
    cookiesMock.mockRejectedValue(error);

    await expect(readOptionalRequestCookies()).rejects.toBe(error);
  });
});

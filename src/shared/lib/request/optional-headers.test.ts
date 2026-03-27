import { beforeEach, describe, expect, it, vi } from 'vitest';

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

import { readOptionalRequestHeaders } from './optional-headers';

describe('readOptionalRequestHeaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns headers when request scope is available', async () => {
    const requestHeaders = new Headers({ host: 'example.com' });
    headersMock.mockResolvedValue(requestHeaders);

    await expect(readOptionalRequestHeaders()).resolves.toBe(requestHeaders);
  });

  it('returns null when request scope is missing', async () => {
    headersMock.mockRejectedValue(new Error('`headers` was called outside a request scope'));

    await expect(readOptionalRequestHeaders()).resolves.toBeNull();
  });

  it('rethrows unrelated failures', async () => {
    const error = new Error('boom');
    headersMock.mockRejectedValue(error);

    await expect(readOptionalRequestHeaders()).rejects.toBe(error);
  });
});

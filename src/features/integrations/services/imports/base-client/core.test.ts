import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./config', () => ({
  BASE_API_TIMEOUT_MS: 1000,
  BASE_API_PRODUCT_WRITE_TIMEOUT_MS: 1000,
  BASE_API_IMAGE_TIMEOUT_MS: 1000,
  BASE_API_LARGE_PAYLOAD_BYTES: 1_000_000,
  buildBaseApiUrl: () => 'https://base.example.test/connector.php',
}));

vi.mock('@/shared/lib/observability/transient-recovery/with-recovery', () => ({
  withTransientRecovery: async <T,>(fn: () => Promise<T>) => await fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

import { callBaseApi } from './core';

describe('base-client core', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('surfaces blocked Base accounts as a specific expected integration error', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ERROR',
        error_code: 'ERROR_USER_ACCOUNT_BLOCKED',
        error_message: 'The account related to provided token is blocked',
      }),
    });

    await expect(callBaseApi('token', 'addInventoryProduct')).rejects.toMatchObject({
      message: 'Base.com account for this connection is blocked. Unblock it in Base.com and retry.',
      code: 'INTEGRATION_ERROR',
      httpStatus: 400,
      expected: true,
    });
  });

  it('surfaces unsupported Base methods as a specific expected integration error', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ERROR',
        error_code: 'ERROR_UNKNOWN_METHOD',
        error_message: 'An unknown method has been used',
      }),
    });

    await expect(callBaseApi('token', 'getInventoryList')).rejects.toMatchObject({
      message: 'Base.com does not support the API method "getInventoryList".',
      code: 'INTEGRATION_ERROR',
      httpStatus: 400,
      expected: true,
    });
  });
});

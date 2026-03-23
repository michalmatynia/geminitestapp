import { beforeEach, describe, expect, it, vi } from 'vitest';

import { externalServiceError } from '@/shared/errors/app-error';

const callBaseApiMock = vi.fn();
const logClientErrorMock = vi.fn();

vi.mock('./core', () => ({
  callBaseApi: (...args: unknown[]) => callBaseApiMock(...args),
  callBaseApiRaw: vi.fn(),
}));

vi.mock('../base-client-parsers', () => ({
  extractInventoryList: vi.fn(() => []),
  extractWarehouseList: vi.fn(() => []),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

import { fetchBaseInventories } from './inventory';

describe('fetchBaseInventories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the first real upstream error instead of masking it with ERROR_UNKNOWN_METHOD', async () => {
    callBaseApiMock
      .mockRejectedValueOnce(
        externalServiceError('The account related to provided token is blocked', {
          method: 'getInventories',
          errorCode: 'ERROR_USER_ACCOUNT_BLOCKED',
        })
      )
      .mockRejectedValueOnce(
        externalServiceError('An unknown method has been used', {
          method: 'getInventory',
          errorCode: 'ERROR_UNKNOWN_METHOD',
        })
      )
      .mockRejectedValueOnce(
        externalServiceError('An unknown method has been used', {
          method: 'getInventoryList',
          errorCode: 'ERROR_UNKNOWN_METHOD',
        })
      );

    await expect(fetchBaseInventories('token')).rejects.toMatchObject({
      message: 'The account related to provided token is blocked',
    });
  });
});

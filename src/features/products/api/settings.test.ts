import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    put: (...args: unknown[]) => mocks.apiPut(...args),
    get: vi.fn(),
    delete: (...args: unknown[]) => mocks.apiDelete(...args),
    post: vi.fn(),
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

import { deleteValidationPattern, updatePriceGroup } from './settings';

describe('updatePriceGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiPut.mockResolvedValue({ ok: true });
    mocks.apiDelete.mockResolvedValue({ ok: true });
  });

  it('uses the canonical internal id in the price-group update route', async () => {
    await updatePriceGroup({
      id: 'group-pln',
      groupId: 'PLN_STANDARD',
      name: 'Standard PLN',
      description: null,
      currencyId: 'PLN',
      currencyCode: 'PLN',
      isDefault: true,
      type: 'standard',
      basePriceField: 'price',
      sourceGroupId: null,
      priceMultiplier: 1,
      addToPrice: 0,
      createdAt: '2026-04-04T00:00:00.000Z',
      updatedAt: '2026-04-04T00:00:00.000Z',
    });

    expect(mocks.apiPut).toHaveBeenCalledWith(
      '/api/v2/products/metadata/price-groups/group-pln',
      expect.objectContaining({
        id: 'group-pln',
        groupId: 'PLN_STANDARD',
      })
    );
  });

  it('calls the validator-pattern delete endpoint under products', async () => {
    await deleteValidationPattern('pattern-123');

    expect(mocks.apiDelete).toHaveBeenCalledWith(
      '/api/v2/products/validator-patterns/pattern-123'
    );
  });
});

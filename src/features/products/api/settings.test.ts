import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiPut: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    put: (...args: unknown[]) => mocks.apiPut(...args),
    get: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
}));

import { updatePriceGroup } from './settings';

describe('updatePriceGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiPut.mockResolvedValue({ ok: true });
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
});

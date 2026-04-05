import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import {
  normalizePriceGroupIdentifierForStorage,
  normalizePriceGroupSelectionForStorage,
} from './price-group-storage-normalization';

describe('price-group-storage-normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes a single legacy group identifier to the canonical id', async () => {
    const toArray = vi.fn().mockResolvedValue([
      {
        id: 'group-pln',
        groupId: 'PLN_STANDARD',
      },
    ]);

    mocks.getMongoDb.mockResolvedValue({
      collection: () => ({
        find: vi.fn().mockReturnValue({ toArray }),
      }),
    });

    const result = await normalizePriceGroupIdentifierForStorage('mongodb', 'PLN_STANDARD');

    expect(result).toBe('group-pln');
  });

  it('normalizes catalog-style price group selections to canonical ids', async () => {
    const toArray = vi.fn().mockResolvedValue([
      { id: 'group-pln', groupId: 'PLN_STANDARD' },
      { id: 'group-eur', groupId: 'EUR_STANDARD' },
    ]);

    mocks.getMongoDb.mockResolvedValue({
      collection: () => ({
        find: vi.fn().mockReturnValue({ toArray }),
      }),
    });

    const result = await normalizePriceGroupSelectionForStorage('mongodb', {
      priceGroupIds: ['PLN_STANDARD', 'group-eur', 'EUR_STANDARD'],
      defaultPriceGroupId: 'PLN_STANDARD',
    });

    expect(result).toEqual({
      priceGroupIds: ['group-pln', 'group-eur'],
      defaultPriceGroupId: 'group-pln',
    });
  });

  it('passes trimmed values through unchanged for non-mongodb providers', async () => {
    const result = await normalizePriceGroupSelectionForStorage('memory', {
      priceGroupIds: [' PLN_STANDARD ', 'group-eur'],
      defaultPriceGroupId: ' PLN_STANDARD ',
    });

    expect(result).toEqual({
      priceGroupIds: ['PLN_STANDARD', 'group-eur'],
      defaultPriceGroupId: 'PLN_STANDARD',
    });
    expect(mocks.getMongoDb).not.toHaveBeenCalled();
  });
});

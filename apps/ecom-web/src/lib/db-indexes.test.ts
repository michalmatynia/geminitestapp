/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  appCreateIndex: vi.fn(),
  appCollection: vi.fn(),
  productsCreateIndex: vi.fn(),
  productsCollection: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: mocks.appCollection,
  })),
  getEcommerceProductsDb: vi.fn(async () => ({
    collection: mocks.productsCollection,
  })),
}));

describe('ensureAppIndexes', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.appCreateIndex.mockReset();
    mocks.appCollection.mockReset();
    mocks.productsCreateIndex.mockReset();
    mocks.productsCollection.mockReset();
    mocks.appCollection.mockReturnValue({ createIndex: mocks.appCreateIndex });
    mocks.productsCollection.mockReturnValue({ createIndex: mocks.productsCreateIndex });
    mocks.appCreateIndex.mockResolvedValue('ok');
    mocks.productsCreateIndex.mockResolvedValue('ok');
  });

  it('creates InPost webhook lookup indexes on orders', async () => {
    const { ensureAppIndexes } = await import('./db-indexes');

    await ensureAppIndexes();

    expect(mocks.appCollection).toHaveBeenCalledWith('ecom_orders');
    expect(mocks.appCreateIndex).toHaveBeenCalledWith(
      { 'inpostShipment.trackingNumber': 1 },
      { background: true, name: 'orders_inpost_tracking', sparse: true },
    );
    expect(mocks.appCreateIndex).toHaveBeenCalledWith(
      { inpostEventIds: 1 },
      { background: true, name: 'orders_inpost_event_ids', sparse: true },
    );
  });
});

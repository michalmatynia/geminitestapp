/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  appCreateIndex: vi.fn(),
  appCollection: vi.fn(),
  appIndexes: vi.fn(),
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
    mocks.appIndexes.mockReset();
    mocks.productsCreateIndex.mockReset();
    mocks.productsCollection.mockReset();
    mocks.appCollection.mockReturnValue({
      createIndex: mocks.appCreateIndex,
      indexes: mocks.appIndexes,
    });
    mocks.appIndexes.mockResolvedValue([]);
    mocks.productsCollection.mockReturnValue({ createIndex: mocks.productsCreateIndex });
    mocks.appCreateIndex.mockResolvedValue('ok');
    mocks.productsCreateIndex.mockResolvedValue('ok');
  });

  it('creates InPost webhook lookup indexes on orders', async () => {
    const { ensureAppIndexes } = await import('./db-indexes');

    await ensureAppIndexes();

    expect(mocks.appCollection).toHaveBeenCalledWith('ecom_orders');
    expect(mocks.appCollection).toHaveBeenCalledWith('ecom_settings');
    expect(mocks.appCreateIndex).toHaveBeenCalledWith(
      { key: 1 },
      { background: true, name: 'ecom_settings_key' },
    );
    expect(mocks.appCreateIndex).toHaveBeenCalledWith(
      { 'inpostShipment.trackingNumber': 1 },
      { background: true, name: 'orders_inpost_tracking', sparse: true },
    );
    expect(mocks.appCreateIndex).toHaveBeenCalledWith(
      { inpostEventIds: 1 },
      { background: true, name: 'orders_inpost_event_ids', sparse: true },
    );
  });

  it('does not recreate the ecom settings key index when it already exists', async () => {
    mocks.appIndexes.mockResolvedValue([
      {
        key: { key: 1 },
        name: 'ecom_settings_key',
      },
    ]);
    const { ensureAppIndexes } = await import('./db-indexes');

    await ensureAppIndexes();

    expect(mocks.appCreateIndex).not.toHaveBeenCalledWith(
      { key: 1 },
      expect.objectContaining({ name: 'ecom_settings_key' }),
    );
  });
});

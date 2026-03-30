import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getMongoDbMock,
  findToArrayMock,
  updateOneMock,
} = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  findToArrayMock: vi.fn(),
  updateOneMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: (...args: unknown[]) => getMongoDbMock(...args),
}));

import { getProductOrdersImportRepository } from './index';

describe('product-orders-import repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        find: vi.fn(() => ({
          toArray: findToArrayMock,
        })),
        updateOne: updateOneMock,
      })),
    });
    findToArrayMock.mockResolvedValue([]);
    updateOneMock.mockResolvedValue({ acknowledged: true });
  });

  it('returns no records for empty connection ids or empty order lists', async () => {
    const repository = await getProductOrdersImportRepository();

    await expect(repository.findByConnectionAndBaseOrderIds('', ['order-1'])).resolves.toEqual([]);
    await expect(repository.findByConnectionAndBaseOrderIds('conn-1', [])).resolves.toEqual([]);
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('maps stored Mongo docs into imported order records', async () => {
    findToArrayMock.mockResolvedValue([
      {
        _id: 'conn-1:base-1',
        connectionId: 'conn-1',
        baseOrderId: 'base-1',
        orderNumber: '1001',
        externalStatusId: 'paid',
        externalStatusName: 'Paid',
        buyerName: 'Jane Doe',
        buyerEmail: 'jane@example.com',
        currency: 'PLN',
        totalGross: 123.45,
        deliveryMethod: 'Courier',
        paymentMethod: 'Card',
        source: 'base',
        orderCreatedAt: '2026-03-27T10:00:00.000Z',
        orderUpdatedAt: '2026-03-27T11:00:00.000Z',
        lineItems: [{ sku: 'SKU-1' }],
        fingerprint: 'fp-1',
        raw: { remote: true },
        createdAt: new Date('2026-03-27T10:00:00.000Z'),
        updatedAt: new Date('2026-03-27T11:00:00.000Z'),
        firstImportedAt: new Date('2026-03-27T12:00:00.000Z'),
        lastImportedAt: new Date('2026-03-27T13:00:00.000Z'),
      },
    ]);

    const repository = await getProductOrdersImportRepository();
    const result = await repository.findByConnectionAndBaseOrderIds('conn-1', ['base-1']);

    expect(result).toEqual([
      {
        id: 'conn-1:base-1',
        connectionId: 'conn-1',
        baseOrderId: 'base-1',
        orderNumber: '1001',
        externalStatusId: 'paid',
        externalStatusName: 'Paid',
        buyerName: 'Jane Doe',
        buyerEmail: 'jane@example.com',
        currency: 'PLN',
        totalGross: 123.45,
        deliveryMethod: 'Courier',
        paymentMethod: 'Card',
        source: 'base',
        orderCreatedAt: '2026-03-27T10:00:00.000Z',
        orderUpdatedAt: '2026-03-27T11:00:00.000Z',
        lineItems: [{ sku: 'SKU-1' }],
        fingerprint: 'fp-1',
        raw: { remote: true },
        createdAt: '2026-03-27T10:00:00.000Z',
        updatedAt: '2026-03-27T11:00:00.000Z',
        firstImportedAt: '2026-03-27T12:00:00.000Z',
        lastImportedAt: '2026-03-27T13:00:00.000Z',
      },
    ]);
  });

  it('upserts created and updated orders and reports the sync summary', async () => {
    findToArrayMock.mockResolvedValue([
      {
        _id: 'conn-1:base-existing',
        connectionId: 'conn-1',
        baseOrderId: 'base-existing',
        orderNumber: 'EX-1',
        buyerName: 'Existing Buyer',
        fingerprint: 'fp-existing',
        raw: null,
        createdAt: new Date('2026-03-27T10:00:00.000Z'),
        updatedAt: new Date('2026-03-27T11:00:00.000Z'),
        firstImportedAt: new Date('2026-03-27T12:00:00.000Z'),
        lastImportedAt: new Date('2026-03-27T13:00:00.000Z'),
      },
    ]);

    const repository = await getProductOrdersImportRepository();
    const result = await repository.upsertOrders(' conn-1 ', [
      {
        baseOrderId: 'base-existing',
        orderNumber: 'EX-1',
        externalStatusId: null,
        externalStatusName: null,
        buyerName: 'Existing Buyer',
        buyerEmail: null,
        currency: 'PLN',
        totalGross: 12,
        deliveryMethod: null,
        paymentMethod: null,
        source: 'base',
        orderCreatedAt: null,
        orderUpdatedAt: null,
        lineItems: [],
        fingerprint: 'fp-existing',
        raw: { existing: true },
      },
      {
        baseOrderId: 'base-new',
        orderNumber: 'NEW-1',
        externalStatusId: 'new',
        externalStatusName: 'New',
        buyerName: 'New Buyer',
        buyerEmail: 'new@example.com',
        currency: 'EUR',
        totalGross: 44,
        deliveryMethod: 'Courier',
        paymentMethod: 'Bank transfer',
        source: 'base',
        orderCreatedAt: '2026-03-27T14:00:00.000Z',
        orderUpdatedAt: '2026-03-27T15:00:00.000Z',
        lineItems: [{ sku: 'SKU-2' }],
        fingerprint: 'fp-new',
        raw: { existing: false },
      },
    ] as never);

    expect(updateOneMock).toHaveBeenCalledTimes(2);
    expect(updateOneMock).toHaveBeenNthCalledWith(
      1,
      { _id: 'conn-1:base-existing' },
      expect.objectContaining({
        $set: expect.objectContaining({
          connectionId: 'conn-1',
          baseOrderId: 'base-existing',
          fingerprint: 'fp-existing',
        }),
      }),
      { upsert: true }
    );
    expect(updateOneMock).toHaveBeenNthCalledWith(
      2,
      { _id: 'conn-1:base-new' },
      expect.objectContaining({
        $set: expect.objectContaining({
          connectionId: 'conn-1',
          baseOrderId: 'base-new',
          fingerprint: 'fp-new',
        }),
      }),
      { upsert: true }
    );
    expect(result.createdCount).toBe(1);
    expect(result.updatedCount).toBe(1);
    expect(result.results).toEqual([
      { baseOrderId: 'base-existing', result: 'updated' },
      { baseOrderId: 'base-new', result: 'created' },
    ]);
  });
});

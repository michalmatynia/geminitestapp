import { describe, expect, it } from 'vitest';

import {
  filterNormalizedBaseOrders,
  normalizeBaseOrderStatuses,
  normalizeBaseOrders,
} from './product-orders-import-normalization';

describe('product orders import normalization', () => {
  it('normalizes status maps returned by Base.com', () => {
    expect(
      normalizeBaseOrderStatuses({
        statuses: {
          '1': 'New',
          '2': { name: 'Paid' },
        },
      })
    ).toEqual([
      { id: '1', name: 'New' },
      { id: '2', name: 'Paid' },
    ]);
  });

  it('normalizes orders and resolves line items plus status names', () => {
    const orders = normalizeBaseOrders(
      {
        orders: {
          '1001': {
            order_id: 1001,
            shop_order_id: 'SO-1001',
            order_status_id: '2',
            delivery_fullname: 'Alice Example',
            email: 'alice@example.com',
            currency: 'PLN',
            total_price: '149.99',
            payment_method: 'Card',
            delivery_method: 'Courier',
            date_add: 1_700_000_000,
            products: [
              {
                product_id: 'sku-1',
                name: 'Clock game card',
                quantity: '2',
                price_brutto: '74.995',
              },
            ],
          },
        },
      },
      new Map([['2', 'Paid']])
    );

    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      baseOrderId: '1001',
      orderNumber: 'SO-1001',
      externalStatusId: '2',
      externalStatusName: 'Paid',
      buyerName: 'Alice Example',
      buyerEmail: 'alice@example.com',
      currency: 'PLN',
      totalGross: 149.99,
      paymentMethod: 'Card',
      deliveryMethod: 'Courier',
      importState: 'new',
      lastImportedAt: null,
    });
    expect(orders[0]?.lineItems).toEqual([
      {
        baseProductId: 'sku-1',
        name: 'Clock game card',
        quantity: 2,
        sku: null,
        unitPriceGross: 74.995,
      },
    ]);
    expect(typeof orders[0]?.fingerprint).toBe('string');
    expect(orders[0]?.fingerprint.length).toBeGreaterThan(0);
  });

  it('filters normalized orders by date window, status, and limit', () => {
    const orders = [
      {
        baseOrderId: '1',
        orderNumber: null,
        externalStatusId: '10',
        externalStatusName: 'New',
        buyerName: 'A',
        buyerEmail: null,
        currency: null,
        totalGross: null,
        deliveryMethod: null,
        paymentMethod: null,
        source: null,
        orderCreatedAt: '2026-03-20T10:00:00.000Z',
        orderUpdatedAt: null,
        lineItems: [],
        fingerprint: 'a',
        raw: {},
        importState: 'new' as const,
        lastImportedAt: null,
      },
      {
        baseOrderId: '2',
        orderNumber: null,
        externalStatusId: '20',
        externalStatusName: 'Paid',
        buyerName: 'B',
        buyerEmail: null,
        currency: null,
        totalGross: null,
        deliveryMethod: null,
        paymentMethod: null,
        source: null,
        orderCreatedAt: '2026-03-25T10:00:00.000Z',
        orderUpdatedAt: null,
        lineItems: [],
        fingerprint: 'b',
        raw: {},
        importState: 'new' as const,
        lastImportedAt: null,
      },
    ];

    expect(
      filterNormalizedBaseOrders(orders, {
        dateFrom: '2026-03-24',
        statusId: '20',
        limit: 10,
      }).map((order) => order.baseOrderId)
    ).toEqual(['2']);
  });
});

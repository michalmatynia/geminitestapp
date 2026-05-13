import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  deleteOneCloud: vi.fn(),
  deleteOneLocal: vi.fn(),
  findCloud: vi.fn(),
  findLocal: vi.fn(),
  getAllEcommerceExportDbTargetsForWrite: vi.fn(),
  sortCloud: vi.fn(),
  sortLocal: vi.fn(),
  toArrayCloud: vi.fn(),
  toArrayLocal: vi.fn(),
  updateOneCloud: vi.fn(),
  updateOneLocal: vi.fn(),
}));

vi.mock('./ecommerce-product-export.config', () => ({
  getAllEcommerceExportDbTargetsForWrite: mocks.getAllEcommerceExportDbTargetsForWrite,
}));

import {
  deleteEcommerceDiscountCoupon,
  listEcommerceDiscountCoupons,
  saveEcommerceDiscountCoupon,
} from './ecommerce-discount-coupons';

const buildTargetDb = (
  find: typeof mocks.findLocal,
  updateOne: typeof mocks.updateOneLocal,
  deleteOne: typeof mocks.deleteOneLocal
) => ({
  collection: vi.fn(() => ({
    deleteOne,
    find,
    updateOne,
  })),
});

describe('ecommerce discount coupons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sortLocal.mockReturnValue({ toArray: mocks.toArrayLocal });
    mocks.sortCloud.mockReturnValue({ toArray: mocks.toArrayCloud });
    mocks.findLocal.mockReturnValue({ sort: mocks.sortLocal });
    mocks.findCloud.mockReturnValue({ sort: mocks.sortCloud });
    mocks.toArrayLocal.mockResolvedValue([
      {
        code: 'WELCOME20',
        discountType: 'percentage',
        enabled: true,
        value: 20,
        updatedAt: new Date('2026-05-13T10:00:00.000Z'),
      },
    ]);
    mocks.toArrayCloud.mockResolvedValue([
      {
        code: 'WELCOME20',
        discountType: 'percentage',
        enabled: true,
        value: 0.2,
      },
    ]);
    mocks.updateOneLocal.mockResolvedValue({ upsertedCount: 1 });
    mocks.updateOneCloud.mockResolvedValue({ upsertedCount: 0 });
    mocks.deleteOneLocal.mockResolvedValue({ deletedCount: 1 });
    mocks.deleteOneCloud.mockResolvedValue({ deletedCount: 1 });
    mocks.getAllEcommerceExportDbTargetsForWrite.mockResolvedValue([
      {
        db: buildTargetDb(mocks.findLocal, mocks.updateOneLocal, mocks.deleteOneLocal),
        dbName: 'ecom_local',
        key: 'local',
        source: 'local',
      },
      {
        db: buildTargetDb(mocks.findCloud, mocks.updateOneCloud, mocks.deleteOneCloud),
        dbName: 'ecom_cloud',
        key: 'cloud',
        source: 'cloud',
      },
    ]);
  });

  it('lists merged coupons from local and cloud ecommerce databases', async () => {
    const result = await listEcommerceDiscountCoupons();

    expect(mocks.findLocal).toHaveBeenCalledWith({});
    expect(mocks.sortLocal).toHaveBeenCalledWith({ code: 1 });
    expect(result.coupons).toEqual([
      expect.objectContaining({
        code: 'WELCOME20',
        discountType: 'percentage',
        enabled: true,
        targetSources: ['local', 'cloud'],
        value: 0.2,
      }),
    ]);
    expect(result.targets).toEqual([
      { dbName: 'ecom_local', source: 'local' },
      { dbName: 'ecom_cloud', source: 'cloud' },
    ]);
  });

  it('saves a normalized coupon to every ecommerce database', async () => {
    const result = await saveEcommerceDiscountCoupon({
      code: ' welcome 20 ',
      discountType: 'percentage',
      enabled: true,
      endsAt: null,
      minOrderAmount: 2500,
      singleUse: true,
      startsAt: null,
      usageLimit: 5,
      value: 20,
    });

    expect(mocks.updateOneLocal).toHaveBeenCalledWith(
      { code: 'WELCOME20' },
      expect.objectContaining({
        $set: expect.objectContaining({
          code: 'WELCOME20',
          discountType: 'percentage',
          minOrderAmount: 2500,
          singleUse: true,
          usageLimit: 5,
          value: 0.2,
        }),
        $setOnInsert: expect.objectContaining({ _id: 'WELCOME20' }),
      }),
      { upsert: true }
    );
    expect(mocks.updateOneCloud).toHaveBeenCalledTimes(1);
    expect(result.coupon).toMatchObject({
      code: 'WELCOME20',
      targetSources: ['local', 'cloud'],
      value: 0.2,
    });
  });

  it('deletes a coupon from every ecommerce database', async () => {
    const result = await deleteEcommerceDiscountCoupon(' welcome 20 ');

    expect(mocks.deleteOneLocal).toHaveBeenCalledWith({ code: 'WELCOME20' });
    expect(mocks.deleteOneCloud).toHaveBeenCalledWith({ code: 'WELCOME20' });
    expect(result).toEqual({
      code: 'WELCOME20',
      targets: [
        { dbName: 'ecom_local', source: 'local' },
        { dbName: 'ecom_cloud', source: 'cloud' },
      ],
    });
  });
});

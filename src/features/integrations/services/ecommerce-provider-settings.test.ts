import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  DEFAULT_ECOMMERCE_PROVIDER_SETTINGS,
  ECOMMERCE_PROVIDER_SETTINGS_KEY,
  type EcommerceProviderSettingsInput,
} from '@/shared/contracts/integrations/ecommerce-provider-settings';

const mocks = vi.hoisted(() => ({
  cloudUpdateOne: vi.fn(),
  getAllEcommerceExportDbTargetsForWrite: vi.fn(),
  getProductsMongoDb: vi.fn(),
  localUpdateOne: vi.fn(),
  productFindOne: vi.fn(),
  productUpdateOne: vi.fn(),
}));

vi.mock('@/shared/lib/db/integration-mongo-client', () => ({
  getMongoDb: mocks.getProductsMongoDb,
}));

vi.mock('./ecommerce-product-export.config', () => ({
  getAllEcommerceExportDbTargetsForWrite: mocks.getAllEcommerceExportDbTargetsForWrite,
}));

import {
  getEcommerceProviderSettings,
  saveEcommerceProviderSettings,
} from './ecommerce-provider-settings';

const makeSettings = (): EcommerceProviderSettingsInput => ({
  ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS,
  payment: {
    payu: {
      ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS.payment.payu,
      clientId: 'payu-client',
      clientSecret: 'payu-secret',
      enabled: true,
      posId: '123456',
      secondKey: 'second-key',
    },
  },
  shipping: {
    ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS.shipping,
    inpost: {
      ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS.shipping.inpost,
      apiToken: 'inpost-token',
      enabled: true,
      geowidgetToken: 'geo-token',
      organizationId: 'org-1',
    },
  },
});

const buildProductDb = () => ({
  collection: vi.fn(() => ({
    findOne: mocks.productFindOne,
    updateOne: mocks.productUpdateOne,
  })),
});

const buildTargetDb = (updateOne: typeof mocks.localUpdateOne) => ({
  collection: vi.fn(() => ({
    updateOne,
  })),
});

describe('ecommerce provider settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.productFindOne.mockResolvedValue(null);
    mocks.productUpdateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 1, upsertedCount: 1 });
    mocks.localUpdateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0, upsertedCount: 1 });
    mocks.cloudUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1, upsertedCount: 0 });
    mocks.getProductsMongoDb.mockResolvedValue(buildProductDb());
    mocks.getAllEcommerceExportDbTargetsForWrite.mockResolvedValue([
      {
        db: buildTargetDb(mocks.localUpdateOne),
        dbName: 'ecom_local',
        key: 'local',
        source: 'local',
      },
      {
        db: buildTargetDb(mocks.cloudUpdateOne),
        dbName: 'ecom_cloud',
        key: 'cloud',
        source: 'cloud',
      },
    ]);
  });

  it('returns default settings when no source document exists', async () => {
    const result = await getEcommerceProviderSettings();

    expect(mocks.getProductsMongoDb).toHaveBeenCalledWith('local');
    expect(mocks.productFindOne).toHaveBeenCalledWith({ key: ECOMMERCE_PROVIDER_SETTINGS_KEY });
    expect(result.settings).toEqual(DEFAULT_ECOMMERCE_PROVIDER_SETTINGS);
    expect(result.updatedAt).toBeNull();
  });

  it('saves source settings and pushes them to local and cloud ecommerce databases', async () => {
    const settings = makeSettings();
    const result = await saveEcommerceProviderSettings(settings, {
      pushToEcommerce: true,
      userId: 'admin-1',
    });

    expect(mocks.productUpdateOne).toHaveBeenNthCalledWith(
      1,
      { key: ECOMMERCE_PROVIDER_SETTINGS_KEY },
      expect.objectContaining({
        $set: expect.objectContaining({
          source: 'geminitestapp-products',
          updatedBy: 'admin-1',
          value: expect.objectContaining({
            payment: expect.objectContaining({
              payu: expect.objectContaining({ clientId: 'payu-client' }),
            }),
          }),
        }),
      }),
      { upsert: true }
    );
    expect(mocks.localUpdateOne).toHaveBeenCalledWith(
      {
        $or: [
          { key: ECOMMERCE_PROVIDER_SETTINGS_KEY },
          { _id: ECOMMERCE_PROVIDER_SETTINGS_KEY },
        ],
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          key: ECOMMERCE_PROVIDER_SETTINGS_KEY,
          source: 'geminitestapp-products',
          value: expect.objectContaining({
            shipping: expect.objectContaining({
              inpost: expect.objectContaining({ apiToken: 'inpost-token' }),
            }),
          }),
        }),
      }),
      { upsert: true }
    );
    expect(mocks.localUpdateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          _id: ECOMMERCE_PROVIDER_SETTINGS_KEY,
        }),
      }),
      { upsert: true }
    );
    expect(mocks.cloudUpdateOne).toHaveBeenCalledTimes(1);
    expect(result.pushed).toBe(true);
    expect(result.targets).toEqual([
      {
        dbName: 'ecom_local',
        matchedCount: 0,
        modifiedCount: 0,
        source: 'local',
        upsertedCount: 1,
      },
      {
        dbName: 'ecom_cloud',
        matchedCount: 1,
        modifiedCount: 1,
        source: 'cloud',
        upsertedCount: 0,
      },
    ]);
  });

  it('can save the Products source settings without pushing ecommerce targets', async () => {
    mocks.productFindOne.mockResolvedValue({
      lastPushedAt: new Date('2026-05-13T08:00:00.000Z'),
    });

    const result = await saveEcommerceProviderSettings(makeSettings(), {
      pushToEcommerce: false,
      userId: 'admin-1',
    });

    expect(mocks.localUpdateOne).not.toHaveBeenCalled();
    expect(mocks.cloudUpdateOne).not.toHaveBeenCalled();
    expect(result.pushed).toBe(false);
    expect(result.lastPushedAt).toBe('2026-05-13T08:00:00.000Z');
  });
});

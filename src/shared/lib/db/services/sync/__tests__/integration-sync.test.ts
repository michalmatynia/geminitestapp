import { describe, expect, it, vi } from 'vitest';

import {
  syncIntegrationConnections,
  syncIntegrationConnectionsPrismaToMongo,
  syncIntegrations,
  syncIntegrationsPrismaToMongo,
  syncProductListings,
  syncProductListingsPrismaToMongo,
} from '@/shared/lib/db/services/sync/integration-sync';

const createMongo = (docsByCollection: Record<string, unknown[]>) => {
  const collections = new Map<
    string,
    {
      find: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      insertMany: ReturnType<typeof vi.fn>;
    }
  >();

  const collection = vi.fn((name: string) => {
    if (!collections.has(name)) {
      collections.set(name, {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(docsByCollection[name] ?? []),
        }),
        deleteMany: vi.fn().mockResolvedValue({ deletedCount: 7 }),
        insertMany: vi.fn().mockResolvedValue({
          insertedCount: (docsByCollection[name] ?? []).length,
        }),
      });
    }
    return collections.get(name)!;
  });

  return {
    mongo: { collection } as unknown as Parameters<typeof syncIntegrations>[0]['mongo'],
    collections,
  };
};

const baseContext = {
  normalizeId: (doc: Record<string, unknown>): string =>
    typeof doc._id === 'string' ? doc._id : typeof doc.id === 'string' ? doc.id : '',
  toDate: (value: unknown): Date | null => (value ? new Date(value as string | Date) : null),
  toObjectIdMaybe: (value: string) => value,
  toJsonValue: (value: unknown) => ({ wrapped: value }),
  currencyCodes: new Set<string>(),
  countryCodes: new Set<string>(),
};

describe('integration-sync', () => {
  it('syncs integration collections from Mongo to Prisma with dedupe and correction handling', async () => {
    const createdAt = new Date('2026-03-25T22:00:00.000Z');
    const { mongo } = createMongo({
      integrations: [
        {
          _id: 'integration-1',
          name: 'Base Store',
          slug: 'base-store',
          createdAt,
          updatedAt: createdAt,
        },
        {
          _id: 'integration-2',
          name: 'Allegro Connector',
          slug: '',
          createdAt,
          updatedAt: createdAt,
        },
        {
          _id: 'integration-3',
          name: 'Base Store Clone',
          slug: 'base-store',
          createdAt,
          updatedAt: createdAt,
        },
        {
          name: 'missing-id',
        },
      ],
      integration_connections: [
        {
          _id: 'conn-1',
          integrationId: 'integration-1',
          name: 'Older Base',
          username: 'old-user',
          password: 'old-pass',
          updatedAt: '2026-03-25T09:00:00.000Z',
          createdAt,
        },
        {
          _id: 'conn-2',
          integrationId: 'integration-1',
          name: 'Latest Base',
          username: 'latest-user',
          password: 'latest-pass',
          playwrightHeadless: false,
          playwrightSlowMo: 5,
          allegroUseSandbox: true,
          updatedAt: '2026-03-25T12:00:00.000Z',
          createdAt,
        },
        {
          _id: 'conn-3',
          integrationId: 'integration-1',
          name: 'Mid Base',
          username: 'mid-user',
          password: 'mid-pass',
          updatedAt: '2026-03-25T11:00:00.000Z',
          createdAt,
        },
        {
          _id: 'conn-4',
          integrationId: 'missing-integration',
          name: 'Broken',
          username: 'broken-user',
          password: 'broken-pass',
          updatedAt: '2026-03-25T08:00:00.000Z',
          createdAt,
        },
        {
          _id: 'conn-5',
          integrationId: 'integration-2',
          createdAt,
          updatedAt: '2026-03-25T13:00:00.000Z',
        },
      ],
      product_listings: [
        {
          _id: 'listing-old',
          productId: 'product-1',
          connectionId: 'conn-2',
          integrationId: 'integration-1',
          status: 'draft',
          updatedAt: '2026-03-25T10:00:00.000Z',
          createdAt,
        },
        {
          _id: 'listing-new',
          productId: 'product-1',
          connectionId: 'conn-2',
          integrationId: 'wrong-integration',
          status: 'listed',
          listedAt: createdAt.toISOString(),
          exportHistory: { attempts: 2 },
          updatedAt: '2026-03-25T12:00:00.000Z',
          createdAt,
        },
        {
          _id: 'listing-mid',
          productId: 'product-1',
          connectionId: 'conn-2',
          integrationId: 'integration-1',
          updatedAt: '2026-03-25T11:00:00.000Z',
          createdAt,
        },
        {
          _id: 'listing-missing-product',
          productId: 'missing-product',
          connectionId: 'conn-5',
          updatedAt: '2026-03-25T12:30:00.000Z',
          createdAt,
        },
        {
          _id: 'listing-missing-connection',
          productId: 'product-1',
          connectionId: 'conn-x',
          updatedAt: '2026-03-25T12:45:00.000Z',
          createdAt,
        },
        {
          _id: 'listing-invalid',
          productId: 'product-1',
          connectionId: '',
        },
        {
          _id: 'listing-2',
          productId: 'product-1',
          connectionId: 'conn-5',
          integrationId: 'integration-2',
          updatedAt: '2026-03-25T13:00:00.000Z',
          createdAt,
        },
      ],
    });

    const prisma = {
      integration: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
        findMany: vi.fn().mockResolvedValue([
          { id: 'integration-1' },
          { id: 'integration-2' },
        ]),
      },
      integrationConnection: {
        deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
        findMany: vi.fn().mockResolvedValue([
          { id: 'conn-2', integrationId: 'integration-1' },
          { id: 'conn-5', integrationId: 'integration-2' },
        ]),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([{ id: 'product-1' }]),
      },
      productListing: {
        deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    } as unknown as Parameters<typeof syncIntegrations>[0]['prisma'];

    const integrationsResult = await syncIntegrations({
      mongo,
      prisma,
      ...baseContext,
    });
    const connectionsResult = await syncIntegrationConnections({
      mongo,
      prisma,
      ...baseContext,
    });
    const listingsResult = await syncProductListings({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(integrationsResult).toEqual({
      sourceCount: 2,
      targetDeleted: 2,
      targetInserted: 2,
      warnings: ['Skipped duplicate integration slug: base-store'],
    });
    expect(connectionsResult).toEqual({
      sourceCount: 2,
      targetDeleted: 3,
      targetInserted: 2,
      warnings: [
        'Replaced older connection for integration integration-1',
        'Skipped duplicate connection for integration integration-1',
        'Integration connection conn-4: missing integration missing-integration',
      ],
    });
    expect(listingsResult).toEqual({
      sourceCount: 2,
      targetDeleted: 4,
      targetInserted: 2,
      warnings: [
        'Replaced older listing for product product-1 connection conn-2',
        'Skipped duplicate listing for product product-1 connection conn-2',
        'Product listing listing-missing-product: missing product missing-product',
        'Product listing listing-missing-connection: missing connection conn-x',
        'Skipped product listing with missing id/product/connection',
        'Product listing listing-new: corrected integrationId to match connection',
      ],
    });

    expect(prisma.integration.createMany).toHaveBeenCalledWith({
      data: [
        {
          id: 'integration-1',
          name: 'Base Store',
          slug: 'base-store',
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: 'integration-2',
          name: 'Allegro Connector',
          slug: 'allegro-connector',
          createdAt,
          updatedAt: createdAt,
        },
      ],
    });
    expect(prisma.integrationConnection.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'conn-2',
          integrationId: 'integration-1',
          name: 'Latest Base',
          username: 'latest-user',
          playwrightHeadless: false,
          playwrightSlowMo: 5,
          allegroUseSandbox: true,
        }),
        expect.objectContaining({
          id: 'conn-5',
          integrationId: 'integration-2',
          name: 'Connection',
          username: '',
          password: '',
          playwrightHeadless: true,
          playwrightSlowMo: 50,
          baseApiToken: null,
        }),
      ]),
    });
    expect(prisma.productListing.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'listing-new',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'conn-2',
          status: 'listed',
          listedAt: new Date(createdAt),
          exportHistory: { wrapped: { attempts: 2 } },
        }),
        expect.objectContaining({
          id: 'listing-2',
          productId: 'product-1',
          integrationId: 'integration-2',
          connectionId: 'conn-5',
          status: 'pending',
          exportHistory: { wrapped: null },
        }),
      ]),
    });
  });

  it('syncs integration collections from Prisma back to Mongo', async () => {
    const createdAt = new Date('2026-03-25T22:30:00.000Z');
    const { mongo, collections } = createMongo({});

    const prisma = {
      integration: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'integration-1',
            name: 'Base Store',
            slug: 'base-store',
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      integrationConnection: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'conn-1',
            integrationId: 'integration-1',
            name: 'Primary',
            username: 'merchant',
            password: 'secret',
            playwrightStorageState: 'state.json',
            playwrightStorageStateUpdatedAt: createdAt,
            playwrightHeadless: false,
            playwrightSlowMo: 10,
            playwrightTimeout: 10000,
            playwrightNavigationTimeout: 20000,
            playwrightHumanizeMouse: true,
            playwrightMouseJitter: 4,
            playwrightClickDelayMin: 25,
            playwrightClickDelayMax: 80,
            playwrightInputDelayMin: 15,
            playwrightInputDelayMax: 70,
            playwrightActionDelayMin: 100,
            playwrightActionDelayMax: 300,
            playwrightProxyEnabled: true,
            playwrightProxyServer: 'proxy.example.test',
            playwrightProxyUsername: 'proxy-user',
            playwrightProxyPassword: 'proxy-pass',
            playwrightEmulateDevice: true,
            playwrightDeviceName: 'iPhone 15',
            allegroAccessToken: 'token',
            allegroRefreshToken: 'refresh',
            allegroTokenType: 'Bearer',
            allegroScope: 'sale',
            allegroExpiresAt: createdAt,
            allegroTokenUpdatedAt: createdAt,
            allegroUseSandbox: false,
            baseApiToken: 'base-token',
            baseTokenUpdatedAt: createdAt,
            baseLastInventoryId: 'inventory-1',
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      productListing: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'listing-1',
            productId: 'product-1',
            integrationId: 'integration-1',
            connectionId: 'conn-1',
            externalListingId: 'ext-1',
            inventoryId: 'inv-1',
            status: 'listed',
            listedAt: createdAt,
            exportHistory: { attempts: 1 },
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
    } as unknown as Parameters<typeof syncIntegrationsPrismaToMongo>[0]['prisma'];

    const integrationsResult = await syncIntegrationsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const connectionsResult = await syncIntegrationConnectionsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const listingsResult = await syncProductListingsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(integrationsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 7,
      targetInserted: 1,
    });
    expect(connectionsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 7,
      targetInserted: 1,
    });
    expect(listingsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 7,
      targetInserted: 1,
    });

    expect(collections.get('integrations')?.insertMany).toHaveBeenCalledWith([
      {
        _id: 'integration-1',
        id: 'integration-1',
        name: 'Base Store',
        slug: 'base-store',
        createdAt,
        updatedAt: createdAt,
      },
    ]);
    expect(collections.get('integration_connections')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'conn-1',
        id: 'conn-1',
        integrationId: 'integration-1',
        name: 'Primary',
        playwrightProxyEnabled: true,
        baseApiToken: 'base-token',
      }),
    ]);
    expect(collections.get('product_listings')?.insertMany).toHaveBeenCalledWith([
      {
        _id: 'listing-1',
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'conn-1',
        externalListingId: 'ext-1',
        inventoryId: 'inv-1',
        status: 'listed',
        listedAt: createdAt,
        exportHistory: { attempts: 1 },
        createdAt,
        updatedAt: createdAt,
      },
    ]);
  });
});

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCatalog: vi.fn(),
  listCatalogs: vi.fn(),
  normalizeCatalogLanguageSelection: vi.fn(),
  getProductDataProvider: vi.fn(),
  logClientError: vi.fn(),
  logSystemEvent: vi.fn(),
  priceGroupsRows: [] as Array<{ id?: string; groupId?: string }>,
}));

vi.mock('@/features/products/server', () => ({
  getCatalogRepository: async () => ({
    createCatalog: mocks.createCatalog,
    listCatalogs: mocks.listCatalogs,
  }),
  getProductDataProvider: mocks.getProductDataProvider,
}));

vi.mock('@/shared/lib/products/services/catalog-language-normalization', () => ({
  normalizeCatalogLanguageSelection: mocks.normalizeCatalogLanguageSelection,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: async () => ({
    collection: (name: string) => {
      if (name !== 'price_groups') {
        throw new Error(`Unexpected collection ${name}`);
      }

      return {
        find: () => ({
          toArray: async () => mocks.priceGroupsRows,
        }),
      };
    },
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: mocks.logClientError,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: mocks.logSystemEvent,
}));

import { postCatalogsHandler } from './handlers';

describe('postCatalogsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProductDataProvider.mockResolvedValue('mongodb');
    mocks.listCatalogs.mockResolvedValue([
      {
        id: 'catalog-existing',
        isDefault: true,
      },
    ]);
    mocks.createCatalog.mockImplementation(async (input) => ({
      id: 'catalog-1',
      ...input,
    }));
    mocks.normalizeCatalogLanguageSelection.mockResolvedValue({
      languageIds: ['pl'],
      defaultLanguageId: 'pl',
    });
    mocks.priceGroupsRows = [
      { id: 'group-pln', groupId: 'PLN_STANDARD' },
      { id: 'group-eur', groupId: 'EUR_STANDARD' },
    ];
  });

  it('normalizes legacy price-group identifiers to canonical ids before creating a catalog', async () => {
    const request = new NextRequest('http://localhost/api/v2/products/entities/catalogs', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Main catalog',
        languageIds: ['pl'],
        defaultLanguageId: 'pl',
        priceGroupIds: ['PLN_STANDARD', 'group-eur'],
        defaultPriceGroupId: 'PLN_STANDARD',
        isDefault: false,
      }),
    });

    const response = await postCatalogsHandler(request, {} as never);

    expect(mocks.createCatalog).toHaveBeenCalledWith({
      name: 'Main catalog',
      description: null,
      isDefault: false,
      languageIds: ['pl'],
      defaultLanguageId: 'pl',
      priceGroupIds: ['group-pln', 'group-eur'],
      defaultPriceGroupId: 'group-pln',
    });
    await expect(response.json()).resolves.toMatchObject({
      id: 'catalog-1',
      priceGroupIds: ['group-pln', 'group-eur'],
      defaultPriceGroupId: 'group-pln',
    });
  });
});

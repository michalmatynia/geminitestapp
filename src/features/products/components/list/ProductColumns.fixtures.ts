import type { ProductWithImages } from '@/shared/contracts/products';

type MockWithReturnValue = {
  mockReturnValue: (value: unknown) => unknown;
};

export const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'KEYCHA1212',
    baseProductId: null,
    importSource: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Keychain', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Keychain',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 1,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: 'category-1',
    catalogId: 'catalog-1',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

export const createRowVisualsContext = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  productNameKey: 'name_en',
  priceGroups: [],
  currencyCode: 'USD',
  categoryNameById: new Map([['category-1', 'Keychains']]),
  thumbnailSource: 'file',
  showTriggerRunFeedback: true,
  triggerButtonsReady: true,
  imageExternalBaseUrl: null,
  ...overrides,
});

export const createRowRuntimeContext = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  showMarketplaceBadge: false,
  integrationStatus: 'not_started',
  showTraderaBadge: false,
  traderaStatus: 'not_started',
  showPlaywrightProgrammableBadge: false,
  playwrightProgrammableStatus: 'not_started',
  productAiRunFeedback: null,
  ...overrides,
});

export const setupProductListMocks = (
  actionsMock: MockWithReturnValue,
  rowActionsMock: MockWithReturnValue,
  visualsMock: MockWithReturnValue,
  visualsOverride: Record<string, unknown> = {}
): void => {
  actionsMock.mockReturnValue({
    productNameKey: 'name_en',
    queuedProductIds: new Set<string>(),
    categoryNameById: new Map([['category-1', 'Keychains']]),
  });
  rowActionsMock.mockReturnValue({
    onProductNameClick: () => {},
  });
  visualsMock.mockReturnValue(
    createRowVisualsContext({
      categoryNameById: new Map([['category-1', 'Keychains']]),
      ...visualsOverride,
    })
  );
};

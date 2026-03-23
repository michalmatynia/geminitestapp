import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductRecord } from '@/shared/contracts/products';

const applyBaseParameterImportMock = vi.hoisted(() => vi.fn());
const validateProductCreateMock = vi.hoisted(() => vi.fn());
const validateProductUpdateMock = vi.hoisted(() => vi.fn());
const emitProductCacheInvalidationMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/services/imports/parameter-import/apply', () => ({
  applyBaseParameterImport: applyBaseParameterImportMock,
}));

vi.mock('@/shared/events/products', () => ({
  emitProductCacheInvalidation: emitProductCacheInvalidationMock,
}));

vi.mock('@/shared/lib/products/validations', () => ({
  validateProductCreate: validateProductCreateMock,
  validateProductUpdate: validateProductUpdateMock,
}));

import { importSingleItem } from '@/features/integrations/services/imports/base-import-item-processor';

const buildProductRecord = (
  overrides: Partial<ProductRecord> = {}
): ProductRecord => ({
  id: overrides.id ?? 'product-1',
  sku: overrides.sku ?? 'SKU-1',
  baseProductId: overrides.baseProductId ?? null,
  defaultPriceGroupId: overrides.defaultPriceGroupId ?? null,
  ean: overrides.ean ?? null,
  gtin: overrides.gtin ?? null,
  asin: overrides.asin ?? null,
  name: overrides.name ?? { en: 'Imported product', pl: null, de: null },
  description: overrides.description ?? { en: '', pl: null, de: null },
  name_en: overrides.name_en ?? 'Imported product',
  name_pl: overrides.name_pl ?? null,
  name_de: overrides.name_de ?? null,
  description_en: overrides.description_en ?? null,
  description_pl: overrides.description_pl ?? null,
  description_de: overrides.description_de ?? null,
  supplierName: overrides.supplierName ?? null,
  supplierLink: overrides.supplierLink ?? null,
  priceComment: overrides.priceComment ?? null,
  stock: overrides.stock ?? 0,
  price: overrides.price ?? 0,
  sizeLength: overrides.sizeLength ?? null,
  sizeWidth: overrides.sizeWidth ?? null,
  weight: overrides.weight ?? null,
  length: overrides.length ?? null,
  published: overrides.published ?? true,
  categoryId: overrides.categoryId ?? null,
  catalogId: overrides.catalogId ?? 'catalog-1',
  tags: overrides.tags ?? [],
  producers: overrides.producers ?? [],
  images: overrides.images ?? [],
  catalogs: overrides.catalogs ?? [],
  parameters: overrides.parameters ?? [],
  imageLinks: overrides.imageLinks ?? [],
  imageBase64s: overrides.imageBase64s ?? [],
  noteIds: overrides.noteIds ?? [],
  createdAt: overrides.createdAt ?? '2026-03-11T10:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-11T10:00:00.000Z',
});

const createBaseInput = () => ({
  run: { id: 'run-1', params: { dryRun: false } } as never,
  item: { itemId: 'base-1' } as never,
  raw: {
    sku: 'SKU-1',
    name_en: 'Imported product',
  } as never,
  baseIntegrationId: 'integration-1',
  connectionId: 'connection-1',
  token: 'token-1',
  targetCatalogId: 'catalog-1',
  defaultPriceGroupId: 'price-group-1',
  preferredPriceCurrencies: [],
  lookups: {
    producerIdSet: new Set<string>(),
    producerNameToId: new Map<string, string>(),
    tagIdSet: new Set<string>(),
    tagNameToId: new Map<string, string>(),
    externalTagToInternalTagId: new Map<string, string>(),
  },
  templateMappings: [],
  parameterRepository: {} as never,
  imageMode: 'links' as const,
  dryRun: false,
  inventoryId: 'inventory-1',
  mode: 'create_only' as const,
  allowDuplicateSku: false,
  parameterImportSettings: {
    enabled: true,
    mode: 'all' as const,
    languageScope: 'catalog_languages' as const,
    createMissingParameters: true,
    overwriteExistingValues: true,
    matchBy: 'name_only' as const,
  },
  catalogLanguageCodes: ['en'],
  defaultLanguageCode: 'en',
});

describe('base import item processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyBaseParameterImportMock.mockResolvedValue({
      applied: true,
      parameters: [{ parameterId: 'param-1', value: 'from-import' }],
      summary: {
        extracted: 1,
        resolved: 1,
        created: 0,
        written: 1,
      },
    });
    validateProductCreateMock.mockImplementation(
      async (data: unknown): Promise<{ success: boolean; data: unknown }> => ({
        success: true,
        data,
      })
    );
    validateProductUpdateMock.mockImplementation(
      async (data: unknown): Promise<{ success: boolean; data: unknown }> => ({
        success: true,
        data,
      })
    );
  });

  it('keeps explicit template-mapped parameter values when parameter import is enabled', async () => {
    const result = await importSingleItem({
      ...createBaseInput(),
      run: { id: 'run-1', params: { dryRun: true } } as never,
      raw: {
        product_id: 'base-1',
        sku: 'SKU-1',
        Material: 'from-template',
      } as never,
      productRepository: {
        findProductByBaseId: vi.fn(async () => null),
        getProductBySku: vi.fn(async () => null),
      } as never,
      dryRun: true,
      templateMappings: [
        {
          sourceKey: 'Material',
          targetField: 'parameter:param-1',
        },
      ],
    });

    expect(result.status).toBe('imported');
    expect(result.action).toBe('dry_run');
    expect(applyBaseParameterImportMock).toHaveBeenCalledTimes(1);
    expect(result.payloadSnapshot?.parameters).toEqual([
      { parameterId: 'param-1', value: 'from-template' },
    ]);
    expect(emitProductCacheInvalidationMock).not.toHaveBeenCalled();
  });

  it('invalidates cached product lists after a successful imported create', async () => {
    const createdProduct = buildProductRecord();
    const productRepository = {
      findProductByBaseId: vi.fn(async () => null),
      getProductBySku: vi.fn(async () => null),
      createProduct: vi.fn(async () => createdProduct),
      replaceProductCatalogs: vi.fn(async () => undefined),
      replaceProductProducers: vi.fn(async () => undefined),
      replaceProductTags: vi.fn(async () => undefined),
      addProductImages: vi.fn(async () => undefined),
    };

    const result = await importSingleItem({
      ...createBaseInput(),
      productRepository: productRepository as never,
    });

    expect(result.status).toBe('imported');
    expect(result.action).toBe('imported');
    expect(productRepository.createProduct).toHaveBeenCalledTimes(1);
    expect(productRepository.replaceProductCatalogs).toHaveBeenCalledWith('product-1', [
      'catalog-1',
    ]);
    expect(emitProductCacheInvalidationMock).toHaveBeenCalledTimes(1);
  });

  it('invalidates cached product lists after a successful imported update', async () => {
    const existingProduct = buildProductRecord({ id: 'product-2', sku: 'SKU-2' });
    const updatedProduct = buildProductRecord({ id: 'product-2', sku: 'SKU-2' });
    const productRepository = {
      findProductByBaseId: vi.fn(async () => null),
      getProductBySku: vi.fn(async () => existingProduct),
      updateProduct: vi.fn(async () => updatedProduct),
      replaceProductCatalogs: vi.fn(async () => undefined),
      replaceProductProducers: vi.fn(async () => undefined),
      replaceProductTags: vi.fn(async () => undefined),
      replaceProductImages: vi.fn(async () => undefined),
    };

    const result = await importSingleItem({
      ...createBaseInput(),
      raw: {
        sku: 'SKU-2',
        name_en: 'Imported product',
      } as never,
      productRepository: productRepository as never,
      mode: 'upsert_on_sku',
    });

    expect(result.status).toBe('updated');
    expect(result.action).toBe('updated');
    expect(productRepository.updateProduct).toHaveBeenCalledWith(
      'product-2',
      expect.objectContaining({
        sku: 'SKU-2',
      })
    );
    expect(emitProductCacheInvalidationMock).toHaveBeenCalledTimes(1);
  });
});

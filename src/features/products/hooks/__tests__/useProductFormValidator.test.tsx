// @vitest-environment jsdom

import React, { type ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createListQueryV2Mock,
  getProductsMock,
  useProductFormCoreMock,
  useProductFormMetadataMock,
  useProductValidatorConfigMock,
  useUpdateValidatorSettingsMutationMock,
  useProductValidatorIssuesMock,
} = vi.hoisted(() => ({
  createListQueryV2Mock: vi.fn(),
  getProductsMock: vi.fn(),
  useProductFormCoreMock: vi.fn(),
  useProductFormMetadataMock: vi.fn(),
  useProductValidatorConfigMock: vi.fn(),
  useUpdateValidatorSettingsMutationMock: vi.fn(),
  useProductValidatorIssuesMock: vi.fn(),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: (config: unknown) => createListQueryV2Mock(config),
}));

vi.mock('@/features/products/api/products', () => ({
  getProducts: (...args: unknown[]) => getProductsMock(...args),
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => useProductFormCoreMock(),
}));

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadata: () => useProductFormMetadataMock(),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useProductValidatorConfig: () => useProductValidatorConfigMock(),
  useUpdateValidatorSettingsMutation: () => useUpdateValidatorSettingsMutationMock(),
}));

vi.mock('@/features/products/hooks/useProductValidatorIssues', () => ({
  useProductValidatorIssues: (args: unknown) => useProductValidatorIssuesMock(args),
}));

import type { ProductFormData, ProductValidationPattern, ProductWithImages } from '@/shared/contracts/products';

import { buildSkuAutoIncrementSequenceBundle } from '@/features/products/lib/validatorSemanticPresets';

import { useProductFormValidator } from '../useProductFormValidator';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'KEYCHA001',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Product', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Product',
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
    categoryId: null,
    catalogId: '',
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

const validatorPatterns: ProductValidationPattern[] = buildSkuAutoIncrementSequenceBundle({
  existingLabels: new Set(),
  sequenceGroupId: 'seq-sku',
  firstSequence: 10,
}).patterns as ProductValidationPattern[];

const createWrapper = ({ defaultSku = 'KEYCHA000' }: { defaultSku?: string } = {}) =>
  function Wrapper({ children }: { children: ReactNode }) {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        sku: defaultSku,
        name_en: '',
        name_pl: '',
        name_de: '',
        description_en: '',
        description_pl: '',
        description_de: '',
        price: 0,
        stock: 0,
        weight: 0,
        sizeLength: 0,
        sizeWidth: 0,
        length: 0,
        supplierName: '',
        supplierLink: '',
        priceComment: '',
        categoryId: '',
      },
    });

    return <FormProvider {...methods}>{children}</FormProvider>;
  };

describe('useProductFormValidator latest SKU source', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useProductFormCoreMock.mockReturnValue({
      product: null,
      draft: null,
    });
    useProductFormMetadataMock.mockReturnValue({
      categories: [],
      selectedCategoryId: null,
      setCategoryId: vi.fn(),
      selectedCatalogIds: [],
    });
    useProductValidatorConfigMock.mockReturnValue({
      data: {
        enabledByDefault: true,
        formatterEnabledByDefault: false,
        instanceDenyBehavior: null,
        patterns: validatorPatterns,
      },
    });
    useUpdateValidatorSettingsMutationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    });
    useProductValidatorIssuesMock.mockReturnValue({
      visibleFieldIssues: {},
    });
    createListQueryV2Mock.mockReturnValue({
      data: [],
      isFetching: false,
    });
    getProductsMock.mockResolvedValue([]);
  });

  it('requests a fresh latest-product source snapshot for SKU sequencing', async () => {
    renderHook(() => useProductFormValidator(), {
      wrapper: createWrapper(),
    });

    const config = createListQueryV2Mock.mock.calls[0]?.[0] as {
      queryFn: () => Promise<unknown>;
    };

    await config.queryFn();

    expect(getProductsMock).toHaveBeenCalledWith(
      {
        page: 1,
        pageSize: 2,
        advancedFilter: undefined,
        baseExported: undefined,
      },
      undefined,
      { fresh: true }
    );
  });

  it('excludes the current product when resolving the latest validator source in edit mode', () => {
    const currentProduct = createProduct({
      id: 'product-latest',
      sku: 'KEYCHA005',
      createdAt: '2026-01-05T00:00:00.000Z',
    });
    const previousProduct = createProduct({
      id: 'product-previous',
      sku: 'KEYCHA004',
      createdAt: '2026-01-04T00:00:00.000Z',
    });

    useProductFormCoreMock.mockReturnValue({
      product: currentProduct,
      draft: null,
    });
    createListQueryV2Mock.mockReturnValue({
      data: [currentProduct, previousProduct],
      isFetching: false,
    });

    const { result } = renderHook(() => useProductFormValidator(), {
      wrapper: createWrapper(),
    });

    expect(result.current.latestProductValues).toMatchObject({
      id: 'product-previous',
      sku: 'KEYCHA004',
    });
  });

  it('waits for the fresh refetch instead of using stale cached latest-product data', () => {
    createListQueryV2Mock.mockReturnValue({
      data: [createProduct({ id: 'stale-product', sku: 'KEYCHA003' })],
      isFetching: true,
    });

    const { result } = renderHook(() => useProductFormValidator(), {
      wrapper: createWrapper(),
    });

    expect(result.current.latestProductValues).toBeNull();
  });
});

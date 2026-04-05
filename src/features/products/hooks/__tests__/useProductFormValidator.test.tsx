// @vitest-environment jsdom

import React, { type ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiPostMock,
  createListQueryV2Mock,
  getProductsMock,
  setValueSpy,
  useProductFormCoreMock,
  useProductFormMetadataMock,
  useProductValidatorConfigMock,
  useUpdateValidatorSettingsMutationMock,
  useProductValidatorIssuesMock,
} = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  createListQueryV2Mock: vi.fn(),
  getProductsMock: vi.fn(),
  setValueSpy: vi.fn(),
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

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: (...args: unknown[]) => apiPostMock(...args),
  },
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

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import type { ProductWithImages } from '@/shared/contracts/products/product';

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

const createPattern = (
  overrides: Partial<ProductValidationPattern> & {
    regex: string;
    target: ProductValidationPattern['target'];
  }
): ProductValidationPattern =>
  ({
    id: 'pattern-1',
    label: 'Pattern',
    target: overrides.target,
    locale: null,
    regex: overrides.regex,
    flags: null,
    message: 'Pattern mismatch',
    severity: 'warning',
    enabled: true,
    replacementEnabled: true,
    replacementAutoApply: true,
    skipNoopReplacementProposal: false,
    replacementValue: 'SKU-101',
    replacementFields: ['sku'],
    replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    runtimeEnabled: false,
    runtimeType: 'none',
    runtimeConfig: null,
    postAcceptBehavior: 'revalidate',
    denyBehaviorOverride: null,
    validationDebounceMs: 0,
    sequenceGroupId: null,
    sequenceGroupLabel: null,
    sequenceGroupDebounceMs: 0,
    sequence: null,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    launchEnabled: false,
    launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    launchScopeBehavior: 'gate',
    launchSourceMode: 'current_field',
    launchSourceField: null,
    launchOperator: 'equals',
    launchValue: null,
    launchFlags: null,
    appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductValidationPattern;

const createWrapper = ({
  defaultSku = 'KEYCHA000',
  defaultSizeLength = 0,
}: {
  defaultSku?: string;
  defaultSizeLength?: number;
} = {}) =>
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
        sizeLength: defaultSizeLength,
        sizeWidth: 0,
        length: 0,
        supplierName: '',
        supplierLink: '',
        priceComment: '',
        categoryId: '',
      },
    });
    const originalSetValueRef = React.useRef(methods.setValue);
    methods.setValue = ((fieldName, value, options) => {
      setValueSpy(fieldName, value, options);
      return originalSetValueRef.current(fieldName, value, options);
    }) as typeof methods.setValue;

    return <FormProvider {...methods}>{children}</FormProvider>;
  };

describe('useProductFormValidator latest SKU source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.sessionStorage.clear();

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
    apiPostMock.mockResolvedValue({});
  });

  it('requests a fresh latest-product source snapshot for SKU sequencing', async () => {
    renderHook(() => useProductFormValidator(), {
      wrapper: createWrapper(),
    });

    const config = createListQueryV2Mock.mock.calls[0]?.[0] as {
      queryFn: () => Promise<unknown>;
      meta: {
        source: string;
        resource: string;
      };
    };

    expect(config.meta.source).toBe('products.hooks.useProductFormValidator');
    expect(config.meta.resource).toBe('products.validator.latest-product-source');

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

  it('re-applies auto formatting when reopening the same edited product in a new validator session', async () => {
    vi.useFakeTimers();

    const editProduct = createProduct({
      id: 'product-edit-reopen',
      sizeLength: 10,
    });
    const sizeLengthPattern = createPattern({
      id: 'pattern-size-length',
      regex: '^10$',
      target: 'size_length',
      replacementValue: '12.5',
      replacementFields: ['sizeLength'],
    });

    useProductFormCoreMock.mockReturnValue({
      product: editProduct,
      draft: null,
    });
    useProductValidatorConfigMock.mockReturnValue({
      data: {
        enabledByDefault: true,
        formatterEnabledByDefault: true,
        instanceDenyBehavior: null,
        patterns: [sizeLengthPattern],
      },
    });
    useProductValidatorIssuesMock.mockReturnValue({
      visibleFieldIssues: {
        sizeLength: [
          {
            patternId: 'pattern-size-length',
            message: 'Length mismatch',
            severity: 'warning',
            matchText: '10',
            index: 0,
            length: 2,
            regex: '^10$',
            flags: null,
            replacementValue: '12.5',
            replacementApplyMode: 'replace_whole_field',
            replacementScope: 'field',
            replacementActive: true,
            postAcceptBehavior: 'revalidate',
            debounceMs: 0,
          },
        ],
      },
    });

    const firstRender = renderHook(() => useProductFormValidator(undefined, 'edit-session-1'), {
      wrapper: createWrapper({ defaultSizeLength: 10 }),
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(setValueSpy).toHaveBeenCalledWith(
      'sizeLength',
      12.5,
      expect.objectContaining({
        shouldDirty: true,
        shouldTouch: true,
      })
    );
    expect(apiPostMock).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    setValueSpy.mockClear();
    apiPostMock.mockClear();

    renderHook(() => useProductFormValidator(undefined, 'edit-session-2'), {
      wrapper: createWrapper({ defaultSizeLength: 10 }),
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(setValueSpy).toHaveBeenCalledWith(
      'sizeLength',
      12.5,
      expect.objectContaining({
        shouldDirty: true,
        shouldTouch: true,
      })
    );
    expect(apiPostMock).toHaveBeenCalledTimes(1);
  });

  it('re-applies auto formatting when hydration remounts the same edit session with reset field values', async () => {
    vi.useFakeTimers();

    const editProduct = createProduct({
      id: 'product-edit-hydration',
      sizeLength: 10,
    });
    const sizeLengthPattern = createPattern({
      id: 'pattern-size-length-hydration',
      regex: '^10$',
      target: 'size_length',
      replacementValue: '12.5',
      replacementFields: ['sizeLength'],
    });

    useProductFormCoreMock.mockReturnValue({
      product: editProduct,
      draft: null,
    });
    useProductValidatorConfigMock.mockReturnValue({
      data: {
        enabledByDefault: true,
        formatterEnabledByDefault: true,
        instanceDenyBehavior: null,
        patterns: [sizeLengthPattern],
      },
    });
    useProductValidatorIssuesMock.mockReturnValue({
      visibleFieldIssues: {
        sizeLength: [
          {
            patternId: 'pattern-size-length-hydration',
            message: 'Length mismatch',
            severity: 'warning',
            matchText: '10',
            index: 0,
            length: 2,
            regex: '^10$',
            flags: null,
            replacementValue: '12.5',
            replacementApplyMode: 'replace_whole_field',
            replacementScope: 'field',
            replacementActive: true,
            postAcceptBehavior: 'revalidate',
            debounceMs: 0,
          },
        ],
      },
    });

    const hydrationSessionKey = 'edit-session-hydration';

    const partialRender = renderHook(
      () => useProductFormValidator(undefined, hydrationSessionKey),
      {
        wrapper: createWrapper({ defaultSizeLength: 10 }),
      }
    );

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(setValueSpy).toHaveBeenCalledWith(
      'sizeLength',
      12.5,
      expect.objectContaining({
        shouldDirty: true,
        shouldTouch: true,
      })
    );
    expect(apiPostMock).toHaveBeenCalledTimes(1);

    partialRender.unmount();

    setValueSpy.mockClear();
    apiPostMock.mockClear();

    renderHook(() => useProductFormValidator(undefined, hydrationSessionKey), {
      wrapper: createWrapper({ defaultSizeLength: 10 }),
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(setValueSpy).toHaveBeenCalledWith(
      'sizeLength',
      12.5,
      expect.objectContaining({
        shouldDirty: true,
        shouldTouch: true,
      })
    );
    expect(apiPostMock).toHaveBeenCalledTimes(1);
  });
});

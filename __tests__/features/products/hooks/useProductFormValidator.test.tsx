/**
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hookMocks = vi.hoisted(() => {
  const formValues: Record<string, unknown> = {
    name_en: '',
    name_pl: '',
    name_de: '',
    description_en: '',
    description_pl: '',
    description_de: '',
    sku: '',
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
  };

  return {
    draft: null as Record<string, unknown> | null,
    product: null as Record<string, unknown> | null,
    selectedCategoryId: null as string | null,
    selectedCatalogIds: [] as string[],
    categories: [] as Array<Record<string, unknown>>,
    visibleFieldIssues: {} as Record<string, Array<Record<string, unknown>>>,
    validatorConfig: {
      enabledByDefault: true,
      formatterEnabledByDefault: false,
      instanceDenyBehavior: null,
      patterns: [],
    },
    setCategoryId: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    watch: vi.fn(
      () =>
        [
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          0,
          0,
          0,
          0,
          0,
          0,
          '',
          '',
          '',
          '',
        ] as const
    ),
    getValues: vi.fn((field?: string) => {
      if (typeof field === 'string') {
        return formValues[field];
      }
      return formValues;
    }),
    setValue: vi.fn((field: string, value: unknown) => {
      formValues[field] = value;
    }),
    resetFormValues: () => {
      Object.assign(formValues, {
        name_en: '',
        name_pl: '',
        name_de: '',
        description_en: '',
        description_pl: '',
        description_de: '',
        sku: '',
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
      });
    },
  };
});

vi.mock('@/features/products/context/ProductFormContext', () => ({
  useProductFormContext: () => ({
    product: hookMocks.product,
    draft: hookMocks.draft,
  }),
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => ({
    product: hookMocks.product,
    draft: hookMocks.draft,
  }),
}));

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadata: () => ({
    categories: hookMocks.categories,
    selectedCategoryId: hookMocks.selectedCategoryId,
    setCategoryId: hookMocks.setCategoryId,
    selectedCatalogIds: hookMocks.selectedCatalogIds,
  }),
}));

vi.mock('react-hook-form', () => ({
  useFormContext: () => ({
    watch: hookMocks.watch,
    getValues: hookMocks.getValues,
    setValue: hookMocks.setValue,
  }),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useProductValidatorConfig: () => ({
    data: hookMocks.validatorConfig,
  }),
  useUpdateValidatorSettingsMutation: () => ({
    mutateAsync: hookMocks.mutateAsync,
  }),
}));

vi.mock('@/features/products/hooks/useProductValidatorIssues', () => ({
  useProductValidatorIssues: () => ({
    visibleFieldIssues: hookMocks.visibleFieldIssues,
  }),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(), logClientCatch: vi.fn(),
}));

import { useProductFormValidator } from '@/features/products/hooks/useProductFormValidator';
import { api } from '@/shared/lib/api-client';

describe('useProductFormValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    hookMocks.draft = null;
    hookMocks.product = null;
    hookMocks.selectedCategoryId = null;
    hookMocks.selectedCatalogIds = [];
    hookMocks.categories = [];
    hookMocks.visibleFieldIssues = {};
    hookMocks.validatorConfig = {
      enabledByDefault: true,
      formatterEnabledByDefault: false,
      instanceDenyBehavior: null,
      patterns: [],
    };
    hookMocks.resetFormValues();
  });

  it('uses the global formatter default instead of stale draft formatter flags', async () => {
    hookMocks.draft = {
      id: 'draft-1',
      validatorEnabled: true,
      formatterEnabled: true,
    };
    hookMocks.validatorConfig = {
      enabledByDefault: true,
      formatterEnabledByDefault: false,
      instanceDenyBehavior: null,
      patterns: [],
    };

    const { result } = renderHook(() => useProductFormValidator());

    await waitFor(() => expect(result.current.validatorEnabled).toBe(true));
    await waitFor(() => expect(result.current.formatterEnabled).toBe(false));
  });

  it('resets formatter state back to the global default when a new draft opens', async () => {
    hookMocks.draft = {
      id: 'draft-1',
      validatorEnabled: true,
      formatterEnabled: true,
    };

    const { result, rerender } = renderHook(() => useProductFormValidator());

    await waitFor(() => expect(result.current.formatterEnabled).toBe(false));

    await act(async () => {
      result.current.setFormatterEnabled(true);
    });

    expect(result.current.formatterEnabled).toBe(true);
    expect(hookMocks.mutateAsync).toHaveBeenCalledWith({ formatterEnabledByDefault: true });

    hookMocks.draft = {
      id: 'draft-2',
      validatorEnabled: true,
      formatterEnabled: true,
    };

    rerender();

    await waitFor(() => expect(result.current.formatterEnabled).toBe(false));
  });

  it('auto-applies category replacements when formatter is enabled', async () => {
    hookMocks.categories = [
      {
        id: 'category-2',
        name: 'Wallets',
        name_en: 'Wallets',
        name_pl: 'Portfele',
        name_de: 'Geldborsen',
      },
    ];
    hookMocks.validatorConfig = {
      enabledByDefault: true,
      formatterEnabledByDefault: true,
      instanceDenyBehavior: null,
      patterns: [
        {
          id: 'category-pattern',
          runtimeEnabled: false,
          replacementAutoApply: true,
        },
      ],
    };
    hookMocks.visibleFieldIssues = {
      categoryId: [
        {
          patternId: 'category-pattern',
          postAcceptBehavior: 'continue',
          message: 'Assign category from inferred value',
          replacementValue: 'Portfele',
        },
      ],
    };

    renderHook(() => useProductFormValidator());

    await waitFor(() => {
      expect(hookMocks.setCategoryId).toHaveBeenCalledWith('category-2');
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/v2/products/validator-decisions/batch',
        expect.objectContaining({
          decisions: [
            expect.objectContaining({
              action: 'accept',
              fieldName: 'categoryId',
              patternId: 'category-pattern',
              replacementValue: 'Portfele',
            }),
          ],
        }),
        { logError: false }
      );
    });
  });
});

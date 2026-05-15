// @vitest-environment jsdom

import React, { type ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  apiPostMock,
  useListQueryV2Mock,
  getProductsMock,
  setCategoryIdSpy,
  setProducerIdsSpy,
  setValueSpy,
  useProductFormCoreMock,
  useProductFormMetadataMock,
  useProductValidatorConfigMock,
  useProductValidatorIssuesMock,
  useUpdateValidatorSettingsMutationMock,
} = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  useListQueryV2Mock: vi.fn(),
  getProductsMock: vi.fn(),
  setCategoryIdSpy: vi.fn(),
  setProducerIdsSpy: vi.fn(),
  setValueSpy: vi.fn(),
  useProductFormCoreMock: vi.fn(),
  useProductFormMetadataMock: vi.fn(),
  useProductValidatorConfigMock: vi.fn(),
  useProductValidatorIssuesMock: vi.fn(),
  useUpdateValidatorSettingsMutationMock: vi.fn(),
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  useListQueryV2: (config: unknown) => useListQueryV2Mock(config),
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

import { useProductFormValidator } from '../useProductFormValidator';
import type { ProductValidatorFieldIssues } from '../useProductValidatorIssues.types';

const createBattleStockLengthPattern = (): ProductValidationPattern => ({
  id: 'pattern-battlestock-name-segment-length',
  label: 'BattleStock name segment length',
  target: 'name',
  locale: null,
  regex: '^.*$',
  flags: null,
  message: 'Propose Length (sizeLength) from Name segment #2',
  severity: 'warning',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: true,
  skipNoopReplacementProposal: false,
  replacementValue: '4',
  replacementFields: ['sizeLength'],
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
});

const createBattleStockLengthIssues = (): ProductValidatorFieldIssues => ({
  name_en: [
    {
      patternId: 'pattern-battlestock-name-segment-length',
      message: 'Propose Length (sizeLength) from Name segment #2',
      severity: 'warning',
      matchText: '0',
      index: 0,
      length: 1,
      regex: '^.*$',
      flags: null,
      replacementValue: '4',
      replacementApplyMode: 'replace_whole_field',
      replacementScope: 'field',
      replacementActive: true,
      postAcceptBehavior: 'revalidate',
      debounceMs: 0,
    },
  ],
});

const createWrapper = () =>
  function Wrapper({ children }: { children: ReactNode }) {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        sku: 'BATTLESTOCK-13039',
        name_en: 'BattleStock | 0 | item',
        price: 0,
        stock: 0,
        sizeLength: 0,
        sizeWidth: 0,
        weight: 0,
        length: 0,
        categoryId: '',
      },
    });
    const originalSetValueRef = React.useRef(methods.setValue);
    const setValueWithSpy: typeof methods.setValue = (fieldName, value, options) => {
      setValueSpy(fieldName, value, options);
      originalSetValueRef.current(fieldName, value, options);
    };
    methods.setValue = setValueWithSpy;
    return <FormProvider {...methods}>{children}</FormProvider>;
  };

const flushAutoAcceptTimer = async (): Promise<void> => {
  await act(async () => {
    vi.advanceTimersByTime(250);
    await Promise.resolve();
  });
};

describe('useProductFormValidator auto accept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.sessionStorage.clear();
    useProductFormCoreMock.mockReturnValue({ draft: null, product: null });
    useProductFormMetadataMock.mockReturnValue({
      categories: [],
      producers: [],
      selectedCatalogIds: [],
      selectedCategoryId: null,
      selectedProducerIds: [],
      setCategoryId: setCategoryIdSpy,
      setProducerIds: setProducerIdsSpy,
    });
    useUpdateValidatorSettingsMutationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    });
    useListQueryV2Mock.mockReturnValue({ data: [], isFetching: false });
    getProductsMock.mockResolvedValue([]);
    apiPostMock.mockResolvedValue({});
  });

  it('auto-applies formatter replacements to the configured replacement field', async () => {
    vi.useFakeTimers();
    useProductValidatorConfigMock.mockReturnValue({
      data: {
        enabledByDefault: true,
        formatterEnabledByDefault: true,
        instanceDenyBehavior: null,
        patterns: [createBattleStockLengthPattern()],
      },
    });
    useProductValidatorIssuesMock.mockReturnValue({
      visibleFieldIssues: createBattleStockLengthIssues(),
    });

    renderHook(() => useProductFormValidator(), { wrapper: createWrapper() });
    await flushAutoAcceptTimer();

    expect(setValueSpy).toHaveBeenCalledWith(
      'sizeLength',
      4,
      expect.objectContaining({
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    );
    expect(apiPostMock).toHaveBeenCalledTimes(1);
  });
});

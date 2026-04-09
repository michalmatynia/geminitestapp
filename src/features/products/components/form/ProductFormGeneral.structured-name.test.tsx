// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

const {
  useProductFormCoreMock,
  useProductFormMetadataMock,
  useProductValidationStateMock,
  useTitleTermsMock,
} = vi.hoisted(() => ({
  useProductFormCoreMock: vi.fn(),
  useProductFormMetadataMock: vi.fn(),
  useProductValidationStateMock: vi.fn(),
  useTitleTermsMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => useProductFormCoreMock(),
}));

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadata: () => useProductFormMetadataMock(),
}));

vi.mock('@/features/products/context/ProductValidationSettingsContext', () => ({
  useProductValidationState: () => useProductValidationStateMock(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useTitleTerms: (...args: unknown[]) => useTitleTermsMock(...args),
}));

vi.mock('./ValidatedField', () => ({
  ValidatedField: ({
    label,
    name,
    type,
  }: {
    label: string;
    name: keyof ProductFormData;
    type?: string;
  }) => {
    const { register } = useFormContext<ProductFormData>();
    if (type === 'textarea') {
      return (
        <label>
          <span>{label}</span>
          <textarea aria-label={label} {...register(name)} />
        </label>
      );
    }

    return (
      <label>
        <span>{label}</span>
        <input aria-label={label} {...register(name)} />
      </label>
    );
  },
}));

import ProductFormGeneral from './ProductFormGeneral';

const createPattern = (
  overrides: Partial<ProductValidationPattern> & {
    regex: string;
    target: ProductValidationPattern['target'];
  }
): ProductValidationPattern =>
  ({
    id: 'pattern-name-lore',
    label: 'Name formatter',
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
    replacementValue: 'Attack On Titan',
    replacementFields: ['name_en'],
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

function renderProductFormGeneral(initialNameEn: string): {
  rerenderForm: () => void;
} {
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        name_en: initialNameEn,
        name_pl: '',
        name_de: '',
        description_en: '',
        description_pl: '',
        description_de: '',
        sku: '',
        ean: '',
        gtin: '',
        asin: '',
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
  }

  const createUi = (): React.JSX.Element => (
    <Wrapper>
      <ProductFormGeneral />
    </Wrapper>
  );

  const view = render(createUi());
  return {
    rerenderForm: (): void => {
      view.rerender(createUi());
    },
  };
}

describe('ProductFormGeneral structured name editing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductFormCoreMock.mockReturnValue({
      errors: {},
      normalizeNameError: null,
      setNormalizeNameError: vi.fn(),
    });
    useProductFormMetadataMock.mockReturnValue({
      filteredLanguages: [{ code: 'en', name: 'English' }],
      selectedCatalogIds: ['catalog-a'],
      categories: [],
      selectedCategoryId: null,
      setCategoryId: vi.fn(),
    });
    useTitleTermsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('keeps the lore segment stable while the structured field is focused and only formats after blur', async () => {
    const validationState = {
      validationInstanceScope: 'product_create',
      validatorEnabled: true,
      formatterEnabled: false,
      validatorPatterns: [
        createPattern({
          regex: 'Lore$',
          target: 'name',
          replacementAutoApply: true,
          replacementValue: 'Attack On Titan',
          replacementFields: ['name_en'],
        }),
      ],
      latestProductValues: null,
    };
    useProductValidationStateMock.mockImplementation(() => validationState);

    const view = renderProductFormGeneral('Scout Regiment | 4 cm | Metal | Anime Pin | Lore');
    const nameInput = screen.getByLabelText('English Name');

    await act(async () => {
      nameInput.focus();
    });

    fireEvent.change(nameInput, {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin | Lore' },
    });

    validationState.formatterEnabled = true;

    await act(async () => {
      view.rerenderForm();
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue('Scout Regiment | 4 cm | Metal | Anime Pin | Lore');
    });

    await act(async () => {
      nameInput.blur();
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue('Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan');
    });
  });

  it('preserves a shortened lore segment while the formatter is already enabled', async () => {
    const validationState = {
      validationInstanceScope: 'product_create',
      validatorEnabled: true,
      formatterEnabled: true,
      validatorPatterns: [
        createPattern({
          regex: 'Lore$',
          target: 'name',
          replacementAutoApply: true,
          replacementValue: 'Attack On Titan',
          replacementFields: ['name_en'],
        }),
      ],
      latestProductValues: null,
    };
    useProductValidationStateMock.mockImplementation(() => validationState);

    renderProductFormGeneral('Scout Regiment | 4 cm | Metal | Anime Pin | Lore');
    const nameInput = screen.getByLabelText('English Name');

    await act(async () => {
      nameInput.focus();
    });

    fireEvent.change(nameInput, {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin | Lo' },
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue('Scout Regiment | 4 cm | Metal | Anime Pin | Lo');
    });

    await act(async () => {
      nameInput.blur();
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue('Scout Regiment | 4 cm | Metal | Anime Pin | Lo');
    });
  });
});

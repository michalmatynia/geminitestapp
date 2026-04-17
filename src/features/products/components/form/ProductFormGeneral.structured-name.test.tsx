// @vitest-environment jsdom
/* eslint-disable max-lines, max-lines-per-function */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type {
  ProductTitleTerm,
  ProductTitleTermType,
} from '@/shared/contracts/products/title-terms';
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

vi.mock('./ProductFormLatestAmazonExtraction', () => ({
  default: () => null,
}));

import ProductFormGeneral from './ProductFormGeneral';

const createPattern = (
  overrides: Partial<ProductValidationPattern> & {
    regex: string;
    target: ProductValidationPattern['target'];
  }
): ProductValidationPattern => {
  const pattern: ProductValidationPattern = {
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
  };
  return pattern;
};

function NameValueProbe(): React.JSX.Element {
  const { watch } = useFormContext<ProductFormData>();
  return <output data-testid='polish-name-value'>{watch('name_pl') ?? ''}</output>;
}

const createTitleTerm = ({
  id,
  nameEn,
  namePl = null,
  type,
}: {
  id: string;
  nameEn: string;
  namePl?: string | null;
  type: ProductTitleTermType;
}): ProductTitleTerm => ({
  id,
  name: nameEn,
  name_en: nameEn,
  name_pl: namePl,
  catalogId: 'catalog-a',
  type,
});

const mockTitleTermsByType = (
  termsByType: Record<ProductTitleTermType, ProductTitleTerm[]>
): void => {
  useTitleTermsMock.mockImplementation(
    (_catalogId: string, type: ProductTitleTermType) => ({
      data: termsByType[type],
      isLoading: false,
    })
  );
};

const MULTI_SEGMENT_SYNC_CATEGORIES: ProductCategory[] = [
  {
    id: 'category-anime-pin',
    name: 'Anime Pin',
    name_en: 'Anime Pin',
    name_pl: 'Przypinka Anime',
    color: null,
    parentId: null,
    catalogId: 'catalog-a',
    sortIndex: 0,
  },
  {
    id: 'category-anime-keychain',
    name: 'Anime Keychain',
    name_en: 'Anime Keychain',
    name_pl: 'Brelok Anime',
    color: null,
    parentId: null,
    catalogId: 'catalog-a',
    sortIndex: 1,
  },
];

const MULTI_SEGMENT_SYNC_TITLE_TERMS: Record<ProductTitleTermType, ProductTitleTerm[]> = {
  size: [
    createTitleTerm({ id: 'size-4', nameEn: '4 cm', type: 'size' }),
    createTitleTerm({ id: 'size-7', nameEn: '7 cm', type: 'size' }),
  ],
  material: [
    createTitleTerm({
      id: 'material-metal',
      nameEn: 'Metal',
      namePl: 'Metal PL',
      type: 'material',
    }),
    createTitleTerm({
      id: 'material-plastic',
      nameEn: 'Plastic',
      namePl: 'Plastik',
      type: 'material',
    }),
  ],
  theme: [
    createTitleTerm({
      id: 'theme-aot',
      nameEn: 'Attack On Titan',
      namePl: 'Atak Tytanow',
      type: 'theme',
    }),
    createTitleTerm({
      id: 'theme-naruto',
      nameEn: 'Naruto',
      namePl: 'Naruto PL',
      type: 'theme',
    }),
  ],
};

function renderProductFormGeneral(
  initialNameEn: string,
  initialNamePl: string = ''
): {
  rerenderForm: () => void;
} {
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        name_en: initialNameEn,
        name_pl: initialNamePl,
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
      <NameValueProbe />
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

    act(() => {
      nameInput.focus();
    });

    fireEvent.change(nameInput, {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin | Lore' },
    });

    validationState.formatterEnabled = true;

    act(() => {
      view.rerenderForm();
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue('Scout Regiment | 4 cm | Metal | Anime Pin | Lore');
    });

    act(() => {
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

    act(() => {
      nameInput.focus();
    });

    fireEvent.change(nameInput, {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin | Lo' },
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue('Scout Regiment | 4 cm | Metal | Anime Pin | Lo');
    });

    act(() => {
      nameInput.blur();
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue('Scout Regiment | 4 cm | Metal | Anime Pin | Lo');
    });
  });

  it('auto-fills Polish title segments from the English title with translated values', async () => {
    useProductFormMetadataMock.mockReturnValue({
      filteredLanguages: [
        { code: 'en', name: 'English' },
        { code: 'pl', name: 'Polish' },
      ],
      selectedCatalogIds: ['catalog-a'],
      categories: [
        {
          id: 'category-anime-pin',
          name: 'Anime Pin',
          name_en: 'Anime Pin',
          name_pl: 'Przypinka Anime',
          color: null,
          parentId: null,
          catalogId: 'catalog-a',
          sortIndex: 0,
        },
      ],
      selectedCategoryId: null,
      setCategoryId: vi.fn(),
    });
    mockTitleTermsByType({
      size: [createTitleTerm({ id: 'size-4', nameEn: '4 cm', type: 'size' })],
      material: [
        createTitleTerm({
          id: 'material-metal',
          nameEn: 'Metal',
          namePl: 'Metal PL',
          type: 'material',
        }),
      ],
      theme: [
        createTitleTerm({
          id: 'theme-aot',
          nameEn: 'Attack On Titan',
          namePl: 'Atak Tytanow',
          type: 'theme',
        }),
      ],
    });

    renderProductFormGeneral('Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan');

    await waitFor(() => {
      expect(screen.getByTestId('polish-name-value')).toHaveTextContent(
        'Scout Regiment | 4 cm | Metal PL | Przypinka Anime | Atak Tytanow'
      );
    });
  });

  it('preserves a custom Polish title base while syncing the remaining segments', async () => {
    useProductFormMetadataMock.mockReturnValue({
      filteredLanguages: [
        { code: 'en', name: 'English' },
        { code: 'pl', name: 'Polish' },
      ],
      selectedCatalogIds: ['catalog-a'],
      categories: [],
      selectedCategoryId: null,
      setCategoryId: vi.fn(),
    });
    useTitleTermsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderProductFormGeneral(
      'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
      'Manual Polish Title | Old size | Old material | Old category | Old theme'
    );

    await waitFor(() => {
      expect(screen.getByTestId('polish-name-value')).toHaveTextContent(
        'Manual Polish Title | 4 cm | Metal | Anime Pin | Attack On Titan'
      );
    });
  });

  it('keeps syncing the Polish title base while a generic placeholder is still being replaced from English', async () => {
    useProductFormMetadataMock.mockReturnValue({
      filteredLanguages: [
        { code: 'en', name: 'English' },
        { code: 'pl', name: 'Polish' },
      ],
      selectedCatalogIds: ['catalog-a'],
      categories: [],
      selectedCategoryId: null,
      setCategoryId: vi.fn(),
    });
    useTitleTermsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderProductFormGeneral(
      'Parameter Name | 4 cm | Metal | Anime Pin | Attack On Titan',
      'Parameter Name | 4 cm | Metal | Anime Pin | Attack On Titan'
    );

    fireEvent.change(screen.getByLabelText('English Name'), {
      target: { value: 'S | 4 cm | Metal | Anime Pin | Attack On Titan' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('polish-name-value')).toHaveTextContent(
        'S | 4 cm | Metal | Anime Pin | Attack On Titan'
      );
    });

    fireEvent.change(screen.getByLabelText('English Name'), {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('polish-name-value')).toHaveTextContent(
        'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan'
      );
    });
  });

  it('stops syncing the Polish base after the Polish title is edited manually', async () => {
    const user = userEvent.setup();

    useProductFormMetadataMock.mockReturnValue({
      filteredLanguages: [
        { code: 'en', name: 'English' },
        { code: 'pl', name: 'Polish' },
      ],
      selectedCatalogIds: ['catalog-a'],
      categories: [],
      selectedCategoryId: null,
      setCategoryId: vi.fn(),
    });
    useTitleTermsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderProductFormGeneral(
      'Parameter Name | 4 cm | Metal | Anime Pin | Attack On Titan',
      'Parameter Name | 4 cm | Metal | Anime Pin | Attack On Titan'
    );

    fireEvent.change(screen.getByLabelText('English Name'), {
      target: { value: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('polish-name-value')).toHaveTextContent(
        'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan'
      );
    });

    const nameTabs = within(screen.getByRole('tablist', { name: 'Product name language tabs' }));
    await user.click(nameTabs.getByRole('tab', { name: 'Polish' }));
    fireEvent.change(await screen.findByLabelText('Polish Name'), {
      target: { value: 'Oddzial Zwiadowcow | 4 cm | Metal | Anime Pin | Attack On Titan' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('polish-name-value')).toHaveTextContent(
        'Oddzial Zwiadowcow | 4 cm | Metal | Anime Pin | Attack On Titan'
      );
    });

    await user.click(nameTabs.getByRole('tab', { name: 'English' }));
    fireEvent.change(await screen.findByLabelText('English Name'), {
      target: { value: 'Survey Corps | 7 cm | Plastic | Anime Keychain | Naruto' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('polish-name-value')).toHaveTextContent(
        'Oddzial Zwiadowcow | 7 cm | Plastic | Anime Keychain | Naruto'
      );
    });
  });

  it('preserves an existing specific Polish base even when it matches the generated title', async () => {
    useProductFormMetadataMock.mockReturnValue({
      filteredLanguages: [
        { code: 'en', name: 'English' },
        { code: 'pl', name: 'Polish' },
      ],
      selectedCatalogIds: ['catalog-a'],
      categories: [],
      selectedCategoryId: null,
      setCategoryId: vi.fn(),
    });
    useTitleTermsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    renderProductFormGeneral(
      'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
      'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan'
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText('English Name'), {
      target: { value: 'Survey Corps | 7 cm | Plastic | Anime Keychain | Naruto' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('polish-name-value')).toHaveTextContent(
        'Scout Regiment | 7 cm | Plastic | Anime Keychain | Naruto'
      );
    });
  });

  it('immediately syncs changed English size, material, category, and theme into Polish', async () => {
    useProductFormMetadataMock.mockReturnValue({
      filteredLanguages: [
        { code: 'en', name: 'English' },
        { code: 'pl', name: 'Polish' },
      ],
      selectedCatalogIds: ['catalog-a'],
      categories: MULTI_SEGMENT_SYNC_CATEGORIES,
      selectedCategoryId: null,
      setCategoryId: vi.fn(),
    });
    mockTitleTermsByType(MULTI_SEGMENT_SYNC_TITLE_TERMS);

    renderProductFormGeneral(
      'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
      'Oddzial Zwiadowcow | 4 cm | Metal PL | Przypinka Anime | Atak Tytanow'
    );

    fireEvent.change(screen.getByLabelText('English Name'), {
      target: { value: 'Survey Corps | 7 cm | Plastic | Anime Keychain | Naruto' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('polish-name-value')).toHaveTextContent(
        'Oddzial Zwiadowcow | 7 cm | Plastik | Brelok Anime | Naruto PL'
      );
    });
  });
});

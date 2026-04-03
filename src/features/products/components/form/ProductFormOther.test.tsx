// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products';

const {
  useProductFormMetadataMock,
  useProductFormCoreMock,
  useProductValidationStateMock,
  useProductValidationActionsMock,
} = vi.hoisted(() => ({
  useProductFormMetadataMock: vi.fn(),
  useProductFormCoreMock: vi.fn(),
  useProductValidationStateMock: vi.fn(),
  useProductValidationActionsMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadata: () => useProductFormMetadataMock(),
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => useProductFormCoreMock(),
}));

vi.mock('@/features/products/context/ProductValidationSettingsContext', () => ({
  useProductValidationState: () => useProductValidationStateMock(),
  useProductValidationActions: () => useProductValidationActionsMock(),
}));

vi.mock('./CatalogMultiSelectField', () => ({
  CatalogMultiSelectField: () => <div>Catalogs</div>,
}));

vi.mock('./CategorySingleSelectField', () => ({
  CategorySingleSelectField: () => <div>Categories</div>,
}));

vi.mock('./ProducerMultiSelectField', () => ({
  ProducerMultiSelectField: () => <div>Producers</div>,
}));

vi.mock('./TagMultiSelectField', () => ({
  TagMultiSelectField: () => <div>Tags</div>,
}));

vi.mock('./ValidatedField', () => ({
  ValidatedField: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock('./ValidatorIssueHint', () => ({
  ValidatorIssueHint: () => null,
}));

vi.mock('@/features/products/ui', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  FormSection: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => <section aria-label={title}>{children}</section>,
  FormField: ({
    children,
    label,
    description,
  }: {
    children: React.ReactNode;
    label: string;
    description?: string;
  }) => (
    <label>
      <span>{label}</span>
      {description ? <small>{description}</small> : null}
      {children}
    </label>
  ),
  StandardDataTablePanel: () => <div>Price Groups Overview</div>,
  StatusBadge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Alert: ({ children }: { children: React.ReactNode }) => <div role='alert'>{children}</div>,
}));

import ProductFormOther from './ProductFormOther';

function renderProductFormOther(defaultValues: Partial<ProductFormData> = {}): void {
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        price: 0,
        stock: 0,
        shippingGroupId: '',
        defaultPriceGroupId: '',
        ...defaultValues,
      },
    });

    return <FormProvider {...methods}>{children}</FormProvider>;
  }

  render(
    <Wrapper>
      <ProductFormOther />
    </Wrapper>
  );
}

describe('ProductFormOther', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductFormCoreMock.mockReturnValue({
      product: null,
    });
    useProductValidationStateMock.mockReturnValue({
      validatorEnabled: false,
      visibleFieldIssues: {},
    });
    useProductValidationActionsMock.mockReturnValue({
      acceptIssue: vi.fn(),
      denyIssue: vi.fn(),
      getDenyActionLabel: vi.fn(() => 'Dismiss'),
    });
  });

  it('shows the effective automatic shipping group when category rules match', () => {
    useProductFormMetadataMock.mockReturnValue({
      catalogs: [{ id: 'catalog-1', name: 'Main Catalog', isDefault: true }],
      catalogsError: null,
      selectedCatalogIds: ['catalog-1'],
      categories: [
        { id: 'category-jewellery', name: 'Jewellery', parentId: null, catalogId: 'catalog-1' },
        { id: 'category-rings', name: 'Rings', parentId: 'category-jewellery', catalogId: 'catalog-1' },
      ],
      selectedCategoryId: 'category-rings',
      setCategoryId: vi.fn(),
      shippingGroups: [
        {
          id: 'group-7-eur',
          name: 'Jewellery 7 EUR',
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-jewellery'],
        },
      ],
      shippingGroupsLoading: false,
      filteredPriceGroups: [],
      tags: [],
      tagsLoading: false,
      selectedTagIds: [],
      toggleTag: vi.fn(),
      producers: [],
      producersLoading: false,
      selectedProducerIds: [],
      toggleProducer: vi.fn(),
      toggleCatalog: vi.fn(),
      filteredLanguages: [],
    });

    renderProductFormOther();

    expect(
      screen.getByText(/auto-assigned from category rule: jewellery 7 eur via jewellery/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/products in this category currently resolve to/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/via jewellery/i);
  });

  it('shows when a manual shipping group overrides the category-based default', () => {
    useProductFormMetadataMock.mockReturnValue({
      catalogs: [{ id: 'catalog-1', name: 'Main Catalog', isDefault: true }],
      catalogsError: null,
      selectedCatalogIds: ['catalog-1'],
      categories: [
        { id: 'category-jewellery', name: 'Jewellery', parentId: null, catalogId: 'catalog-1' },
        { id: 'category-rings', name: 'Rings', parentId: 'category-jewellery', catalogId: 'catalog-1' },
      ],
      selectedCategoryId: 'category-rings',
      setCategoryId: vi.fn(),
      shippingGroups: [
        {
          id: 'group-7-eur',
          name: 'Jewellery 7 EUR',
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-jewellery'],
        },
        {
          id: 'group-manual',
          name: 'Manual parcel',
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 5,
          autoAssignCategoryIds: [],
        },
      ],
      shippingGroupsLoading: false,
      filteredPriceGroups: [],
      tags: [],
      tagsLoading: false,
      selectedTagIds: [],
      toggleTag: vi.fn(),
      producers: [],
      producersLoading: false,
      selectedProducerIds: [],
      toggleProducer: vi.fn(),
      toggleCatalog: vi.fn(),
      filteredLanguages: [],
    });

    renderProductFormOther({ shippingGroupId: 'group-manual' });

    expect(screen.getByRole('alert')).toHaveTextContent(
      /manual shipping group manual parcel overrides the category-based default jewellery 7 eur from jewellery/i
    );
  });

  it('warns when the selected manual shipping group no longer exists', () => {
    useProductFormMetadataMock.mockReturnValue({
      catalogs: [{ id: 'catalog-1', name: 'Main Catalog', isDefault: true }],
      catalogsError: null,
      selectedCatalogIds: ['catalog-1'],
      categories: [
        { id: 'category-jewellery', name: 'Jewellery', parentId: null, catalogId: 'catalog-1' },
      ],
      selectedCategoryId: 'category-jewellery',
      setCategoryId: vi.fn(),
      shippingGroups: [],
      shippingGroupsLoading: false,
      filteredPriceGroups: [],
      tags: [],
      tagsLoading: false,
      selectedTagIds: [],
      toggleTag: vi.fn(),
      producers: [],
      producersLoading: false,
      selectedProducerIds: [],
      toggleProducer: vi.fn(),
      toggleCatalog: vi.fn(),
      filteredLanguages: [],
    });

    renderProductFormOther({ shippingGroupId: 'missing-group' });

    expect(screen.getByRole('alert')).toHaveTextContent(
      /manually assigned shipping group no longer exists/i
    );
  });
});

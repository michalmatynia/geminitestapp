// @vitest-environment jsdom

import React, { useCallback, useMemo, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';

const { useProductFormCoreMock, useTitleTermsMock } = vi.hoisted(() => ({
  useProductFormCoreMock: vi.fn(),
  useTitleTermsMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => useProductFormCoreMock(),
}));

vi.mock('@/features/products/context/ProductFormMetadataContext', async () => {
  const ReactModule = await import('react');

  const ProductFormMetadataContext = ReactModule.createContext<any>(null);
  const useProductFormMetadata = () => {
    const context = ReactModule.useContext(ProductFormMetadataContext);
    if (!context) {
      throw new Error('useProductFormMetadata must be used within a ProductFormMetadataContext');
    }
    return context;
  };

  return {
    ProductFormMetadataContext,
    useProductFormMetadata,
    useProductFormMetadataState: useProductFormMetadata,
  };
});

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useTitleTerms: (...args: unknown[]) => useTitleTermsMock(...args),
}));

type MockMultiSelectProps = {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (values: string[]) => void;
};

vi.mock('@/shared/ui/multi-select', () => ({
  MultiSelect: ({ label, options, selected, onChange }: MockMultiSelectProps) => {
    const normalizedLabel = label.toLowerCase().replace(/\s+/g, '-');
    const selectedLabels = selected
      .map((value) => options.find((option) => option.value === value)?.label ?? value)
      .join(', ');

    return (
      <div data-testid={`multi-select-${normalizedLabel}`}>
        <div data-testid={`selected-${normalizedLabel}`}>{selectedLabels || '(none)'}</div>
        <button type='button' onClick={() => onChange([])}>
          clear-{label}
        </button>
      </div>
    );
  },
}));

import { ProductFormMetadataContext } from '@/features/products/context/ProductFormMetadataContext';

import { CategorySingleSelectField } from './CategorySingleSelectField';
import { StructuredProductNameField } from './StructuredProductNameField';

const CATEGORY_FIXTURE = [
  {
    id: 'parent',
    name: 'Pins',
    color: null,
    parentId: null,
    catalogId: 'catalog-a',
    sortIndex: 1,
  },
  {
    id: 'child',
    name: 'Anime Pin',
    color: null,
    parentId: 'parent',
    catalogId: 'catalog-a',
    sortIndex: 1,
  },
];

function CategoryValueProbe(): React.JSX.Element {
  const methods = useFormContext<ProductFormData>();
  const watchedCategoryId = methods.watch('categoryId') ?? '';

  return <output data-testid='mapped-category-id'>{watchedCategoryId}</output>;
}

function IntegrationHarness(): React.JSX.Element {
  const methods = useForm<ProductFormData>({
    defaultValues: {
      name_en: '',
      categoryId: '',
    } as ProductFormData,
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const handleSetCategoryId = useCallback((nextCategoryId: string | null): void => {
    setSelectedCategoryId(nextCategoryId);
  }, []);

  const metadataValue = useMemo(
    () => ({
      catalogs: [],
      catalogsLoading: false,
      catalogsError: null,
      selectedCatalogIds: ['catalog-a'],
      toggleCatalog: () => {},
      categories: CATEGORY_FIXTURE,
      categoriesLoading: false,
      selectedCategoryId,
      setCategoryId: handleSetCategoryId,
      shippingGroups: [],
      shippingGroupsLoading: false,
      tags: [],
      tagsLoading: false,
      selectedTagIds: [],
      toggleTag: () => {},
      producers: [],
      producersLoading: false,
      selectedProducerIds: [],
      toggleProducer: () => {},
      filteredLanguages: [],
      filteredPriceGroups: [],
    }),
    [handleSetCategoryId, selectedCategoryId]
  );

  return (
    <FormProvider {...methods}>
      <ProductFormMetadataContext.Provider value={metadataValue}>
        <StructuredProductNameField />
        <CategorySingleSelectField />
        <CategoryValueProbe />
      </ProductFormMetadataContext.Provider>
    </FormProvider>
  );
}

describe('StructuredProductNameField category mapping integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductFormCoreMock.mockReturnValue({
      errors: {},
    });
    useTitleTermsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('maps a selected leaf category from English Name into the Categories field', async () => {
    render(<IntegrationHarness />);

    const input = screen.getByLabelText('English Name');

    fireEvent.change(input, {
      target: { value: 'Scout Regiment | 4 cm | Metal | p' },
    });
    input.setSelectionRange(
      'Scout Regiment | 4 cm | Metal | p'.length,
      'Scout Regiment | 4 cm | Metal | p'.length
    );
    fireEvent.keyUp(input, { key: 'p' });

    const listbox = await screen.findByRole('listbox', { name: 'Category suggestions' });
    const leafCategoryButton = within(listbox)
      .getByRole('option', { name: 'Pins / Anime Pin' })
      .closest('button');

    fireEvent.click(leafCategoryButton as HTMLButtonElement);

    await waitFor(() => {
      expect(input).toHaveValue('Scout Regiment | 4 cm | Metal | Anime Pin | ');
    });
    expect(screen.getByTestId('mapped-category-id')).toHaveTextContent('child');
    expect(screen.getByTestId('selected-categories')).toHaveTextContent('|-- Anime Pin');
  });
});

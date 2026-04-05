import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductMetadataMultiSelectField } from '@/features/products/components/form/ProductMetadataMultiSelectField';
import {
  ProductFormMetadataContext,
  type ProductFormMetadataContextType,
} from '@/features/products/context/ProductFormMetadataContext';

const multiSelectSpy = vi.fn();

vi.mock('@/shared/ui/multi-select', () => ({
  MultiSelect: (props: Record<string, unknown>) => {
    multiSelectSpy(props);
    return null;
  },
}));

const buildMetadataContext = (
  overrides: Partial<ProductFormMetadataContextType> = {}
): ProductFormMetadataContextType =>
  ({
    categories: [{ id: 'cat-dice', name: 'Dice' }],
    selectedCategoryId: null,
    categoriesLoading: false,
    setCategoryId: vi.fn(),
    catalogs: [],
    catalogsLoading: false,
    selectedCatalogIds: [],
    toggleCatalog: vi.fn(),
    tags: [],
    tagsLoading: false,
    selectedTagIds: [],
    toggleTag: vi.fn(),
    producers: [],
    producersLoading: false,
    selectedProducerIds: [],
    toggleProducer: vi.fn(),
    filteredLanguages: [],
    filteredPriceGroups: [],
    ...overrides,
  }) as unknown as ProductFormMetadataContextType;

describe('ProductMetadataMultiSelectField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses ProductFormMetadataContext.setCategoryId for single category selection', () => {
    const setCategoryId = vi.fn();
    const context = buildMetadataContext({ setCategoryId });

    render(
      <ProductFormMetadataContext.Provider value={context}>
        <ProductMetadataMultiSelectField
          label='Categories'
          contextItemsKey='categories'
          contextSelectedKey='selectedCategoryId'
          contextLoadingKey='categoriesLoading'
          contextOnChangeKey='onCategoryChange'
          single
        />
      </ProductFormMetadataContext.Provider>
    );

    expect(multiSelectSpy).toHaveBeenCalledTimes(1);
    const props = multiSelectSpy.mock.calls[0]?.[0] as {
      onChange: (values: string[]) => void;
    };

    props.onChange(['cat-dice']);
    props.onChange([]);

    expect(setCategoryId).toHaveBeenNthCalledWith(1, 'cat-dice');
    expect(setCategoryId).toHaveBeenNthCalledWith(2, null);
  });
});

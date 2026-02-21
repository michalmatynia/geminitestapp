import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductMetadataMultiSelectField } from '@/features/products/components/form/ProductMetadataMultiSelectField';
import {
  ProductFormContext,
  type ProductFormContextType,
} from '@/features/products/context/ProductFormContext';

const multiSelectSpy = vi.fn();

vi.mock('@/shared/ui', () => ({
  MultiSelect: (props: unknown) => {
    multiSelectSpy(props);
    return null;
  },
}));

const buildFormContext = (
  overrides: Partial<ProductFormContextType> = {},
): ProductFormContextType =>
  ({
    categories: [{ id: 'cat-dice', name: 'Dice' }],
    selectedCategoryId: null,
    categoriesLoading: false,
    setCategoryId: vi.fn(),
    ...overrides,
  }) as unknown as ProductFormContextType;

describe('ProductMetadataMultiSelectField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses ProductFormContext.setCategoryId for single category selection', () => {
    const setCategoryId = vi.fn();
    const context = buildFormContext({ setCategoryId });

    render(
      <ProductFormContext.Provider value={context}>
        <ProductMetadataMultiSelectField
          label='Categories'
          contextItemsKey='categories'
          contextSelectedKey='selectedCategoryId'
          contextLoadingKey='categoriesLoading'
          contextOnChangeKey='onCategoryChange'
          single
        />
      </ProductFormContext.Provider>,
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

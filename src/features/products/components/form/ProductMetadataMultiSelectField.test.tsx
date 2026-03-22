/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductMetadataFieldProvider } from './ProductMetadataFieldContext';
import { ProductMetadataMultiSelectField } from './ProductMetadataMultiSelectField';

type MockMultiSelectProps = {
  label?: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  single?: boolean;
};

let latestMultiSelectProps: MockMultiSelectProps | null = null;

vi.mock('@/features/products/ui', () => ({
  MultiSelect: (props: MockMultiSelectProps) => {
    latestMultiSelectProps = props;

    return (
      <div data-testid='mock-multi-select'>
        <div data-testid='selected-values'>{props.selected.join(',')}</div>
        <button type='button' onClick={() => props.onChange(['next-selection'])}>
          choose-next
        </button>
        <button type='button' onClick={() => props.onChange([])}>
          clear-selection
        </button>
      </div>
    );
  },
}));

describe('ProductMetadataMultiSelectField', () => {
  beforeEach(() => {
    latestMultiSelectProps = null;
    vi.clearAllMocks();
  });

  it('passes direct props into MultiSelect without an intermediate runtime provider', () => {
    const onChange = vi.fn();

    render(
      <ProductMetadataMultiSelectField
        label='Tags'
        items={[
          { id: 'tag-1', name: 'Featured' },
          { id: 'tag-2', name: 'New' },
        ]}
        selectedIds={['tag-1']}
        onChange={onChange}
        contextItemsKey='tags'
        contextSelectedKey='selectedTagIds'
        contextLoadingKey='tagsLoading'
        contextOnChangeKey='onTagsChange'
        placeholder='Select tags'
        searchPlaceholder='Search tags...'
      />
    );

    expect(screen.getByTestId('selected-values')).toHaveTextContent('tag-1');
    expect(latestMultiSelectProps).toMatchObject({
      label: 'Tags',
      options: [
        { value: 'tag-1', label: 'Featured' },
        { value: 'tag-2', label: 'New' },
      ],
      placeholder: 'Select tags',
      searchPlaceholder: 'Search tags...',
      single: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'choose-next' }));

    expect(onChange).toHaveBeenCalledWith(['next-selection']);
  });

  it('builds category tree options and maps single-select context actions correctly', () => {
    const onCategoryChange = vi.fn();

    render(
      <ProductMetadataFieldProvider
        value={{
          categories: [
            { id: 'parent', name: 'Parent', parentId: null, sortIndex: 1 },
            { id: 'child', name: 'Child', parentId: 'parent', sortIndex: 1 },
          ],
          selectedCategoryId: 'child',
          categoriesLoading: false,
          onCategoryChange,
        }}
      >
        <ProductMetadataMultiSelectField
          label='Categories'
          contextItemsKey='categories'
          contextSelectedKey='selectedCategoryId'
          contextLoadingKey='categoriesLoading'
          contextOnChangeKey='onCategoryChange'
          single
        />
      </ProductMetadataFieldProvider>
    );

    expect(screen.getByTestId('selected-values')).toHaveTextContent('child');
    expect(latestMultiSelectProps).toMatchObject({
      label: 'Categories',
      options: [
        { value: 'parent', label: 'Parent' },
        { value: 'child', label: '|-- Child' },
      ],
      single: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'choose-next' }));
    fireEvent.click(screen.getByRole('button', { name: 'clear-selection' }));

    expect(onCategoryChange).toHaveBeenNthCalledWith(1, 'next-selection');
    expect(onCategoryChange).toHaveBeenNthCalledWith(2, null);
  });
});

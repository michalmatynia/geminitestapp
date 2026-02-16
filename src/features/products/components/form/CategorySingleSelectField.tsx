'use client';

import React from 'react';

import { ProductMetadataMultiSelectField } from './ProductMetadataMultiSelectField';

type CategoryOption = {
  id: string;
  name: string;
};

type CategorySingleSelectFieldProps = {
  categories?: CategoryOption[] | undefined;
  selectedCategoryId?: string | null | undefined;
  onChange?: ((nextId: string | null) => void) | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
};

export function CategorySingleSelectField(props: CategorySingleSelectFieldProps): React.JSX.Element {
  return (
    <ProductMetadataMultiSelectField
      {...props}
      label='Categories'
      items={props.categories}
      selectedIds={props.selectedCategoryId ? [props.selectedCategoryId] : []}
      contextItemsKey='categories'
      contextSelectedKey='selectedCategoryId'
      contextLoadingKey='categoriesLoading'
      contextOnChangeKey='onCategoryChange'
      placeholder={props.placeholder || 'Select category'}
      searchPlaceholder='Search categories...'
      single
    />
  );
}

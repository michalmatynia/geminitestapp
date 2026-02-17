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

export function CategorySingleSelectField({ onChange, ...props }: CategorySingleSelectFieldProps): React.JSX.Element {
  const selectedIds =
    props.selectedCategoryId === undefined
      ? undefined
      : props.selectedCategoryId
        ? [props.selectedCategoryId]
        : [];

  return (
    <ProductMetadataMultiSelectField
      {...props}
      label='Categories'
      items={props.categories}
      selectedIds={selectedIds}
      onChange={onChange ? (ids) => onChange(ids[0] || null) : undefined}
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

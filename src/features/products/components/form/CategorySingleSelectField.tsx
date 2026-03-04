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
  const { categories, selectedCategoryId, onChange, loading, disabled, placeholder } = props;

  const selectedIds =
    selectedCategoryId === undefined
      ? undefined
      : selectedCategoryId
        ? [selectedCategoryId]
        : [];

  return (
    <ProductMetadataMultiSelectField
      label='Categories'
      items={categories}
      selectedIds={selectedIds}
      onChange={onChange ? (ids) => onChange(ids[0] || null) : undefined}
      contextItemsKey='categories'
      contextSelectedKey='selectedCategoryId'
      contextLoadingKey='categoriesLoading'
      contextOnChangeKey='onCategoryChange'
      loading={loading}
      disabled={disabled}
      placeholder={placeholder || 'Select category'}
      searchPlaceholder='Search categories...'
      single
    />
  );
}

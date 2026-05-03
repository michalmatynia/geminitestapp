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
  emptyMessage?: string | undefined;
};

const resolveSelectedCategoryIds = (
  selectedCategoryId: string | null | undefined
): string[] | undefined => {
  if (selectedCategoryId === undefined) return undefined;
  if (selectedCategoryId === null || selectedCategoryId === '') return [];
  return [selectedCategoryId];
};

export function CategorySingleSelectField(
  props: CategorySingleSelectFieldProps
): React.JSX.Element {
  const { categories, selectedCategoryId, onChange, loading, disabled, placeholder, emptyMessage } =
    props;

  const selectedIds = resolveSelectedCategoryIds(selectedCategoryId);
  const handleChange =
    onChange !== undefined ? (ids: string[]): void => onChange(ids[0] ?? null) : undefined;

  return (
    <ProductMetadataMultiSelectField
      label='Categories'
      items={categories}
      selectedIds={selectedIds}
      onChange={handleChange}
      contextItemsKey='categories'
      contextSelectedKey='selectedCategoryId'
      contextLoadingKey='categoriesLoading'
      contextOnChangeKey='onCategoryChange'
      loading={loading}
      disabled={disabled}
      placeholder={placeholder ?? 'Select category'}
      searchPlaceholder='Search categories...'
      emptyMessage={emptyMessage}
      single
    />
  );
}

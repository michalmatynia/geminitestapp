'use client';

import { useContext } from 'react';

import { ProductFormContext } from '@/features/products/context/ProductFormContext';
import { internalError } from '@/shared/errors/app-error';
import { MultiSelect } from '@/shared/ui';

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

export function CategorySingleSelectField({
  categories: categoriesProp,
  selectedCategoryId: selectedCategoryIdProp,
  onChange: onChangeProp,
  loading = false,
  disabled = false,
  placeholder = 'Select category',
}: CategorySingleSelectFieldProps): React.JSX.Element {
  const formContext = useContext(ProductFormContext);
  const categories = categoriesProp ?? formContext?.categories ?? [];
  const selectedCategoryId = selectedCategoryIdProp ?? formContext?.selectedCategoryId ?? null;
  const resolvedOnChange = onChangeProp ?? formContext?.setCategoryId ?? null;
  const resolvedLoading = categoriesProp ? loading : (formContext?.categoriesLoading ?? loading);

  if (!resolvedOnChange) {
    throw internalError(
      'CategorySingleSelectField requires `onChange` prop when used outside ProductFormContext.'
    );
  }

  return (
    <MultiSelect
      label='Categories'
      options={categories.map((category: CategoryOption) => ({
        value: category.id,
        label: category.name,
      }))}
      selected={selectedCategoryId ? [selectedCategoryId] : []}
      onChange={(values: string[]): void => {
        resolvedOnChange(values[0] || null);
      }}
      loading={resolvedLoading}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder='Search categories...'
      single
    />
  );
}

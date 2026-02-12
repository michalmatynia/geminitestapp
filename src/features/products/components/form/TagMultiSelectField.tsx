'use client';

import { useContext } from 'react';

import { ProductFormContext } from '@/features/products/context/ProductFormContext';
import type { ProductTag } from '@/features/products/types';
import { internalError } from '@/shared/errors/app-error';
import { MultiSelect } from '@/shared/ui';

import { useOptionalProductMetadataFieldContext } from './ProductMetadataFieldContext';

type TagMultiSelectFieldProps = {
  tags?: ProductTag[] | undefined;
  selectedTagIds?: string[] | undefined;
  onChange?: ((nextIds: string[]) => void) | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
};

export function TagMultiSelectField({
  tags: tagsProp,
  selectedTagIds: selectedTagIdsProp,
  onChange: onChangeProp,
  loading = false,
  disabled = false,
  placeholder = 'Select tags',
}: TagMultiSelectFieldProps): React.JSX.Element {
  const formContext = useContext(ProductFormContext);
  const metadataContext = useOptionalProductMetadataFieldContext();
  const tags = tagsProp ?? metadataContext?.tags ?? formContext?.tags ?? [];
  const selectedTagIds =
    selectedTagIdsProp ??
    metadataContext?.selectedTagIds ??
    formContext?.selectedTagIds ??
    [];
  const resolvedLoading = tagsProp
    ? loading
    : (metadataContext?.tagsLoading ?? formContext?.tagsLoading ?? loading);
  const resolvedOnChange =
    onChangeProp ??
    metadataContext?.onTagsChange ??
    (formContext
      ? (nextIds: string[]): void => {
        const previous = new Set(formContext.selectedTagIds);
        const next = new Set(nextIds);
        for (const id of nextIds) {
          if (!previous.has(id)) formContext.toggleTag(id);
        }
        for (const id of formContext.selectedTagIds) {
          if (!next.has(id)) formContext.toggleTag(id);
        }
      }
      : null);

  if (!resolvedOnChange) {
    throw internalError(
      'TagMultiSelectField requires `onChange` prop when used outside ProductFormContext.'
    );
  }

  return (
    <MultiSelect
      label='Tags'
      options={tags.map((tag: ProductTag) => ({ value: tag.id, label: tag.name }))}
      selected={selectedTagIds}
      onChange={resolvedOnChange}
      loading={resolvedLoading}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder='Search tags...'
    />
  );
}

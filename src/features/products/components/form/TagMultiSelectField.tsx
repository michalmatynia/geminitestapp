import React from 'react';

import type { ProductTag } from '@/shared/contracts/products';

import { ProductMetadataMultiSelectField } from './ProductMetadataMultiSelectField';

type TagMultiSelectFieldProps = {
  tags?: ProductTag[] | undefined;
  selectedTagIds?: string[] | undefined;
  onChange?: ((nextIds: string[]) => void) | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
};

export function TagMultiSelectField(props: TagMultiSelectFieldProps): React.JSX.Element {
  const { tags, selectedTagIds, onChange, loading, disabled, placeholder } = props;

  return (
    <ProductMetadataMultiSelectField
      label='Tags'
      items={tags}
      selectedIds={selectedTagIds}
      onChange={onChange}
      loading={loading}
      disabled={disabled}
      contextItemsKey='tags'
      contextSelectedKey='selectedTagIds'
      contextLoadingKey='tagsLoading'
      contextOnChangeKey='onTagsChange'
      formContextToggleName='toggleTag'
      placeholder={placeholder || 'Select tags'}
      searchPlaceholder='Search tags...'
    />
  );
}

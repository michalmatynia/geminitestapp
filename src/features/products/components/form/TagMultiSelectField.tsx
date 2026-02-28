

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
  return (
    <ProductMetadataMultiSelectField
      {...props}
      label='Tags'
      items={props.tags}
      selectedIds={props.selectedTagIds}
      contextItemsKey='tags'
      contextSelectedKey='selectedTagIds'
      contextLoadingKey='tagsLoading'
      contextOnChangeKey='onTagsChange'
      formContextToggleName='toggleTag'
      placeholder={props.placeholder || 'Select tags'}
      searchPlaceholder='Search tags...'
    />
  );
}

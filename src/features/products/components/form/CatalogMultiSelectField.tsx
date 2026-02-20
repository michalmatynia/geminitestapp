'use client';

import React from 'react';

import type { CatalogRecord } from '@/shared/contracts/products';

import { ProductMetadataMultiSelectField } from './ProductMetadataMultiSelectField';

type CatalogMultiSelectFieldProps = {
  catalogs?: CatalogRecord[] | undefined;
  selectedCatalogIds?: string[] | undefined;
  onChange?: ((nextIds: string[]) => void) | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  emptyMessage?: string | undefined;
};

export function CatalogMultiSelectField(props: CatalogMultiSelectFieldProps): React.JSX.Element {
  return (
    <ProductMetadataMultiSelectField
      {...props}
      label='Catalogs'
      items={props.catalogs}
      selectedIds={props.selectedCatalogIds}
      contextItemsKey='catalogs'
      contextSelectedKey='selectedCatalogIds'
      contextLoadingKey='catalogsLoading'
      contextOnChangeKey='onCatalogsChange'
      formContextToggleName='toggleCatalog'
      placeholder='Select catalogs'
      searchPlaceholder='Search catalogs...'
    />
  );
}

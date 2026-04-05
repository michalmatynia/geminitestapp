import React from 'react';

import type { CatalogRecord } from '@/shared/contracts/products/catalogs';

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
  const { catalogs, selectedCatalogIds, onChange, loading, disabled, emptyMessage } = props;

  return (
    <ProductMetadataMultiSelectField
      label='Catalogs'
      items={catalogs}
      selectedIds={selectedCatalogIds}
      onChange={onChange}
      loading={loading}
      disabled={disabled}
      emptyMessage={emptyMessage}
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

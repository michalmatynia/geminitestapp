'use client';

import { useContext } from 'react';

import { ProductFormContext } from '@/features/products/context/ProductFormContext';
import type { CatalogRecord } from '@/features/products/types';
import { internalError } from '@/shared/errors/app-error';
import { MultiSelect } from '@/shared/ui';

type CatalogMultiSelectFieldProps = {
  catalogs?: CatalogRecord[] | undefined;
  selectedCatalogIds?: string[] | undefined;
  onChange?: ((nextIds: string[]) => void) | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  emptyMessage?: string | undefined;
};

export function CatalogMultiSelectField({
  catalogs: catalogsProp,
  selectedCatalogIds: selectedCatalogIdsProp,
  onChange: onChangeProp,
  loading = false,
  disabled = false,
  emptyMessage = 'No catalogs found',
}: CatalogMultiSelectFieldProps): React.JSX.Element {
  const formContext = useContext(ProductFormContext);
  const catalogs = catalogsProp ?? formContext?.catalogs ?? [];
  const selectedCatalogIds = selectedCatalogIdsProp ?? formContext?.selectedCatalogIds ?? [];
  const resolvedLoading = catalogsProp ? loading : (formContext?.catalogsLoading ?? loading);
  const resolvedOnChange =
    onChangeProp ??
    (formContext
      ? (nextIds: string[]): void => {
        const previous = new Set(formContext.selectedCatalogIds);
        const next = new Set(nextIds);
        for (const id of nextIds) {
          if (!previous.has(id)) formContext.toggleCatalog(id);
        }
        for (const id of formContext.selectedCatalogIds) {
          if (!next.has(id)) formContext.toggleCatalog(id);
        }
      }
      : null);

  if (!resolvedOnChange) {
    throw internalError(
      'CatalogMultiSelectField requires `onChange` prop when used outside ProductFormContext.'
    );
  }

  return (
    <MultiSelect
      label='Catalogs'
      options={catalogs.map((catalog: CatalogRecord) => ({
        value: catalog.id,
        label: catalog.name,
      }))}
      selected={selectedCatalogIds}
      onChange={resolvedOnChange}
      loading={resolvedLoading}
      disabled={disabled}
      placeholder='Select catalogs'
      searchPlaceholder='Search catalogs...'
      emptyMessage={emptyMessage}
    />
  );
}

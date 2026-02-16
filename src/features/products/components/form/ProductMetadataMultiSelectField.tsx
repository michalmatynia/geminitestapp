'use client';

import { useContext } from 'react';

import { ProductFormContext } from '@/features/products/context/ProductFormContext';
import { internalError } from '@/shared/errors/app-error';
import { MultiSelect } from '@/shared/ui';

import { useOptionalProductMetadataFieldContext } from './ProductMetadataFieldContext';

type MetadataItem = { id: string; name: string };

export interface ProductMetadataMultiSelectFieldProps {
  label: string;
  items?: MetadataItem[] | undefined;
  selectedIds?: string[] | undefined;
  onChange?: ((nextIds: string[]) => void) | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
  searchPlaceholder?: string | undefined;
  emptyMessage?: string | undefined;
  
  // Mapping keys for context retrieval
  contextItemsKey: 'catalogs' | 'producers' | 'tags' | 'categories';
  contextSelectedKey: 'selectedCatalogIds' | 'selectedProducerIds' | 'selectedTagIds' | 'selectedCategoryId';
  contextLoadingKey: 'catalogsLoading' | 'producersLoading' | 'tagsLoading' | 'categoriesLoading';
  contextOnChangeKey: 'onCatalogsChange' | 'onProducersChange' | 'onTagsChange' | 'onCategoryChange';
  
  // Form context toggle helper name
  formContextToggleName?: 'toggleCatalog' | 'toggleProducer' | 'toggleTag';

  single?: boolean;
}

/**
 * Generic field for product metadata selection (Catalogs, Producers, Tags).
 * Consolidates CatalogMultiSelectField, ProducerMultiSelectField, TagMultiSelectField.
 */
export function ProductMetadataMultiSelectField({
  label,
  items: itemsProp,
  selectedIds: selectedIdsProp,
  onChange: onChangeProp,
  loading = false,
  disabled = false,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  contextItemsKey,
  contextSelectedKey,
  contextLoadingKey,
  contextOnChangeKey,
  formContextToggleName,
  single = false,
}: ProductMetadataMultiSelectFieldProps): React.JSX.Element {
  const formContext = useContext(ProductFormContext);
  const metadataContext = useOptionalProductMetadataFieldContext();

  const items = itemsProp ?? (metadataContext?.[contextItemsKey] as MetadataItem[]) ?? (formContext?.[contextItemsKey] as MetadataItem[]) ?? [];
  
  // Handle both single string/null and string[]
  const rawSelected = selectedIdsProp ?? (metadataContext?.[contextSelectedKey] as string[] | string | null) ?? (formContext?.[contextSelectedKey] as string[] | string | null);
  const selectedIds = Array.isArray(rawSelected) 
    ? rawSelected 
    : (rawSelected ? [rawSelected] : []);

  const resolvedLoading = itemsProp
    ? loading
    : ((metadataContext?.[contextLoadingKey] as boolean) ?? (formContext?.[contextLoadingKey] as boolean) ?? loading);

  const resolvedOnChange =
    onChangeProp ??
    (metadataContext?.[contextOnChangeKey] as (ids: string[] | string | null) => void) ??
          (formContext
          ? (nextIds: string[]): void => {
            if (single) {
              const handler = (metadataContext?.[contextOnChangeKey] ?? (formContext as unknown as Record<string, unknown> | null)?.[contextOnChangeKey]) as (id: string | null) => void;
              if (handler) {
                handler(nextIds[0] || null);            return;
          }
        }

        if (!formContextToggleName) return;

        const previous = new Set(formContext[contextSelectedKey] as string[]);
        const next = new Set(nextIds);
        
        // Items to add
        for (const id of nextIds) {
          if (!previous.has(id)) {
            (formContext[formContextToggleName] as (id: string) => void)(id);
          }
        }
        
        // Items to remove
        for (const id of (formContext[contextSelectedKey] as string[])) {
          if (!next.has(id)) {
            (formContext[formContextToggleName] as (id: string) => void)(id);
          }
        }
      }
      : null);

  if (!resolvedOnChange) {
    throw internalError(
      `${label} field requires 'onChange' prop when used outside ProductFormContext or ProductMetadataFieldContext.`
    );
  }

  return (
    <MultiSelect
      label={label}
      options={items.map((item) => ({
        value: item.id,
        label: item.name,
      }))}
      selected={selectedIds}
      onChange={(values: string[]) => {
        if (single) {
          (resolvedOnChange as unknown as (id: string | null) => void)(values[0] || null);
        } else {
          (resolvedOnChange as unknown as (ids: string[]) => void)(values);
        }
      }}
      loading={resolvedLoading}
      disabled={disabled}
      placeholder={placeholder || `Select ${label.toLowerCase()}`}
      searchPlaceholder={searchPlaceholder || `Search ${label.toLowerCase()}...`}
      emptyMessage={emptyMessage}
      single={single}
    />
  );
}

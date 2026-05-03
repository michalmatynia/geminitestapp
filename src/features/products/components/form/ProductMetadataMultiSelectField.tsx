'use client';

import { MultiSelect } from '@/shared/ui/multi-select';

import { useProductMetadataMultiSelectFieldProps } from './ProductMetadataMultiSelectField.controller';
import type {
  ProductMetadataMultiSelectFieldProps,
  ProductMetadataMultiSelectFieldResolvedProps,
} from './ProductMetadataMultiSelectField.types';

export type {
  MetadataItem,
  ProductMetadataMultiSelectFieldProps,
} from './ProductMetadataMultiSelectField.types';

const renderProductMetadataMultiSelectField = ({
  label,
  options,
  selectedIds,
  resolvedOnChange,
  resolvedLoading,
  disabled,
  resolvedPlaceholder,
  resolvedSearchPlaceholder,
  emptyMessage,
  single,
}: ProductMetadataMultiSelectFieldResolvedProps): React.JSX.Element => (
  <MultiSelect
    label={label}
    options={options}
    selected={selectedIds}
    onChange={resolvedOnChange}
    loading={resolvedLoading}
    disabled={disabled}
    placeholder={resolvedPlaceholder}
    searchPlaceholder={resolvedSearchPlaceholder}
    emptyMessage={emptyMessage}
    single={single}
  />
);

export function ProductMetadataMultiSelectField(
  props: ProductMetadataMultiSelectFieldProps
): React.JSX.Element {
  return renderProductMetadataMultiSelectField(useProductMetadataMultiSelectFieldProps(props));
}

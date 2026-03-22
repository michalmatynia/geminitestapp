'use client';

import * as React from 'react';

import type { SearchableSelectProps } from '@/shared/contracts/ui';

import { MultiSelect, type MultiSelectOption } from './multi-select';

export type { SearchableSelectProps };

type SearchableSelectControlProps = {
  options: ReadonlyArray<MultiSelectOption>;
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
};

function SearchableSelectControl({
  options,
  selected,
  onChange,
  placeholder,
  searchPlaceholder,
  label,
  disabled,
  className,
  loading,
  emptyMessage,
}: SearchableSelectControlProps): React.JSX.Element {
  return (
    <MultiSelect
      options={options}
      selected={selected}
      onChange={onChange}
      single
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      label={label}
      disabled={disabled}
      className={className}
      loading={loading}
      emptyMessage={emptyMessage}
    />
  );
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  label,
  disabled,
  className,
  loading,
  emptyMessage,
}: SearchableSelectProps): React.JSX.Element {
  const selected = React.useMemo(() => (value ? [value] : []), [value]);

  const handleChange = React.useCallback(
    (values: string[]) => {
      onChange(values.length > 0 ? (values[0] ?? null) : null);
    },
    [onChange]
  );

  return (
    <SearchableSelectControl
      options={options}
      selected={selected}
      onChange={handleChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      label={label}
      disabled={disabled}
      className={className}
      loading={loading}
      emptyMessage={emptyMessage}
    />
  );
}

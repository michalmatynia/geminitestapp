'use client';

import * as React from 'react';

import type { SearchableSelectProps } from '@/shared/contracts/ui';

import { MultiSelect } from './multi-select';

export type { SearchableSelectProps };

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
    <MultiSelect
      options={options}
      selected={selected}
      onChange={handleChange}
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

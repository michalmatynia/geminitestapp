'use client';

import * as React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { MultiSelect, type MultiSelectOption } from './multi-select';

export interface SearchableSelectProps {
  options: MultiSelectOption[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
}

type SearchableSelectRuntimeValue = {
  options: MultiSelectOption[];
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

const { Context: SearchableSelectRuntimeContext, useStrictContext: useSearchableSelectRuntime } =
  createStrictContext<SearchableSelectRuntimeValue>({
    hookName: 'useSearchableSelectRuntime',
    providerName: 'SearchableSelectRuntimeProvider',
    displayName: 'SearchableSelectRuntimeContext',
  });

function SearchableSelectControl(): React.JSX.Element {
  const runtime = useSearchableSelectRuntime();
  return (
    <MultiSelect
      options={runtime.options}
      selected={runtime.selected}
      onChange={runtime.onChange}
      single
      placeholder={runtime.placeholder}
      searchPlaceholder={runtime.searchPlaceholder}
      label={runtime.label}
      disabled={runtime.disabled}
      className={runtime.className}
      loading={runtime.loading}
      emptyMessage={runtime.emptyMessage}
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
  const runtimeValue = React.useMemo<SearchableSelectRuntimeValue>(
    () => ({
      options,
      selected,
      onChange: handleChange,
      placeholder,
      searchPlaceholder,
      label,
      disabled,
      className,
      loading,
      emptyMessage,
    }),
    [
      options,
      selected,
      handleChange,
      placeholder,
      searchPlaceholder,
      label,
      disabled,
      className,
      loading,
      emptyMessage,
    ]
  );

  return (
    <SearchableSelectRuntimeContext.Provider value={runtimeValue}>
      <SearchableSelectControl />
    </SearchableSelectRuntimeContext.Provider>
  );
}

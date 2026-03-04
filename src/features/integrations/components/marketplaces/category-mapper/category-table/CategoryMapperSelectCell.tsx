import React from 'react';

import { SearchableSelect } from '@/shared/ui';

export type CategoryMapperSelectCellProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  options: Array<{ value: string; label: string }>;
  disabled: boolean;
};

export function CategoryMapperSelectCell(
  props: CategoryMapperSelectCellProps
): React.JSX.Element {
  const { value, onChange, options, disabled } = props;

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      placeholder='Search internal category...'
      searchPlaceholder='Type to filter...'
      className='w-full max-w-md'
    />
  );
}

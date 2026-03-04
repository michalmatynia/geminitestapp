import React from 'react';

import { SearchableSelect } from '@/shared/ui';

export type CategoryMapperSelectCellProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  options: Array<{ value: string; label: string }>;
  disabled: boolean;
};

export function CategoryMapperSelectCell({
  value,
  onChange,
  options,
  disabled,
}: CategoryMapperSelectCellProps): React.JSX.Element {
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

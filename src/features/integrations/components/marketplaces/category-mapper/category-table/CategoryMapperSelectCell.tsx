import React from 'react';

import { SearchableSelect } from '@/shared/ui/forms-and-actions.public';
import type { GenericMapperExternalCellProps as CategoryMapperSelectCellProps } from '@/shared/contracts/ui/api';

export type { CategoryMapperSelectCellProps };

export function CategoryMapperSelectCell(props: CategoryMapperSelectCellProps): React.JSX.Element {
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

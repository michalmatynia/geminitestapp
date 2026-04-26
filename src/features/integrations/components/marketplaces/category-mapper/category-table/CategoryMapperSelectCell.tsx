import React from 'react';

import { SearchableSelect } from '@/shared/ui/forms-and-actions.public';
import type { MultiSelectOption } from '@/shared/contracts/ui/controls';

const UNMAPPED_INTERNAL_CATEGORY_VALUE = '__category_mapper_unmapped__';

const UNMAPPED_INTERNAL_CATEGORY_OPTION: MultiSelectOption = {
  value: UNMAPPED_INTERNAL_CATEGORY_VALUE,
  label: '— Not mapped —',
};

export type CategoryMapperSelectCellProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  options: ReadonlyArray<MultiSelectOption>;
  disabled: boolean;
};

export function CategoryMapperSelectCell(props: CategoryMapperSelectCellProps): React.JSX.Element {
  const { value, onChange, options, disabled } = props;
  const resolvedOptions = React.useMemo(
    () => [UNMAPPED_INTERNAL_CATEGORY_OPTION, ...options],
    [options]
  );
  const handleChange = React.useCallback(
    (nextValue: string | null): void => {
      onChange(nextValue === UNMAPPED_INTERNAL_CATEGORY_VALUE ? null : nextValue);
    },
    [onChange]
  );

  return (
    <SearchableSelect
      value={value ?? UNMAPPED_INTERNAL_CATEGORY_VALUE}
      onChange={handleChange}
      options={resolvedOptions}
      disabled={disabled}
      placeholder='Search internal category...'
      searchPlaceholder='Type to filter...'
      className='w-full max-w-md'
    />
  );
}

import React from 'react';

import type { GenericMapperExternalCellProps } from '@/shared/contracts/ui/api';
import { SelectSimple } from '../../select-simple';

export type { GenericMapperExternalCellProps };

export function GenericMapperExternalCell(
  props: GenericMapperExternalCellProps
): React.JSX.Element {
  const { value, onChange, options, disabled } = props;

  return (
    <SelectSimple
      value={value ?? '__unmapped__'}
      onValueChange={(val) => onChange(val === '__unmapped__' ? null : val)}
      disabled={disabled}
      options={options}
      variant='subtle'
      size='sm'
      triggerClassName='w-full max-w-md'
     ariaLabel='Select option' title='Select option'/>
  );
}

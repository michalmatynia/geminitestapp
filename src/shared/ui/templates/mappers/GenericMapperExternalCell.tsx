import React from 'react';
import { SelectSimple } from '../../select-simple';

export type GenericMapperExternalCellProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  options: Array<{ value: string; label: string }>;
  disabled: boolean;
};

export function GenericMapperExternalCell({
  value,
  onChange,
  options,
  disabled,
}: GenericMapperExternalCellProps): React.JSX.Element {
  return (
    <SelectSimple
      value={value ?? '__unmapped__'}
      onValueChange={(val) => onChange(val === '__unmapped__' ? null : val)}
      disabled={disabled}
      options={options}
      variant='subtle'
      size='sm'
      triggerClassName='w-full max-w-md'
    />
  );
}

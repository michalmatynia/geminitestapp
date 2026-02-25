'use client';

import React from 'react';
import { SelectSimple } from '@/shared/ui';

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
    <SelectSimple
      value={value ?? '__unmapped__'}
      onValueChange={(val: string): void =>
        onChange(val === '__unmapped__' ? null : val)
      }
      disabled={disabled}
      options={[
        { value: '__unmapped__', label: '— Not mapped —' },
        ...options
      ]}
      placeholder='— Not mapped —'
      variant='subtle'
      size='sm'
      triggerClassName='w-full max-w-md'
    />
  );
}

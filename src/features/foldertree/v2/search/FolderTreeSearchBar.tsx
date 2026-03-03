'use client';

import React from 'react';
import { SearchInput } from '@/shared/ui';

export type FolderTreeSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
};

export function FolderTreeSearchBar({
  value,
  onChange,
  placeholder = 'Search…',
}: FolderTreeSearchBarProps): React.JSX.Element {
  return (
    <SearchInput
      value={value}
      onChange={(e): void => onChange(e.target.value)}
      onClear={(): void => onChange('')}
      placeholder={placeholder}
      size='xs'
      variant='subtle'
      className='bg-card/20 border-border/60 text-[12px]'
    />
  );
}

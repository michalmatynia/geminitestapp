'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

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
    <div className='flex items-center gap-1.5 rounded border border-border/60 bg-card/20 px-2 py-1'>
      <Search className='size-3.5 shrink-0 text-muted-foreground/70' />
      <input
        type='text'
        value={value}
        onChange={(e): void => onChange(e.target.value)}
        placeholder={placeholder}
        className='min-w-0 flex-1 bg-transparent text-[12px] text-gray-200 outline-none placeholder:text-muted-foreground/50'
      />
      {value.length > 0 && (
        <button
          type='button'
          onClick={(): void => onChange('')}
          className='shrink-0 rounded text-muted-foreground/60 hover:text-gray-300'
          aria-label='Clear search'
        >
          <X className='size-3.5' />
        </button>
      )}
    </div>
  );
}

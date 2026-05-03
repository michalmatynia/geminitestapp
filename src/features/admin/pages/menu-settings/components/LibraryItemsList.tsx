'use client';

import React from 'react';
import { Button } from '@/shared/ui/primitives.public';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';
import { SectionHeader, insetPanelVariants } from '@/shared/ui/navigation-and-layout.public';
import type { AdminNavNodeEntry } from '@/shared/contracts/admin';

interface LibraryItemsListProps {
  libraryQuery: string;
  setLibraryQuery: (q: string) => void;
  filteredLibraryItems: AdminNavNodeEntry[];
  customIds: Set<string>;
  onAdd: (entry: AdminNavNodeEntry) => void;
}

function LibraryItem({
  entry,
  isAdded,
  onAdd,
}: {
  entry: AdminNavNodeEntry;
  isAdded: boolean;
  onAdd: (entry: AdminNavNodeEntry) => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/30 p-3'>
      <SectionHeader
        title={entry.label}
        subtitle={`${entry.parents.join(' / ')}${entry.parents.length > 0 ? ' / ' : ''}${entry.href ?? 'Group'}`}
        size='xs'
        className='flex-1'
        actions={
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 px-2 text-[11px]'
            disabled={isAdded}
            onClick={() => onAdd(entry)}
          >
            {isAdded ? 'Added' : 'Add'}
          </Button>
        }
      />
    </div>
  );
}

export function LibraryItemsList({
  libraryQuery,
  setLibraryQuery,
  filteredLibraryItems,
  customIds,
  onAdd,
}: LibraryItemsListProps): React.JSX.Element {
  return (
    <div>
      <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
        Add built-in items
      </h3>
      <SearchInput
        value={libraryQuery}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          setLibraryQuery(event.target.value)
        }
        placeholder='Search built-in menu…'
        className='mt-2 h-9 bg-gray-900/40'
        onClear={() => setLibraryQuery('')}
        size='sm'
      />
      <div className='mt-3 max-h-80 space-y-2 overflow-auto pr-2'>
        {filteredLibraryItems.length === 0 ? (
          <p
            className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} border-border text-xs text-gray-400`}
          >
            No matching menu items.
          </p>
        ) : (
          filteredLibraryItems.map((entry: AdminNavNodeEntry) => (
            <LibraryItem
              key={entry.id}
              entry={entry}
              isAdded={customIds.has(entry.id)}
              onAdd={onAdd}
            />
          ))
        )}
      </div>
    </div>
  );
}

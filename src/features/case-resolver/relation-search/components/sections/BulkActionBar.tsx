'use client';

import React from 'react';
import { ListPlus } from 'lucide-react';
import { useDocumentRelationSearchContext } from '../../context/DocumentRelationSearchContext';

export function BulkActionBar(): React.JSX.Element | null {
  const { selectedFileIds, isLocked, handleLinkAll, clearSelection } =
    useDocumentRelationSearchContext();

  const selectedCount = selectedFileIds.size;
  if (selectedCount === 0) return null;
  return (
    <div className='flex items-center gap-3 border-b border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs'>
      <span className='text-cyan-200'>{selectedCount} selected</span>
      <button
        type='button'
        disabled={isLocked}
        onClick={handleLinkAll}
        className='flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:pointer-events-none disabled:opacity-40'
      >
        <ListPlus className='size-3' />
        Link All Selected
      </button>
      <button
        type='button'
        onClick={clearSelection}
        className='text-gray-400 transition-colors hover:text-gray-200'
      >
        Clear
      </button>
    </div>
  );
}

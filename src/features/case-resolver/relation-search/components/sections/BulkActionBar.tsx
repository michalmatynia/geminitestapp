'use client';

import { ListPlus } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/primitives.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import {
  useDocumentRelationSearchActionsContext,
  useDocumentRelationSearchStateContext,
} from '../../context/DocumentRelationSearchContext';

export function BulkActionBar(): React.JSX.Element | null {
  const { selectedFileIds, isLocked } = useDocumentRelationSearchStateContext();
  const { handleLinkAll, clearSelection } = useDocumentRelationSearchActionsContext();

  const selectedCount = selectedFileIds.size;
  if (selectedCount === 0) return null;
  return (
    <div className={`${UI_CENTER_ROW_SPACED_CLASSNAME} border-b border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs`}>
      <span className='text-cyan-200 font-medium'>{selectedCount} selected</span>
      <Button
        variant='ghost'
        size='xs'
        disabled={isLocked}
        onClick={(): void => {
          void handleLinkAll();
        }}
        className='flex items-center gap-1 h-7 border border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
      >
        <ListPlus className='size-3' />
        Link All Selected
      </Button>
      <Button
        variant='ghost'
        size='xs'
        onClick={clearSelection}
        className='h-7 text-gray-400 hover:text-gray-200 hover:bg-transparent'
      >
        Clear
      </Button>
    </div>
  );
}

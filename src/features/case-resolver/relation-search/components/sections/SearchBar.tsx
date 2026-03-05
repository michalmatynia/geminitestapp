'use client';

import React from 'react';
import { FolderTreeSearchBar } from '@/features/foldertree/v2/search';
import {
  useDocumentRelationSearchActionsContext,
  useDocumentRelationSearchStateContext,
} from '../../context/DocumentRelationSearchContext';

export function SearchBar(): React.JSX.Element {
  const { documentSearchQuery, currentDocRows } = useDocumentRelationSearchStateContext();
  const { setDocumentSearchQuery } = useDocumentRelationSearchActionsContext();

  return (
    <div className='flex items-center gap-2 border-b border-border/40 bg-card/10 px-3 py-1.5'>
      <div className='min-w-0 flex-1'>
        <FolderTreeSearchBar
          value={documentSearchQuery}
          onChange={setDocumentSearchQuery}
          placeholder='Search catalogs & files…'
        />
      </div>

      <span className='shrink-0 text-xs text-gray-500'>
        {currentDocRows.length} {currentDocRows.length !== 1 ? 'docs' : 'doc'}
      </span>
    </div>
  );
}

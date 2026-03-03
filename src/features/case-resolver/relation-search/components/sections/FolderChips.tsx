'use client';

import React from 'react';
import { Chip } from '@/shared/ui';
import { useDocumentRelationSearchContext } from '../../context/DocumentRelationSearchContext';

export function FolderChips(): React.JSX.Element | null {
  const { currentFolderPaths, selectedSearchFolderPath, setSelectedSearchFolderPath } =
    useDocumentRelationSearchContext();

  if (currentFolderPaths.length === 0) return null;
  return (
    <div className='flex items-center gap-1.5 overflow-x-auto border-b border-border/40 bg-card/10 px-3 py-1.5 custom-scrollbar'>
      <Chip
        label='All'
        active={selectedSearchFolderPath === null}
        onClick={() => setSelectedSearchFolderPath(null)}
      />
      {currentFolderPaths.map((path) => (
        <Chip
          key={path}
          label={path.split('/').pop() ?? path}
          active={selectedSearchFolderPath === path}
          onClick={() =>
            setSelectedSearchFolderPath(selectedSearchFolderPath === path ? null : path)
          }
          className='shrink-0'
        />
      ))}
    </div>
  );
}

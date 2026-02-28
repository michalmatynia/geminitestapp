'use client';

import React from 'react';
import { cn } from '@/shared/utils';
import { useDocumentRelationSearchContext } from '../../context/DocumentRelationSearchContext';

export function FolderChips(): React.JSX.Element | null {
  const { currentFolderPaths, selectedSearchFolderPath, setSelectedSearchFolderPath } =
    useDocumentRelationSearchContext();

  if (currentFolderPaths.length === 0) return null;
  return (
    <div className='flex items-center gap-1.5 overflow-x-auto border-b border-border/40 bg-card/10 px-3 py-1.5'>
      <button
        type='button'
        onClick={() => setSelectedSearchFolderPath(null)}
        className={cn(
          'shrink-0 rounded border px-2 py-0.5 text-xs transition-colors',
          selectedSearchFolderPath === null
            ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
            : 'border-border/50 text-gray-400 hover:border-border hover:text-gray-200'
        )}
      >
        All
      </button>
      {currentFolderPaths.map((path) => (
        <button
          key={path}
          type='button'
          onClick={() =>
            setSelectedSearchFolderPath(selectedSearchFolderPath === path ? null : path)
          }
          className={cn(
            'shrink-0 rounded border px-2 py-0.5 text-xs transition-colors',
            selectedSearchFolderPath === path
              ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
              : 'border-border/50 text-gray-400 hover:border-border hover:text-gray-200'
          )}
        >
          {path.split('/').pop() ?? path}
        </button>
      ))}
    </div>
  );
}

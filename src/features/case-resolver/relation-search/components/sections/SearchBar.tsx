'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { SearchInput } from '@/shared/ui';
import { useDocumentRelationSearchContext } from '../../context/DocumentRelationSearchContext';

export function SearchBar(): React.JSX.Element {
  const {
    isDrillMode,
    showDocTable,
    drillSignatureLabel,
    documentSearchQuery,
    setDocumentSearchQuery,
    caseSearchQuery,
    setCaseSearchQuery,
    selectedSearchFolderPath,
    setSelectedSearchFolderPath,
    setSelectedDrillCaseId,
    currentDocRows,
  } = useDocumentRelationSearchContext();

  return (
    <div className='flex items-center gap-2 border-b border-border/40 bg-card/10 px-3 py-1.5'>
      {isDrillMode && (
        <button
          type='button'
          className='flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-cyan-300 transition-colors hover:bg-card/60 hover:text-cyan-100'
          onClick={() => {
            setSelectedDrillCaseId(null);
            setDocumentSearchQuery('');
            setSelectedSearchFolderPath(null);
          }}
        >
          <ArrowLeft className='size-3' />
          {drillSignatureLabel}
        </button>
      )}

      <div className='min-w-0 flex-1'>
        {showDocTable ? (
          <SearchInput
            value={documentSearchQuery}
            onChange={(e) => setDocumentSearchQuery(e.target.value)}
            onClear={() => setDocumentSearchQuery('')}
            placeholder={
              isDrillMode ? `Search in ${drillSignatureLabel}...` : 'Search documents...'
            }
            className='h-7 border-border bg-card/60 text-xs text-white'
          />
        ) : (
          <SearchInput
            value={caseSearchQuery}
            onChange={(e) => setCaseSearchQuery(e.target.value)}
            onClear={() => setCaseSearchQuery('')}
            placeholder='Search by Signature ID...'
            className='h-7 border-border bg-card/60 text-xs text-white'
          />
        )}
      </div>

      {showDocTable && selectedSearchFolderPath && (
        <div className='flex shrink-0 items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200'>
          <span className='max-w-[100px] truncate'>{selectedSearchFolderPath}</span>
          <button
            type='button'
            className='ml-1 text-cyan-400 hover:text-cyan-100'
            onClick={() => setSelectedSearchFolderPath(null)}
            aria-label='Clear folder filter'
          >
            ×
          </button>
        </div>
      )}

      {showDocTable && (
        <span className='shrink-0 text-xs text-gray-500'>
          {currentDocRows.length} {currentDocRows.length !== 1 ? 'docs' : 'doc'}
        </span>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { SearchInput, Button, Chip } from '@/shared/ui';
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
        <Button
          variant='ghost'
          size='xs'
          className='flex shrink-0 items-center gap-1 h-7 text-cyan-300 hover:text-cyan-100'
          onClick={() => {
            setSelectedDrillCaseId(null);
            setDocumentSearchQuery('');
            setSelectedSearchFolderPath(null);
          }}
        >
          <ArrowLeft className='size-3' />
          {drillSignatureLabel}
        </Button>
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
        <Chip
          active
          label={selectedSearchFolderPath}
          onClick={() => setSelectedSearchFolderPath(null)}
          icon={X}
          className='max-w-[150px]'
        />
      )}

      {showDocTable && (
        <span className='shrink-0 text-xs text-gray-500'>
          {currentDocRows.length} {currentDocRows.length !== 1 ? 'docs' : 'doc'}
        </span>
      )}
    </div>
  );
}

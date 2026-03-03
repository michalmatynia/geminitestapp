'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import type { DocumentRelationSortMode } from '@/shared/contracts/case-resolver';
import {
  DocumentRelationSearchProvider,
  useDocumentRelationSearchContext,
} from '../context/DocumentRelationSearchContext';
import { type NodeFileDocumentSearchScope } from '../../components/CaseResolverNodeFileUtils';

import { RESULT_HEIGHT_MAP } from './sections/document-relation-search-utils';
import { ScopeBar } from './sections/ScopeBar';
import { FilterBar } from './sections/FilterBar';
import { SearchBar } from './sections/SearchBar';
import { FolderChips } from './sections/FolderChips';
import { BulkActionBar } from './sections/BulkActionBar';
import { DocumentTableBody } from './sections/DocumentTableBody';
import { CaseTableBody } from './sections/CaseTableBody';
import { DocumentPreviewDialog } from './sections/DocumentPreviewDialog';
import {
  DocumentRelationSearchUiProvider,
  type DocumentRelationSearchUiContextValue,
} from './DocumentRelationSearchUiContext';

function DocumentRelationSearchInner(): React.JSX.Element {
  const { showFiltersBar, showDocTable, resultHeight } = useDocumentRelationSearchContext();

  return (
    <>
      <div className='flex flex-col overflow-hidden rounded-md border border-border/60 bg-card/20'>
        <ScopeBar />

        {showFiltersBar && <FilterBar />}

        <SearchBar />

        {showDocTable && <FolderChips />}

        <BulkActionBar />

        <div className={cn('overflow-auto', RESULT_HEIGHT_MAP[resultHeight])}>
          {showDocTable ? <DocumentTableBody /> : <CaseTableBody />}
        </div>
      </div>

      <DocumentPreviewDialog />
    </>
  );
}

export type DocumentRelationSearchPanelProps = {
  draftFileId: string;
  isLocked: boolean;
  onLinkFile: (fileId: string) => void;
  /** Initial scope on first mount (default: 'case_scope') */
  defaultScope?: NodeFileDocumentSearchScope | undefined;
  /** Initial sort mode on first mount (default: 'name_asc') */
  defaultSort?: DocumentRelationSortMode | undefined;
  /** Show sort dropdown (default: true) */
  showSortControl?: boolean | undefined;
  /** Show file-type filter chips (default: true) */
  showFileTypeFilter?: boolean | undefined;
};

export function DocumentRelationSearchPanel({
  draftFileId,
  isLocked,
  onLinkFile,
  defaultScope = 'case_scope',
  defaultSort = 'name_asc',
  showSortControl = true,
  showFileTypeFilter = true,
}: DocumentRelationSearchPanelProps): React.JSX.Element {
  const uiContextValue = React.useMemo(
    (): DocumentRelationSearchUiContextValue => ({
      showSortControl,
      showFileTypeFilter,
    }),
    [showSortControl, showFileTypeFilter]
  );

  return (
    <DocumentRelationSearchProvider
      draftFileId={draftFileId}
      isLocked={isLocked}
      onLinkFile={onLinkFile}
      defaultScope={defaultScope}
      defaultSort={defaultSort}
    >
      <DocumentRelationSearchUiProvider value={uiContextValue}>
        <DocumentRelationSearchInner />
      </DocumentRelationSearchUiProvider>
    </DocumentRelationSearchProvider>
  );
}

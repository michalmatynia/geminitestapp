'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import type {
  DocumentRelationFileTypeFilter,
  DocumentRelationSortMode,
} from '@/shared/contracts/case-resolver';
import {
  DocumentRelationSearchProvider,
  useDocumentRelationSearchContext,
} from '../context/DocumentRelationSearchContext';
import { type NodeFileDocumentSearchScope } from '../../components/CaseResolverNodeFileUtils';

import { RESULT_HEIGHT_MAP } from './sections/document-relation-search-utils';
import { ScopeBar } from './sections/ScopeBar';
import { FilterBar } from './sections/FilterBar';
import { SearchBar } from './sections/SearchBar';
import { BulkActionBar } from './sections/BulkActionBar';
import { DocumentPreviewDialog } from './sections/DocumentPreviewDialog';
import {
  DocumentRelationSearchUiProvider,
  type DocumentRelationSearchUiContextValue,
} from './DocumentRelationSearchUiContext';
import { RelationTreeBrowser } from './RelationTreeBrowser';
import type { RelationTreeInstance } from '../types';

function DocumentRelationSearchInner({
  relationTreeInstance,
}: {
  relationTreeInstance: RelationTreeInstance;
}): React.JSX.Element {
  const {
    showFiltersBar,
    resultHeight,
    relationTreeNodes,
    relationTreeLookup,
    selectedFileIds,
    toggleFileSelection,
    onLinkFile,
    isLocked,
    setPreviewFileId,
    documentSearchQuery,
  } = useDocumentRelationSearchContext();

  return (
    <>
      <div className='flex flex-col overflow-hidden rounded-md border border-border/60 bg-card/20'>
        <ScopeBar />

        {showFiltersBar && <FilterBar />}

        <SearchBar />

        <BulkActionBar />

        <div className={cn('overflow-auto', RESULT_HEIGHT_MAP[resultHeight])}>
          <RelationTreeBrowser
            instance={relationTreeInstance}
            mode='link_relations'
            nodes={relationTreeNodes}
            lookup={relationTreeLookup}
            isLocked={isLocked}
            selectedFileIds={selectedFileIds}
            onToggleFileSelection={toggleFileSelection}
            onLinkFile={(fileId): void => {
              onLinkFile(fileId);
            }}
            onPreviewFile={(fileId): void => {
              setPreviewFileId(fileId);
            }}
            searchQuery={documentSearchQuery}
            emptyLabel='No matching files'
          />
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
  /** Folder-tree instance used by relation browser. */
  relationTreeInstance?: RelationTreeInstance | undefined;
  /** Initial scope on first mount (default: 'case_scope') */
  defaultScope?: NodeFileDocumentSearchScope | undefined;
  /** Initial sort mode on first mount (default: 'name_asc') */
  defaultSort?: DocumentRelationSortMode | undefined;
  /** Initial file type filter on first mount (default: 'all') */
  defaultFileType?: DocumentRelationFileTypeFilter | undefined;
  /** Show sort dropdown (default: true) */
  showSortControl?: boolean | undefined;
  /** Show file-type filter chips (default: true) */
  showFileTypeFilter?: boolean | undefined;
};

export function DocumentRelationSearchPanel({
  draftFileId,
  isLocked,
  onLinkFile,
  relationTreeInstance = 'case_resolver_document_relations',
  defaultScope = 'case_scope',
  defaultSort = 'name_asc',
  defaultFileType = 'all',
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
      defaultFileType={defaultFileType}
    >
      <DocumentRelationSearchUiProvider value={uiContextValue}>
        <DocumentRelationSearchInner relationTreeInstance={relationTreeInstance} />
      </DocumentRelationSearchUiProvider>
    </DocumentRelationSearchProvider>
  );
}

'use client';

import React from 'react';

import type {
  DocumentRelationFileTypeFilter,
  DocumentRelationSortMode,
} from '@/shared/contracts/case-resolver';
import { useFolderTreeProfile } from '@/features/foldertree/public';
import { cn } from '@/shared/utils';
import { resolveFolderTreeSearchConfig } from '@/shared/utils/folder-tree-profiles-v2';

import {
  DocumentRelationSearchRuntimeContext,
  type DocumentRelationSearchRuntimeValue,
  useDocumentRelationSearchRuntime,
} from './DocumentRelationSearchRuntimeContext';
import {
  DocumentRelationSearchUiProvider,
  type DocumentRelationSearchUiContextValue,
} from './DocumentRelationSearchUiContext';
import { RelationTreeBrowser } from './RelationTreeBrowser';
import {
  RelationTreeBrowserRuntimeContext,
  type RelationTreeBrowserRuntimeValue,
} from './RelationTreeBrowserRuntimeContext';
import { BulkActionBar } from './sections/BulkActionBar';
import { DocumentPreviewDialog } from './sections/DocumentPreviewDialog';
import { FilterBar } from './sections/FilterBar';
import { SearchBar } from './sections/SearchBar';
import { type NodeFileDocumentSearchScope } from '../../components/CaseResolverNodeFileUtils';
import {
  DocumentRelationSearchProvider,
  useDocumentRelationSearchActionsContext,
  useDocumentRelationSearchStateContext,
} from '../context/DocumentRelationSearchContext';
import { RESULT_HEIGHT_MAP } from './sections/document-relation-search-utils';
import { ScopeBar } from './sections/ScopeBar';

import type { RelationTreeInstance } from '../types';

function DocumentRelationSearchInner(): React.JSX.Element {
  const { relationTreeInstance } = useDocumentRelationSearchRuntime();
  const {
    showFiltersBar,
    resultHeight,
    relationTreeNodes,
    relationTreeLookup,
    selectedFileIds,
    isLocked,
    documentSearchQuery,
  } = useDocumentRelationSearchStateContext();
  const { toggleFileSelection, onLinkFile, setPreviewFileId, setDocumentSearchQuery } =
    useDocumentRelationSearchActionsContext();
  const relationTreeProfile = useFolderTreeProfile(relationTreeInstance);
  const relationTreeSearchEnabled = React.useMemo(
    (): boolean => resolveFolderTreeSearchConfig(relationTreeProfile).enabled,
    [relationTreeProfile]
  );

  React.useEffect((): void => {
    if (relationTreeSearchEnabled) return;
    if (documentSearchQuery.length === 0) return;
    setDocumentSearchQuery('');
  }, [documentSearchQuery, relationTreeSearchEnabled, setDocumentSearchQuery]);

  const relationTreeBrowserRuntimeValue = React.useMemo(
    (): RelationTreeBrowserRuntimeValue => ({
      instance: relationTreeInstance,
      nodes: relationTreeNodes,
      lookup: relationTreeLookup,
      isLocked,
      selectedFileIds,
      onToggleFileSelection: toggleFileSelection,
      onLinkFile,
      onPreviewFile: setPreviewFileId,
      searchQuery: relationTreeSearchEnabled ? documentSearchQuery : '',
    }),
    [
      documentSearchQuery,
      isLocked,
      onLinkFile,
      relationTreeInstance,
      relationTreeLookup,
      relationTreeNodes,
      relationTreeSearchEnabled,
      selectedFileIds,
      setPreviewFileId,
      toggleFileSelection,
    ]
  );

  return (
    <>
      <div className='flex flex-col overflow-hidden rounded-md border border-border/60 bg-card/20'>
        <ScopeBar />

        {showFiltersBar && <FilterBar />}

        <SearchBar />

        <BulkActionBar />

        <div className={cn('overflow-auto', RESULT_HEIGHT_MAP[resultHeight])}>
          <RelationTreeBrowserRuntimeContext.Provider value={relationTreeBrowserRuntimeValue}>
            <RelationTreeBrowser mode='link_relations' emptyLabel='No matching files' />
          </RelationTreeBrowserRuntimeContext.Provider>
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

export function DocumentRelationSearchPanel(
  props: DocumentRelationSearchPanelProps
): React.JSX.Element {
  const {
    draftFileId,
    isLocked,
    onLinkFile,
    relationTreeInstance = 'case_resolver_document_relations',
    defaultScope = 'case_scope',
    defaultSort = 'name_asc',
    defaultFileType = 'all',
    showSortControl = true,
    showFileTypeFilter = true,
  } = props;

  const uiContextValue = React.useMemo(
    (): DocumentRelationSearchUiContextValue => ({
      showSortControl,
      showFileTypeFilter,
    }),
    [showSortControl, showFileTypeFilter]
  );
  const runtimeValue = React.useMemo(
    (): DocumentRelationSearchRuntimeValue => ({
      relationTreeInstance,
    }),
    [relationTreeInstance]
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
        <DocumentRelationSearchRuntimeContext.Provider value={runtimeValue}>
          <DocumentRelationSearchInner />
        </DocumentRelationSearchRuntimeContext.Provider>
      </DocumentRelationSearchUiProvider>
    </DocumentRelationSearchProvider>
  );
}

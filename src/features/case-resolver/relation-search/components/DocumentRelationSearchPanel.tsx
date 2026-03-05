'use client';

import React from 'react';

import { cn } from '@/shared/utils';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useFolderTreeProfile } from '@/shared/hooks/use-folder-tree-profile';
import { resolveFolderTreeSearchConfig } from '@/shared/utils/folder-tree-profiles-v2';

import type {
  DocumentRelationFileTypeFilter,
  DocumentRelationSortMode,
} from '@/shared/contracts/case-resolver';
import {
  DocumentRelationSearchProvider,
  useDocumentRelationSearchActionsContext,
  useDocumentRelationSearchStateContext,
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

type DocumentRelationSearchRuntimeValue = {
  relationTreeInstance: RelationTreeInstance;
};

const {
  Context: DocumentRelationSearchRuntimeContext,
  useStrictContext: useDocumentRelationSearchRuntime,
} = createStrictContext<DocumentRelationSearchRuntimeValue>({
  hookName: 'useDocumentRelationSearchRuntime',
  providerName: 'DocumentRelationSearchRuntimeProvider',
  displayName: 'DocumentRelationSearchRuntimeContext',
});

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

  return (
    <>
      <div className='flex flex-col overflow-hidden rounded-md border border-border/60 bg-card/20'>
        <ScopeBar />

        {showFiltersBar && <FilterBar />}

        <SearchBar searchEnabled={relationTreeSearchEnabled} />

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
            searchQuery={relationTreeSearchEnabled ? documentSearchQuery : ''}
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

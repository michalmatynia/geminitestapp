'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';

import {
  type CaseResolverFile,
  type ResultHeight,
  type CaseRow,
  type DocumentRelationFileTypeFilter,
  type DocumentRelationSortMode,
} from '@/shared/contracts/case-resolver';

export type { ResultHeight, CaseRow };
import type {
  NodeFileDocumentSearchRow,
  NodeFileDocumentSearchScope,
} from '../../components/CaseResolverNodeFileUtils';
import {
  useCaseResolverViewContext,
  type SelectOption,
} from '../../components/CaseResolverViewContext';
import { useDocumentRelationSearch } from '../hooks/useDocumentRelationSearch';
import type { RelationTreeLookup } from '../types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { logCaseResolverWorkspaceEvent } from '../../workspace-persistence';

export type DocumentSearchScope = NodeFileDocumentSearchScope;

interface DocumentRelationSearchContextType {
  // State from hook
  documentSearchScope: DocumentSearchScope;
  setDocumentSearchScope: (scope: DocumentSearchScope) => void;
  documentSearchQuery: string;
  setDocumentSearchQuery: (query: string) => void;
  fileTypeFilter: DocumentRelationFileTypeFilter;
  setFileTypeFilter: (filter: DocumentRelationFileTypeFilter) => void;
  sortMode: DocumentRelationSortMode;
  setSortMode: (mode: DocumentRelationSortMode) => void;
  dateFrom: string | null;
  setDateFrom: (date: string | null) => void;
  dateTo: string | null;
  setDateTo: (date: string | null) => void;
  tagIdFilter: string | null;
  setTagIdFilter: (id: string | null) => void;
  categoryIdFilter: string | null;
  setCategoryIdFilter: (id: string | null) => void;
  resetFilters: () => void;

  // UI State
  resultHeight: ResultHeight;
  setResultHeight: (height: ResultHeight) => void;
  showFiltersBar: boolean;
  setShowFiltersBar: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFileIds: Set<string>;
  setSelectedFileIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  previewFileId: string | null;
  setPreviewFileId: (id: string | null) => void;

  // Actions
  onLinkFile: (fileId: string) => void;
  isLocked: boolean;
  handleLinkAll: () => Promise<void>;
  selectAllVisible: () => void;
  clearSelection: () => void;
  toggleFileSelection: (id: string) => void;

  // Computed
  caseTagOptions: SelectOption[];
  caseCategoryOptions: SelectOption[];
  documentSearchRows: NodeFileDocumentSearchRow[];
  visibleDocumentSearchRows: NodeFileDocumentSearchRow[];
  currentDocRows: NodeFileDocumentSearchRow[];
  filtersActiveCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  previewRow: NodeFileDocumentSearchRow | null;
  previewFile: CaseResolverFile | null;
  relationTreeNodes: MasterTreeNode[];
  relationTreeLookup: RelationTreeLookup;
}

const DocumentRelationSearchContext = createContext<DocumentRelationSearchContextType | null>(null);
export type DocumentRelationSearchContextValue = DocumentRelationSearchContextType;

export function useDocumentRelationSearchContext(): DocumentRelationSearchContextType {
  const context = useContext(DocumentRelationSearchContext);
  if (!context) {
    throw new Error(
      'useDocumentRelationSearchContext must be used within a DocumentRelationSearchProvider'
    );
  }
  return context;
}

export interface DocumentRelationSearchProviderProps {
  children: React.ReactNode;
  draftFileId: string;
  onLinkFile: (fileId: string) => void;
  isLocked?: boolean;
  defaultScope?: DocumentSearchScope;
  defaultSort?: DocumentRelationSortMode;
  defaultFileType?: DocumentRelationFileTypeFilter;
}

export function DocumentRelationSearchProvider({
  children,
  draftFileId,
  onLinkFile,
  isLocked = false,
  defaultScope,
  defaultSort,
  defaultFileType,
}: DocumentRelationSearchProviderProps): React.JSX.Element {
  const { state } = useCaseResolverViewContext();
  const { workspace, caseResolverIdentifiers, caseResolverTags, caseResolverCategories } = state;
  const draftFile = useMemo(
    () => workspace.files.find((file) => file.id === draftFileId) ?? null,
    [draftFileId, workspace.files]
  );
  const resolvedActiveCaseId = useMemo(() => {
    const activeCaseId = state.activeCaseId?.trim() ?? '';
    if (activeCaseId.length > 0) return activeCaseId;
    const parentCaseId = draftFile?.parentCaseId?.trim() ?? '';
    return parentCaseId.length > 0 ? parentCaseId : null;
  }, [draftFile?.parentCaseId, state.activeCaseId]);

  const [resultHeight, setResultHeight] = useState<ResultHeight>('normal');
  const [showFiltersBar, setShowFiltersBar] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const searchProps = useDocumentRelationSearch({
    workspace,
    activeCaseId: resolvedActiveCaseId,
    caseResolverIdentifiers,
    excludeFileIds: [draftFileId],
    initialScope: defaultScope,
    initialSort: defaultSort,
    initialFileType: defaultFileType,
  });

  const {
    documentSearchScope,
    visibleDocumentSearchRows,
    documentSearchQuery,
    dateFrom,
    dateTo,
    tagIdFilter,
    categoryIdFilter,
    fileTypeFilter,
  } = searchProps;

  // Reset selection when scope or filters change
  useEffect(() => {
    setSelectedFileIds(new Set());
  }, [
    documentSearchScope,
    documentSearchQuery,
    dateFrom,
    dateTo,
    tagIdFilter,
    categoryIdFilter,
    fileTypeFilter,
  ]);

  const currentDocRows = visibleDocumentSearchRows;

  const filtersActiveCount = useMemo(() => {
    let count = 0;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (tagIdFilter) count++;
    if (categoryIdFilter) count++;
    if (fileTypeFilter !== 'all') count++;
    return count;
  }, [dateFrom, dateTo, tagIdFilter, categoryIdFilter, fileTypeFilter]);

  const caseTagOptions = useMemo(
    () => caseResolverTags.map((t) => ({ value: t.id, label: t.label })),
    [caseResolverTags]
  );
  const caseCategoryOptions = useMemo(
    () => caseResolverCategories.map((c) => ({ value: c.id, label: c.name })),
    [caseResolverCategories]
  );

  const selectAllVisible = useCallback(() => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      currentDocRows.forEach((row) => next.add(row.file.id));
      return next;
    });
  }, [currentDocRows]);

  const clearSelection = useCallback(() => {
    setSelectedFileIds(new Set());
  }, []);

  const toggleFileSelection = useCallback((id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allVisibleSelected =
    currentDocRows.length > 0 && currentDocRows.every((r) => selectedFileIds.has(r.file.id));
  const someVisibleSelected = !allVisibleSelected && currentDocRows.some((r) => selectedFileIds.has(r.file.id));

  const handleLinkAll = useCallback(async () => {
    if (selectedFileIds.size === 0) return;
    const ids = Array.from(selectedFileIds);
    logCaseResolverWorkspaceEvent({
      source: 'document_relation_search',
      action: 'relation_tree_bulk_link_applied',
      message: `count=${ids.length}`,
    });
    for (const id of ids) {
      onLinkFile(id);
    }
    clearSelection();
  }, [selectedFileIds, onLinkFile, clearSelection]);

  const previewRow = useMemo(
    () => (previewFileId ? (currentDocRows.find((r) => r.file.id === previewFileId) ?? null) : null),
    [currentDocRows, previewFileId]
  );
  const previewFile = previewRow?.file ?? null;

  const value = useMemo(
    () => ({
      ...searchProps,
      resultHeight,
      setResultHeight,
      showFiltersBar,
      setShowFiltersBar,
      selectedFileIds,
      setSelectedFileIds,
      previewFileId,
      setPreviewFileId,
      onLinkFile,
      isLocked,
      caseTagOptions,
      caseCategoryOptions,
      currentDocRows,
      filtersActiveCount,
      selectAllVisible,
      clearSelection,
      toggleFileSelection,
      handleLinkAll,
      allVisibleSelected,
      someVisibleSelected,
      previewRow,
      previewFile,
      relationTreeNodes: searchProps.relationTreeNodes,
      relationTreeLookup: searchProps.relationTreeLookup,
    }),
    [
      searchProps,
      resultHeight,
      showFiltersBar,
      selectedFileIds,
      previewFileId,
      onLinkFile,
      isLocked,
      caseTagOptions,
      caseCategoryOptions,
      currentDocRows,
      filtersActiveCount,
      selectAllVisible,
      clearSelection,
      toggleFileSelection,
      handleLinkAll,
      allVisibleSelected,
      someVisibleSelected,
      previewRow,
      previewFile,
      searchProps.relationTreeNodes,
      searchProps.relationTreeLookup,
    ]
  );

  return (
    <DocumentRelationSearchContext.Provider value={value}>
      {children}
    </DocumentRelationSearchContext.Provider>
  );
}

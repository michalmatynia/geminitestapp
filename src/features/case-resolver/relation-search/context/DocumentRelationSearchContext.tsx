'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import type { NodeFileDocumentSearchRow, NodeFileDocumentSearchScope } from '../../components/CaseResolverNodeFileUtils';
import { useCaseResolverViewContext, type SelectOption } from '../../components/CaseResolverViewContext';
import {
  useDocumentRelationSearch,
  type DocumentRelationFileTypeFilter,
  type DocumentRelationSortMode,
} from '../hooks/useDocumentRelationSearch';
import { normalizeSearchText } from '../../components/CaseResolverNodeFileUtils';

export type ResultHeight = 'compact' | 'normal' | 'expanded';

export type CaseRow = {
  file: Pick<CaseResolverFile, 'id' | 'name' | 'caseStatus'>;
  signatureLabel: string;
  docCount: number;
};

export interface DocumentRelationSearchContextValue {
  // Config & Props
  draftFileId: string;
  isLocked: boolean;
  onLinkFile: (fileId: string) => void;
  
  // Search State
  documentSearchScope: NodeFileDocumentSearchScope;
  setDocumentSearchScope: (s: NodeFileDocumentSearchScope) => void;
  documentSearchQuery: string;
  setDocumentSearchQuery: (q: string) => void;
  selectedSearchFolderPath: string | null;
  setSelectedSearchFolderPath: (p: string | null) => void;
  caseSearchQuery: string;
  setCaseSearchQuery: (q: string) => void;
  selectedDrillCaseId: string | null;
  setSelectedDrillCaseId: (id: string | null) => void;
  fileTypeFilter: DocumentRelationFileTypeFilter;
  setFileTypeFilter: (f: DocumentRelationFileTypeFilter) => void;
  sortMode: DocumentRelationSortMode;
  setSortMode: (m: DocumentRelationSortMode) => void;
  
  // Filter options (from workspace context)
  caseTagOptions: SelectOption[];
  caseCategoryOptions: SelectOption[];

  // Advanced Filter State
  dateFrom: string | null;
  setDateFrom: (v: string | null) => void;
  dateTo: string | null;
  setDateTo: (v: string | null) => void;
  tagIdFilter: string | null;
  setTagIdFilter: (v: string | null) => void;
  categoryIdFilter: string | null;
  setCategoryIdFilter: (v: string | null) => void;
  resetFilters: () => void;
  showFiltersBar: boolean;
  setShowFiltersBar: React.Dispatch<React.SetStateAction<boolean>>;
  filtersActiveCount: number;
  
  // UI State
  resultHeight: ResultHeight;
  setResultHeight: (h: ResultHeight) => void;
  selectedFileIds: Set<string>;
  setSelectedFileIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  previewFileId: string | null;
  setPreviewFileId: (id: string | null) => void;
  
  // Derived Data
  isCurrentCase: boolean;
  isAllCases: boolean;
  isDrillMode: boolean;
  showDocTable: boolean;
  documentSearchRows: NodeFileDocumentSearchRow[];
  visibleDocumentSearchRows: NodeFileDocumentSearchRow[];
  visibleDrillRows: NodeFileDocumentSearchRow[];
  currentDocRows: NodeFileDocumentSearchRow[];
  visibleCaseRows: CaseRow[];
  currentFolderPaths: string[];
  drillSignatureLabel: string;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  previewFile: CaseResolverFile | null;
  previewRow: NodeFileDocumentSearchRow | null;
  
  // Handlers
  toggleFileSelection: (fileId: string) => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
  handleLinkAll: () => void;
}

const DocumentRelationSearchContext = createContext<DocumentRelationSearchContextValue | null>(null);

export function useDocumentRelationSearchContext(): DocumentRelationSearchContextValue {
  const context = useContext(DocumentRelationSearchContext);
  if (!context) {
    throw new Error('useDocumentRelationSearchContext must be used within DocumentRelationSearchProvider');
  }
  return context;
}

export type DocumentRelationSearchProviderProps = {
  children: React.ReactNode;
  draftFileId: string;
  isLocked: boolean;
  onLinkFile: (fileId: string) => void;
  defaultScope?: NodeFileDocumentSearchScope;
  defaultSort?: DocumentRelationSortMode;
};

export function DocumentRelationSearchProvider({
  children,
  draftFileId,
  isLocked,
  onLinkFile,
  defaultScope = 'case_scope',
  defaultSort = 'name_asc',
}: DocumentRelationSearchProviderProps): React.JSX.Element {
  const { state, caseTagOptions, caseCategoryOptions } = useCaseResolverViewContext();
  const { workspace, activeCaseId, caseResolverIdentifiers } = state;

  // ── Persisted preferences (SSR-safe, read-once on mount) ────────────────────
  const savedPrefs = useMemo((): { scope?: string; sort?: string } => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('cr-relation-search-prefs') ?? '{}') as {
        scope?: string;
        sort?: string;
      };
    } catch {
      return {};
    }
  }, []);

  const resolvedInitialScope =
    (savedPrefs.scope as NodeFileDocumentSearchScope | undefined) ?? defaultScope;
  const resolvedInitialSort =
    (savedPrefs.sort as DocumentRelationSortMode | undefined) ?? defaultSort;

  const originalFile = workspace.files.find((f) => f.id === draftFileId);
  const excludeFileIds = useMemo(
    () => [draftFileId, ...(originalFile?.relatedFileIds ?? [])],
    [draftFileId, originalFile?.relatedFileIds]
  );

  const search = useDocumentRelationSearch({
    workspace,
    activeCaseId,
    caseResolverIdentifiers,
    excludeFileIds,
    initialScope: resolvedInitialScope,
    initialSort: resolvedInitialSort,
  });

  const [resultHeight, setResultHeight] = useState<ResultHeight>('normal');
  const [showFiltersBar, setShowFiltersBar] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  // Persist scope + sort to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      'cr-relation-search-prefs',
      JSON.stringify({ scope: search.documentSearchScope, sort: search.sortMode })
    );
  }, [search.documentSearchScope, search.sortMode]);

  // Clear selection on scope or drill change
  useEffect(() => {
    setSelectedFileIds(new Set());
  }, [search.documentSearchScope]);

  useEffect(() => {
    setSelectedFileIds(new Set());
  }, [search.selectedDrillCaseId]);

  // Derived booleans
  const isCurrentCase = search.documentSearchScope === 'case_scope';
  const isAllCases = search.documentSearchScope === 'all_cases';
  const isDrillMode = isAllCases && search.selectedDrillCaseId !== null;
  const showDocTable = isCurrentCase || isDrillMode;

  // Drill rows
  const drillRows = useMemo((): NodeFileDocumentSearchRow[] => {
    if (!search.selectedDrillCaseId) return [];
    return search.documentSearchRows.filter(
      (row) => row.file.parentCaseId === search.selectedDrillCaseId
    );
  }, [search.documentSearchRows, search.selectedDrillCaseId]);

  const visibleDrillRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const q = normalizeSearchText(search.documentSearchQuery);
    const rows = q
      ? drillRows.filter((row) => row.searchable.includes(q))
      : [...drillRows];
    if (search.sortMode === 'name_asc') rows.sort((a, b) => a.file.name.localeCompare(b.file.name));
    else if (search.sortMode === 'folder_asc')
      rows.sort((a, b) => a.folderPath.localeCompare(b.folderPath));
    else if (search.sortMode === 'date_desc')
      rows.sort((a, b) =>
        (b.file.documentDate?.isoDate ?? '').localeCompare(a.file.documentDate?.isoDate ?? '')
      );
    else if (search.sortMode === 'date_asc')
      rows.sort((a, b) =>
        (a.file.documentDate?.isoDate ?? '').localeCompare(b.file.documentDate?.isoDate ?? '')
      );
    return rows;
  }, [drillRows, search.documentSearchQuery, search.sortMode]);

  // Folder chips
  const topLevelFolderPaths = useMemo(
    () => search.folderTree.childPathsByParent.get(null) ?? [],
    [search.folderTree]
  );

  const drillTopLevelFolderPaths = useMemo((): string[] => {
    if (!search.selectedDrillCaseId) return [];
    const seen = new Set<string>();
    drillRows.forEach((row) => {
      const top = row.folderSegments[0];
      if (top) seen.add(top);
    });
    return Array.from(seen).sort();
  }, [drillRows, search.selectedDrillCaseId]);

  // Drill case label
  const drillSignatureLabel = useMemo((): string => {
    if (!search.selectedDrillCaseId) return '';
    const caseRow = search.visibleCaseRows.find((r) => r.file.id === search.selectedDrillCaseId);
    if (caseRow) return caseRow.signatureLabel || caseRow.file.name;
    const anyRow = search.documentSearchRows.find((r) => r.file.parentCaseId === search.selectedDrillCaseId);
    return anyRow?.signatureLabel ?? search.selectedDrillCaseId;
  }, [search.selectedDrillCaseId, search.visibleCaseRows, search.documentSearchRows]);

  const currentFolderPaths = isDrillMode ? drillTopLevelFolderPaths : topLevelFolderPaths;
  const currentDocRows = isDrillMode ? visibleDrillRows : search.visibleDocumentSearchRows;

  // Filters active count
  const filtersActiveCount = useMemo(() => {
    let n = 0;
    if (search.dateFrom !== null) n++;
    if (search.dateTo !== null) n++;
    if (search.tagIdFilter !== null) n++;
    if (search.categoryIdFilter !== null) n++;
    return n;
  }, [search.dateFrom, search.dateTo, search.tagIdFilter, search.categoryIdFilter]);

  // Multi-select helpers
  const toggleFileSelection = React.useCallback((fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const selectAllVisible = React.useCallback(() => {
    setSelectedFileIds(new Set(currentDocRows.map((r) => r.file.id)));
  }, [currentDocRows]);

  const clearSelection = React.useCallback(() => setSelectedFileIds(new Set()), []);

  const handleLinkAll = React.useCallback(() => {
    selectedFileIds.forEach((id) => onLinkFile(id));
    clearSelection();
  }, [selectedFileIds, onLinkFile, clearSelection]);

  // Preview resolution
  const previewFile = useMemo(
    () => (previewFileId ? workspace.files.find((f) => f.id === previewFileId) ?? null : null),
    [previewFileId, workspace.files]
  );
  const previewRow = useMemo(
    () =>
      previewFileId
        ? search.documentSearchRows.find((r) => r.file.id === previewFileId) ?? null
        : null,
    [previewFileId, search.documentSearchRows]
  );

  // Header checkbox state
  const allVisibleSelected =
    currentDocRows.length > 0 &&
    currentDocRows.every((r) => selectedFileIds.has(r.file.id));
  const someVisibleSelected =
    currentDocRows.some((r) => selectedFileIds.has(r.file.id)) && !allVisibleSelected;

  const value = useMemo((): DocumentRelationSearchContextValue => ({
    draftFileId,
    isLocked,
    onLinkFile,
    caseTagOptions,
    caseCategoryOptions,
    ...search,
    showFiltersBar,
    setShowFiltersBar,
    filtersActiveCount,
    resultHeight,
    setResultHeight,
    selectedFileIds,
    setSelectedFileIds,
    previewFileId,
    setPreviewFileId,
    isCurrentCase,
    isAllCases,
    isDrillMode,
    showDocTable,
    visibleDrillRows,
    currentDocRows,
    currentFolderPaths,
    drillSignatureLabel,
    allVisibleSelected,
    someVisibleSelected,
    previewFile,
    previewRow,
    toggleFileSelection,
    selectAllVisible,
    clearSelection,
    handleLinkAll,
  }), [
    draftFileId,
    isLocked,
    onLinkFile,
    caseTagOptions,
    caseCategoryOptions,
    search,
    showFiltersBar,
    filtersActiveCount,
    resultHeight,
    selectedFileIds,
    previewFileId,
    isCurrentCase,
    isAllCases,
    isDrillMode,
    showDocTable,
    visibleDrillRows,
    currentDocRows,
    currentFolderPaths,
    drillSignatureLabel,
    allVisibleSelected,
    someVisibleSelected,
    previewFile,
    previewRow,
    toggleFileSelection,
    selectAllVisible,
    clearSelection,
    handleLinkAll,
  ]);

  return (
    <DocumentRelationSearchContext.Provider value={value}>
      {children}
    </DocumentRelationSearchContext.Provider>
  );
}

'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  CaseResolverFile,
  CaseResolverIdentifier,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import {
  collectScopedCaseIds,
  normalizeFolderPathSegments,
  resolveIdentifierSearchLabel,
  resolvePartyReferenceSearchLabel,
  normalizeSearchText,
  isFolderPathWithinScope,
  type NodeFileDocumentSearchRow,
  type NodeFileDocumentFolderTree,
  type NodeFileDocumentFolderNode,
  type NodeFileDocumentSearchScope,
} from '../../components/CaseResolverNodeFileUtils';

export type DocumentRelationFileTypeFilter = 'all' | 'document' | 'scanfile';
export type DocumentRelationSortMode = 'name_asc' | 'date_desc' | 'date_asc' | 'folder_asc';

export type UseDocumentRelationSearchProps = {
  workspace: CaseResolverWorkspace;
  activeCaseId: string | null;
  caseResolverIdentifiers: CaseResolverIdentifier[];
  /** IDs to exclude from results: the current document + already-linked files */
  excludeFileIds: string[];
  /** Initial scope, applied only on first mount */
  initialScope?: NodeFileDocumentSearchScope;
  /** Initial sort mode, applied only on first mount */
  initialSort?: DocumentRelationSortMode;
};

export function useDocumentRelationSearch({
  workspace,
  activeCaseId,
  caseResolverIdentifiers,
  excludeFileIds,
  initialScope = 'case_scope',
  initialSort = 'name_asc',
}: UseDocumentRelationSearchProps) {
  const [documentSearchScope, setDocumentSearchScope] =
    useState<NodeFileDocumentSearchScope>(initialScope);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [selectedSearchFolderPath, setSelectedSearchFolderPath] = useState<string | null>(null);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [selectedDrillCaseId, setSelectedDrillCaseId] = useState<string | null>(null);
  const [fileTypeFilter, setFileTypeFilter] = useState<DocumentRelationFileTypeFilter>('all');
  const [sortMode, setSortMode] = useState<DocumentRelationSortMode>(initialSort);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [tagIdFilter, setTagIdFilter] = useState<string | null>(null);
  const [categoryIdFilter, setCategoryIdFilter] = useState<string | null>(null);

  const excludeSet = useMemo(() => new Set(excludeFileIds), [excludeFileIds]);

  const caseIdentifierLabelById = useMemo((): Map<string, string> => {
    const labelsById = new Map<string, string>();
    caseResolverIdentifiers.forEach((identifier: CaseResolverIdentifier): void => {
      const id = identifier.id;
      const resolvedLabel = identifier.label || identifier.name || id;
      labelsById.set(id, resolvedLabel);
    });
    return labelsById;
  }, [caseResolverIdentifiers]);

  const scopedCaseIds = useMemo(
    (): Set<string> | null => collectScopedCaseIds(workspace.files, activeCaseId),
    [activeCaseId, workspace.files]
  );

  const allSearchableFiles = useMemo(
    (): CaseResolverFile[] =>
      workspace.files.filter((file: CaseResolverFile): boolean => {
        if (file.fileType === 'case') return false;
        if (excludeSet.has(file.id)) return false;
        if (fileTypeFilter === 'document') return file.fileType === 'document';
        if (fileTypeFilter === 'scanfile') return file.fileType === 'scanfile';
        if (dateFrom !== null && file.documentDate?.isoDate) {
          if (file.documentDate.isoDate < dateFrom) return false;
        }
        if (dateTo !== null && file.documentDate?.isoDate) {
          if (file.documentDate.isoDate > dateTo) return false;
        }
        if (tagIdFilter !== null && (file.tagId ?? null) !== tagIdFilter) return false;
        if (categoryIdFilter !== null && (file.categoryId ?? null) !== categoryIdFilter)
          return false;
        return true;
      }),
    [workspace.files, excludeSet, fileTypeFilter, dateFrom, dateTo, tagIdFilter, categoryIdFilter]
  );

  const caseScopedSearchableFiles = useMemo((): CaseResolverFile[] => {
    if (!activeCaseId || !scopedCaseIds || scopedCaseIds.size === 0) {
      return allSearchableFiles;
    }
    return allSearchableFiles.filter((file: CaseResolverFile): boolean =>
      Boolean(file.parentCaseId && scopedCaseIds.has(file.parentCaseId))
    );
  }, [activeCaseId, allSearchableFiles, scopedCaseIds]);

  const documentSearchRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const sourceFiles =
      documentSearchScope === 'all_cases' ? allSearchableFiles : caseScopedSearchableFiles;
    return sourceFiles.map((file: CaseResolverFile): NodeFileDocumentSearchRow => {
      const folderPath = typeof file.folder === 'string' ? file.folder.trim() : '';
      const folderSegments = normalizeFolderPathSegments(folderPath);
      const signatureLabel = resolveIdentifierSearchLabel(
        file.caseIdentifierId,
        caseIdentifierLabelById
      );
      const addresserLabel = resolvePartyReferenceSearchLabel(file.addresser);
      const addresseeLabel = resolvePartyReferenceSearchLabel(file.addressee);
      const searchable = normalizeSearchText(
        [file.name, file.folder, signatureLabel, addresserLabel, addresseeLabel].join(' ')
      );
      return {
        file,
        signatureLabel,
        addresserLabel,
        addresseeLabel,
        folderPath,
        folderSegments,
        searchable,
      };
    });
  }, [allSearchableFiles, caseIdentifierLabelById, caseScopedSearchableFiles, documentSearchScope]);

  const folderScopedDocumentSearchRows = useMemo((): NodeFileDocumentSearchRow[] => {
    if (selectedSearchFolderPath === null) return documentSearchRows;
    return documentSearchRows.filter((row: NodeFileDocumentSearchRow): boolean =>
      isFolderPathWithinScope(row.folderPath, selectedSearchFolderPath)
    );
  }, [documentSearchRows, selectedSearchFolderPath]);

  const filteredVisibleDocumentSearchRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const query = normalizeSearchText(documentSearchQuery);
    if (!query) return folderScopedDocumentSearchRows;
    return folderScopedDocumentSearchRows.filter((row: NodeFileDocumentSearchRow): boolean =>
      row.searchable.includes(query)
    );
  }, [documentSearchQuery, folderScopedDocumentSearchRows]);

  const visibleDocumentSearchRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const rows = [...filteredVisibleDocumentSearchRows];
    if (sortMode === 'name_asc') {
      rows.sort((a, b) => a.file.name.localeCompare(b.file.name));
    } else if (sortMode === 'folder_asc') {
      rows.sort((a, b) => a.folderPath.localeCompare(b.folderPath));
    } else if (sortMode === 'date_desc') {
      rows.sort((a, b) =>
        (b.file.documentDate?.isoDate ?? '').localeCompare(a.file.documentDate?.isoDate ?? '')
      );
    } else if (sortMode === 'date_asc') {
      rows.sort((a, b) =>
        (a.file.documentDate?.isoDate ?? '').localeCompare(b.file.documentDate?.isoDate ?? '')
      );
    }
    return rows;
  }, [filteredVisibleDocumentSearchRows, sortMode]);

  const folderTree = useMemo((): NodeFileDocumentFolderTree => {
    const nodesByPath = new Map<string, NodeFileDocumentFolderNode>();
    const childPathsByParent = new Map<string | null, string[]>();
    let rootFileCount = 0;

    documentSearchRows.forEach((row: NodeFileDocumentSearchRow): void => {
      if (!row.folderPath) {
        rootFileCount += 1;
        return;
      }
      let currentPath = '';
      row.folderSegments.forEach((segment: string, index: number): void => {
        const parentPath = currentPath || null;
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        if (!nodesByPath.has(currentPath)) {
          nodesByPath.set(currentPath, {
            path: currentPath,
            name: segment,
            parentPath,
            depth: index,
            directFileCount: 0,
            descendantFileCount: 0,
          });
          const siblings = childPathsByParent.get(parentPath) ?? [];
          siblings.push(currentPath);
          childPathsByParent.set(parentPath, siblings);
        }
        const node = nodesByPath.get(currentPath)!;
        node.descendantFileCount += 1;
        if (index === row.folderSegments.length - 1) {
          node.directFileCount += 1;
        }
      });
    });

    childPathsByParent.forEach((paths: string[]): void => {
      paths.sort((a: string, b: string): number =>
        nodesByPath.get(a)!.name.localeCompare(nodesByPath.get(b)!.name)
      );
    });

    return { nodesByPath, childPathsByParent, rootFileCount };
  }, [documentSearchRows]);

  const visibleCaseRows = useMemo(() => {
    const query = normalizeSearchText(caseSearchQuery);
    const caseFiles = workspace.files.filter(
      (f: CaseResolverFile): boolean => f.fileType === 'case'
    );
    return caseFiles
      .map((caseFile: CaseResolverFile) => ({
        file: caseFile,
        signatureLabel: resolveIdentifierSearchLabel(
          caseFile.caseIdentifierId,
          caseIdentifierLabelById
        ),
        docCount: workspace.files.filter(
          (f: CaseResolverFile): boolean =>
            f.parentCaseId === caseFile.id && !excludeSet.has(f.id) && f.fileType !== 'case'
        ).length,
      }))
      .filter(
        (row): boolean =>
          !query || normalizeSearchText(row.signatureLabel + ' ' + row.file.name).includes(query)
      );
  }, [caseSearchQuery, workspace.files, caseIdentifierLabelById, excludeSet]);

  const resetFilters = useCallback((): void => {
    setFileTypeFilter('all');
    setDateFrom(null);
    setDateTo(null);
    setTagIdFilter(null);
    setCategoryIdFilter(null);
  }, []);

  return {
    // State
    documentSearchScope,
    setDocumentSearchScope,
    documentSearchQuery,
    setDocumentSearchQuery,
    selectedSearchFolderPath,
    setSelectedSearchFolderPath,
    caseSearchQuery,
    setCaseSearchQuery,
    selectedDrillCaseId,
    setSelectedDrillCaseId,
    fileTypeFilter,
    setFileTypeFilter,
    sortMode,
    setSortMode,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    tagIdFilter,
    setTagIdFilter,
    categoryIdFilter,
    setCategoryIdFilter,
    resetFilters,
    // Computed
    caseIdentifierLabelById,
    documentSearchRows,
    folderScopedDocumentSearchRows,
    visibleDocumentSearchRows,
    folderTree,
    visibleCaseRows,
    totalRowCount: documentSearchRows.length,
  };
}

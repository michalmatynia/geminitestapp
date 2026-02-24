'use client';

import { useDeferredValue, useEffect, useMemo, useState, useCallback } from 'react';
import { useAdminCaseResolverCases } from '../context/AdminCaseResolverCasesContext';
import { 
  buildCaseTree, 
  buildPathLabelMap, 
  CaseFileComparator, 
  CaseTreeNode, 
  IndexedCaseRow, 
  stripHtml 
} from '../pages/AdminCaseResolverCasesUtils';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

const CASE_RESOLVER_VISIBLE_CASE_ROOT_BATCH_SIZE = 40;

export function useAdminCaseResolverCasesState() {
  const context = useAdminCaseResolverCases();
  const {
    workspace,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    caseSearchQuery,
    caseSearchScope,
    caseFileTypeFilter,
    caseFilterTagIds,
    caseFilterCaseIdentifierIds,
    caseFilterCategoryIds,
    caseFilterFolder,
    caseSortBy,
    caseSortOrder,
    caseViewMode,
  } = context;

  const files = useMemo(
    () =>
      workspace.files
        .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
        .sort((left: CaseResolverFile, right: CaseResolverFile) => {
          if (left.folder !== right.folder) {
            return left.folder.localeCompare(right.folder);
          }
          return left.name.localeCompare(right.name);
        }),
    [workspace.files],
  );

  const filesById = useMemo(
    () =>
      new Map<string, CaseResolverFile>(
        files.map((file: CaseResolverFile) => [file.id, file]),
      ),
    [files],
  );

  const caseTagById = useMemo(
    (): Map<string, typeof caseResolverTags[0]> =>
      new Map<string, typeof caseResolverTags[0]>(
        caseResolverTags.map((tag) => [tag.id, tag]),
      ),
    [caseResolverTags],
  );
  const caseIdentifierById = useMemo(
    (): Map<string, typeof caseResolverIdentifiers[0]> =>
      new Map<string, typeof caseResolverIdentifiers[0]>(
        caseResolverIdentifiers.map((identifier) => [identifier.id, identifier]),
      ),
    [caseResolverIdentifiers],
  );
  const caseCategoryById = useMemo(
    (): Map<string, typeof caseResolverCategories[0]> =>
      new Map<string, typeof caseResolverCategories[0]>(
        caseResolverCategories.map((category) => [category.id, category]),
      ),
    [caseResolverCategories],
  );

  const caseTagPathById = useMemo(
    () => buildPathLabelMap(caseResolverTags.map(t => ({ ...t, name: t.label || t.id, parentId: t.parentId ?? null }))),
    [caseResolverTags],
  );
  const caseIdentifierPathById = useMemo(
    () => buildPathLabelMap(caseResolverIdentifiers.map(i => ({ ...i, name: i.name || i.label || i.id, parentId: i.parentId ?? null }))),
    [caseResolverIdentifiers],
  );
  const caseCategoryPathById = useMemo(
    () => buildPathLabelMap(caseResolverCategories.map(c => ({ ...c, name: c.name || c.id, parentId: c.parentId ?? null }))),
    [caseResolverCategories],
  );

  const caseTagFilterOptions = useMemo(
    () =>
      caseResolverTags.map((tag) => ({
        value: tag.id,
        label: caseTagPathById.get(tag.id) || tag.label || tag.id,
      })),
    [caseResolverTags, caseTagPathById],
  );
  const caseCategoryFilterOptions = useMemo(
    () =>
      caseResolverCategories.map((category) => ({
        value: category.id,
        label: caseCategoryPathById.get(category.id) || category.name || category.id,
      })),
    [caseResolverCategories, caseCategoryPathById],
  );
  const caseIdentifierFilterOptions = useMemo(
    () =>
      caseResolverIdentifiers.map((identifier) => ({
        value: identifier.id,
        label: caseIdentifierPathById.get(identifier.id) || identifier.name || identifier.label || identifier.id,
      })),
    [caseIdentifierPathById, caseResolverIdentifiers],
  );

  const folderFilterOptions = useMemo(() => {
    const folders = Array.from(
      new Set(
        files
          .map((file: CaseResolverFile): string => file.folder)
          .filter((folder: string): boolean => folder.trim() !== ''),
      ),
    ).sort((left: string, right: string): number => left.localeCompare(right));
    return [
      { value: '__all__', label: 'All folders' },
      ...folders.map((folder: string) => ({ value: folder, label: folder })),
    ];
  }, [files]);

  const caseSortComparator = useMemo<CaseFileComparator>(
    () =>
      (left: CaseResolverFile, right: CaseResolverFile): number => {
        const factor = caseSortOrder === 'asc' ? 1 : -1;
        let delta: number;
        if (caseSortBy === 'name') {
          delta = left.name.localeCompare(right.name);
        } else if (caseSortBy === 'created') {
          const leftCreatedAt = Date.parse(left.createdAt ?? '');
          const rightCreatedAt = Date.parse(right.createdAt ?? '');
          delta =
            (Number.isNaN(leftCreatedAt) ? 0 : leftCreatedAt) -
            (Number.isNaN(rightCreatedAt) ? 0 : rightCreatedAt);
        } else {
          const leftUpdatedAt = Date.parse(left.updatedAt ?? '');
          const rightUpdatedAt = Date.parse(right.updatedAt ?? '');
          delta =
            (Number.isNaN(leftUpdatedAt) ? 0 : leftUpdatedAt) -
            (Number.isNaN(rightUpdatedAt) ? 0 : rightUpdatedAt);
        }

        if (delta === 0) {
          delta = left.name.localeCompare(right.name);
        }
        if (delta === 0) {
          delta = left.id.localeCompare(right.id);
        }

        return delta * factor;
      },
    [caseSortBy, caseSortOrder],
  );

  const deferredCaseSearchQuery = useDeferredValue(caseSearchQuery);
  const indexedCases = useMemo(
    (): IndexedCaseRow[] =>
      files.map(
        (file: CaseResolverFile): IndexedCaseRow => ({
          file,
          normalizedName: file.name.toLowerCase(),
          normalizedFolder: file.folder.toLowerCase(),
          normalizedContent: (file.documentContentPlainText.trim().length > 0
            ? file.documentContentPlainText
            : stripHtml(file.documentContent)
          ).toLowerCase(),
          normalizedTag: (file.tagId
            ? (caseTagPathById.get(file.tagId) ?? '')
            : ''
          ).toLowerCase(),
          normalizedCaseIdentifier: (file.caseIdentifierId
            ? (caseIdentifierPathById.get(file.caseIdentifierId) ?? '')
            : ''
          ).toLowerCase(),
          normalizedCategory: (file.categoryId
            ? (caseCategoryPathById.get(file.categoryId) ?? '')
            : ''
          ).toLowerCase(),
        }),
      ),
    [caseCategoryPathById, caseIdentifierPathById, caseTagPathById, files],
  );

  const filteredCases = useMemo((): CaseResolverFile[] => {
    const normalizedQuery = deferredCaseSearchQuery.trim().toLowerCase();
    const caseFilterTagIdSet = new Set(caseFilterTagIds);
    const caseFilterCaseIdentifierIdSet = new Set(caseFilterCaseIdentifierIds);
    const caseFilterCategoryIdSet = new Set(caseFilterCategoryIds);

    const matchesSearch = (row: IndexedCaseRow): boolean => {
      if (!normalizedQuery) return true;
      if (caseSearchScope === 'name')
        return row.normalizedName.includes(normalizedQuery);
      if (caseSearchScope === 'folder')
        return row.normalizedFolder.includes(normalizedQuery);
      if (caseSearchScope === 'content')
        return row.normalizedContent.includes(normalizedQuery);
      return (
        row.normalizedName.includes(normalizedQuery) ||
        row.normalizedFolder.includes(normalizedQuery) ||
        row.normalizedContent.includes(normalizedQuery) ||
        row.normalizedTag.includes(normalizedQuery) ||
        row.normalizedCaseIdentifier.includes(normalizedQuery) ||
        row.normalizedCategory.includes(normalizedQuery)
      );
    };

    return indexedCases
      .filter((row: IndexedCaseRow): boolean => {
        if (
          caseFileTypeFilter !== 'all' &&
          row.file.fileType !== caseFileTypeFilter
        )
          return false;
        if (
          caseFilterFolder !== '__all__' &&
          row.file.folder !== caseFilterFolder
        )
          return false;
        if (
          caseFilterTagIdSet.size > 0 &&
          (!row.file.tagId || !caseFilterTagIdSet.has(row.file.tagId))
        )
          return false;
        if (
          caseFilterCaseIdentifierIdSet.size > 0 &&
          (!row.file.caseIdentifierId ||
            !caseFilterCaseIdentifierIdSet.has(row.file.caseIdentifierId))
        ) {
          return false;
        }
        if (
          caseFilterCategoryIdSet.size > 0 &&
          (!row.file.categoryId ||
            !caseFilterCategoryIdSet.has(row.file.categoryId))
        ) {
          return false;
        }
        return matchesSearch(row);
      })
      .map((row: IndexedCaseRow): CaseResolverFile => row.file)
      .sort(caseSortComparator);
  }, [
    caseFileTypeFilter,
    caseFilterCaseIdentifierIds,
    caseFilterCategoryIds,
    caseFilterFolder,
    caseFilterTagIds,
    deferredCaseSearchQuery,
    caseSearchScope,
    caseSortComparator,
    indexedCases,
  ]);

  const filteredCaseTree = useMemo((): CaseTreeNode[] => {
    if (filteredCases.length === 0) return [];
    const includedIds = new Set<string>();

    filteredCases.forEach((file: CaseResolverFile): void => {
      let current: CaseResolverFile | undefined = file;
      while (current) {
        if (includedIds.has(current.id)) break;
        includedIds.add(current.id);
        current = current.parentCaseId
          ? filesById.get(current.parentCaseId)
          : undefined;
      }
    });

    const treeFiles = files.filter((file: CaseResolverFile): boolean =>
      includedIds.has(file.id),
    );
    return buildCaseTree(treeFiles, caseSortComparator);
  }, [caseSortComparator, filteredCases, files, filesById]);

  const flatCaseNodes = useMemo(
    (): CaseTreeNode[] =>
      filteredCases.map(
        (file: CaseResolverFile): CaseTreeNode => ({ file, children: [] }),
      ),
    [filteredCases],
  );

  const displayedCaseNodes = useMemo(
    (): CaseTreeNode[] =>
      caseViewMode === 'hierarchy' ? filteredCaseTree : flatCaseNodes,
    [caseViewMode, filteredCaseTree, flatCaseNodes],
  );

  const [visibleCaseRootCount, setVisibleCaseRootCount] = useState(
    CASE_RESOLVER_VISIBLE_CASE_ROOT_BATCH_SIZE,
  );
  useEffect(() => {
    setVisibleCaseRootCount(CASE_RESOLVER_VISIBLE_CASE_ROOT_BATCH_SIZE);
  }, [displayedCaseNodes.length, caseViewMode]);

  const visibleCaseNodes = useMemo(
    (): CaseTreeNode[] =>
      displayedCaseNodes.slice(0, visibleCaseRootCount),
    [displayedCaseNodes, visibleCaseRootCount],
  );

  const hiddenCaseRootCount = Math.max(
    0,
    displayedCaseNodes.length - visibleCaseRootCount,
  );

  const handleLoadMoreCaseRoots = useCallback((): void => {
    setVisibleCaseRootCount((current: number): number =>
      Math.min(
        current + CASE_RESOLVER_VISIBLE_CASE_ROOT_BATCH_SIZE,
        displayedCaseNodes.length,
      ),
    );
  }, [displayedCaseNodes.length]);

  return {
    files,
    filesById,
    caseTagPathById,
    caseIdentifierPathById,
    caseCategoryPathById,
    caseTagFilterOptions,
    caseCategoryFilterOptions,
    caseIdentifierFilterOptions,
    folderFilterOptions,
    filteredCases,
    visibleCaseNodes,
    hiddenCaseRootCount,
    handleLoadMoreCaseRoots,
    caseTagById,
    caseIdentifierById,
    caseCategoryById,
  };
}

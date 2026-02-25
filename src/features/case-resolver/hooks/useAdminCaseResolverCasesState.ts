'use client';

import { useMemo } from 'react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

import {
  type CaseSortKey,
  useAdminCaseResolverCases,
} from '../context/AdminCaseResolverCasesContext';
import { buildPathLabelMap } from '../pages/AdminCaseResolverCasesUtils';
import { useCaseResolverCaseSearchIndex } from './useCaseResolverCaseSearchIndex';

const resolveCaseSortOrderValue = (file: CaseResolverFile): number =>
  typeof file.caseTreeOrder === 'number' && Number.isFinite(file.caseTreeOrder)
    ? Math.max(0, Math.floor(file.caseTreeOrder))
    : Number.MAX_SAFE_INTEGER;

const resolveTimestampMs = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveCaseStatusRank = (
  status: CaseResolverFile['caseStatus'] | null | undefined
): number => (status === 'completed' ? 1 : 0);

const resolveBinaryRank = (value: boolean | null | undefined): number =>
  value === true ? 1 : 0;

const resolveCaseIdentifierLabel = (
  file: CaseResolverFile,
  caseIdentifierPathById: Map<string, string>
): string => {
  const identifierId = file.caseIdentifierId?.trim() ?? '';
  if (!identifierId) return '';
  return caseIdentifierPathById.get(identifierId)?.trim() ?? '';
};

const compareCaseRows = (
  left: CaseResolverFile,
  right: CaseResolverFile,
  sortBy: CaseSortKey,
  sortOrder: 'asc' | 'desc',
  caseIdentifierPathById: Map<string, string>
): number => {
  const resolveDirectionalDelta = (value: number): number =>
    sortOrder === 'asc' ? value : -value;

  if (sortBy === 'name') {
    const nameDelta = left.name.localeCompare(right.name);
    if (nameDelta !== 0) return resolveDirectionalDelta(nameDelta);
  }

  if (sortBy === 'created') {
    const createdDelta =
      resolveTimestampMs(left.createdAt) - resolveTimestampMs(right.createdAt);
    if (createdDelta !== 0) return resolveDirectionalDelta(createdDelta);
  }

  if (sortBy === 'updated') {
    const updatedDelta =
      resolveTimestampMs(left.updatedAt ?? left.createdAt) -
      resolveTimestampMs(right.updatedAt ?? right.createdAt);
    if (updatedDelta !== 0) return resolveDirectionalDelta(updatedDelta);
  }

  if (sortBy === 'status') {
    const statusDelta =
      resolveCaseStatusRank(left.caseStatus) -
      resolveCaseStatusRank(right.caseStatus);
    if (statusDelta !== 0) return resolveDirectionalDelta(statusDelta);
  }

  if (sortBy === 'signature') {
    const leftLabel = resolveCaseIdentifierLabel(left, caseIdentifierPathById);
    const rightLabel = resolveCaseIdentifierLabel(right, caseIdentifierPathById);
    const leftIsEmpty = leftLabel.length === 0;
    const rightIsEmpty = rightLabel.length === 0;
    if (leftIsEmpty !== rightIsEmpty) {
      if (sortOrder === 'asc') return leftIsEmpty ? 1 : -1;
      return leftIsEmpty ? -1 : 1;
    }
    if (!leftIsEmpty && !rightIsEmpty) {
      const labelDelta = leftLabel.localeCompare(rightLabel);
      if (labelDelta !== 0) return resolveDirectionalDelta(labelDelta);
    }
  }

  if (sortBy === 'locked') {
    const lockedDelta =
      resolveBinaryRank(left.isLocked) - resolveBinaryRank(right.isLocked);
    if (lockedDelta !== 0) return resolveDirectionalDelta(lockedDelta);
  }

  if (sortBy === 'sent') {
    const sentDelta = resolveBinaryRank(left.isSent) - resolveBinaryRank(right.isSent);
    if (sentDelta !== 0) return resolveDirectionalDelta(sentDelta);
  }

  const orderDelta = resolveCaseSortOrderValue(left) - resolveCaseSortOrderValue(right);
  if (orderDelta !== 0) return orderDelta;
  const nameDelta = left.name.localeCompare(right.name);
  if (nameDelta !== 0) return nameDelta;
  return left.id.localeCompare(right.id);
};

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
    caseFilterStatus,
    caseFilterLocked,
    caseFilterSent,
    caseFilterHierarchy,
    caseFilterReferences,
    caseSortBy,
    caseSortOrder,
  } = context;

  const caseTagById = useMemo(
    (): Map<string, (typeof caseResolverTags)[number]> =>
      new Map<string, (typeof caseResolverTags)[number]>(
        caseResolverTags.map((tag) => [tag.id, tag])
      ),
    [caseResolverTags]
  );
  const caseIdentifierById = useMemo(
    (): Map<string, (typeof caseResolverIdentifiers)[number]> =>
      new Map<string, (typeof caseResolverIdentifiers)[number]>(
        caseResolverIdentifiers.map((identifier) => [identifier.id, identifier])
      ),
    [caseResolverIdentifiers]
  );
  const caseCategoryById = useMemo(
    (): Map<string, (typeof caseResolverCategories)[number]> =>
      new Map<string, (typeof caseResolverCategories)[number]>(
        caseResolverCategories.map((category) => [category.id, category])
      ),
    [caseResolverCategories]
  );

  const caseTagPathById = useMemo(
    () =>
      buildPathLabelMap(
        caseResolverTags.map((tag) => ({
          ...tag,
          name: tag.label || tag.id,
          parentId: tag.parentId ?? null,
        }))
      ),
    [caseResolverTags]
  );
  const caseIdentifierPathById = useMemo(
    () =>
      buildPathLabelMap(
        caseResolverIdentifiers.map((identifier) => ({
          ...identifier,
          name: identifier.name || identifier.label || identifier.id,
          parentId: identifier.parentId ?? null,
        }))
      ),
    [caseResolverIdentifiers]
  );
  const caseCategoryPathById = useMemo(
    () =>
      buildPathLabelMap(
        caseResolverCategories.map((category) => ({
          ...category,
          name: category.name || category.id,
          parentId: category.parentId ?? null,
        }))
      ),
    [caseResolverCategories]
  );

  const files = useMemo(
    (): CaseResolverFile[] =>
      workspace.files
        .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
        .sort((left: CaseResolverFile, right: CaseResolverFile): number =>
          compareCaseRows(
            left,
            right,
            caseSortBy,
            caseSortOrder,
            caseIdentifierPathById,
          ),
        ),
    [caseIdentifierPathById, caseSortBy, caseSortOrder, workspace.files],
  );

  const filesById = useMemo(
    () =>
      new Map<string, CaseResolverFile>(
        files.map((file: CaseResolverFile): [string, CaseResolverFile] => [
          file.id,
          file,
        ]),
      ),
    [files],
  );

  const caseTagFilterOptions = useMemo(
    () =>
      caseResolverTags.map((tag) => ({
        value: tag.id,
        label: caseTagPathById.get(tag.id) || tag.label || tag.id,
      })),
    [caseResolverTags, caseTagPathById]
  );
  const caseCategoryFilterOptions = useMemo(
    () =>
      caseResolverCategories.map((category) => ({
        value: category.id,
        label: caseCategoryPathById.get(category.id) || category.name || category.id,
      })),
    [caseResolverCategories, caseCategoryPathById]
  );
  const caseIdentifierFilterOptions = useMemo(
    () =>
      caseResolverIdentifiers.map((identifier) => ({
        value: identifier.id,
        label:
          caseIdentifierPathById.get(identifier.id) ||
          identifier.name ||
          identifier.label ||
          identifier.id,
      })),
    [caseIdentifierPathById, caseResolverIdentifiers]
  );

  const folderFilterOptions = useMemo(() => {
    const folders = Array.from(
      new Set(
        files
          .map((file: CaseResolverFile): string => file.folder)
          .filter((folder: string): boolean => folder.trim() !== '')
      )
    ).sort((left: string, right: string): number => left.localeCompare(right));

    return [
      { value: '__all__', label: 'All folders' },
      ...folders.map((folder: string) => ({ value: folder, label: folder })),
    ];
  }, [files]);

  const { matchedCaseIds, visibleCaseIds } = useCaseResolverCaseSearchIndex({
    workspace,
    caseSearchQuery,
    caseSearchScope,
    caseFileTypeFilter: caseFileTypeFilter === 'case' ? 'case' : 'all',
    caseFilterTagIds,
    caseFilterCaseIdentifierIds,
    caseFilterCategoryIds,
    caseFilterFolder,
    caseFilterStatus,
    caseFilterLocked,
    caseFilterSent,
    caseFilterHierarchy,
    caseFilterReferences,
    caseTagPathById,
    caseIdentifierPathById,
    caseCategoryPathById,
  });

  const filteredCases = useMemo(
    (): CaseResolverFile[] =>
      files.filter((file: CaseResolverFile): boolean => matchedCaseIds.has(file.id)),
    [files, matchedCaseIds]
  );

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
    matchedCaseIds,
    visibleCaseIds,
    caseTagById,
    caseIdentifierById,
    caseCategoryById,
  };
}

'use client';

import { useDeferredValue, useEffect, useMemo, useRef } from 'react';

import type { CaseResolverAssetFile, CaseResolverFile } from '@/shared/contracts/case-resolver/file';
import type { CaseSearchScope } from '@/shared/contracts/case-resolver/base';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';

import {
  getCachedCaseResolverRuntimeIndexes,
  getCaseSubtreeIds,
  logCaseResolverDurationMetric,
} from '../runtime';
export type { CaseSearchScope };
export type CaseSearchIndexMode = 'metadata_only' | 'full_text';

export type UseCaseResolverCaseSearchIndexInput = {
  workspace: CaseResolverWorkspace;
  caseSearchQuery: string;
  caseSearchScope: CaseSearchScope;
  indexMode?: CaseSearchIndexMode;
  caseFileTypeFilter: 'all' | 'case';
  caseFilterTagIds: string[];
  caseFilterCaseIdentifierIds: string[];
  caseFilterCategoryIds: string[];
  caseFilterFolder: string;
  caseFilterStatus: 'all' | 'pending' | 'completed';
  caseFilterLocked: 'all' | 'locked' | 'unlocked';
  caseFilterSent: 'all' | 'sent' | 'not_sent';
  caseFilterHierarchy: 'all' | 'root' | 'child';
  caseFilterReferences: 'all' | 'with_references' | 'without_references';
  caseTagPathById: Map<string, string>;
  caseIdentifierPathById: Map<string, string>;
  caseCategoryPathById: Map<string, string>;
};

export type UseCaseResolverCaseSearchIndexResult = {
  caseFiles: CaseResolverFile[];
  caseFilesById: Map<string, CaseResolverFile>;
  matchedCaseIds: Set<string>;
  visibleCaseIds: Set<string>;
};

type ParsedCaseSearchToken = {
  field:
    | 'any'
    | 'name'
    | 'folder'
    | 'tag'
    | 'identifier'
    | 'category'
    | 'status'
    | 'locked'
    | 'sent'
    | 'parent'
    | 'refs'
    | 'text'
    | 'id';
  value: string;
};

type IndexedCaseSearchRow = {
  file: CaseResolverFile;
  normalizedName: string;
  normalizedFolder: string;
  normalizedTag: string;
  normalizedIdentifier: string;
  normalizedCategory: string;
  normalizedStatus: string;
  normalizedLocked: string;
  normalizedSent: string;
  normalizedParent: string;
  normalizedRefs: string;
  normalizedId: string;
  normalizedText: string;
};

type BuiltSearchIndex = {
  caseFiles: CaseResolverFile[];
  caseFilesById: Map<string, CaseResolverFile>;
  parentCaseIdByCaseId: Map<string, string | null>;
  indexedRows: IndexedCaseSearchRow[];
};

const SEARCH_TOKEN_PATTERN = /"([^"]+)"|(\S+)/g;

const normalizeCaseSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const parseCaseSearchQuery = (query: string): ParsedCaseSearchToken[] => {
  const parsedTokens: ParsedCaseSearchToken[] = [];
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return parsedTokens;

  SEARCH_TOKEN_PATTERN.lastIndex = 0;
  let tokenMatch: RegExpExecArray | null = SEARCH_TOKEN_PATTERN.exec(normalizedQuery);
  while (tokenMatch) {
    const rawToken = (tokenMatch[1] ?? tokenMatch[2] ?? '').trim();
    if (rawToken.length > 0) {
      const separatorIndex = rawToken.indexOf(':');
      if (separatorIndex > 0) {
        const rawField = normalizeCaseSearchText(rawToken.slice(0, separatorIndex));
        const rawValue = normalizeCaseSearchText(rawToken.slice(separatorIndex + 1));
        const field =
          rawField === 'name' ||
          rawField === 'folder' ||
          rawField === 'tag' ||
          rawField === 'identifier' ||
          rawField === 'category' ||
          rawField === 'status' ||
          rawField === 'locked' ||
          rawField === 'sent' ||
          rawField === 'parent' ||
          rawField === 'refs' ||
          rawField === 'references' ||
          rawField === 'text' ||
          rawField === 'content' ||
          rawField === 'id'
            ? rawField === 'content'
              ? 'text'
              : rawField === 'references'
                ? 'refs'
                : rawField
            : 'any';

        if (rawValue.length > 0) {
          parsedTokens.push({ field, value: rawValue });
        }
      } else {
        const normalizedToken = normalizeCaseSearchText(rawToken);
        if (normalizedToken.length > 0) {
          parsedTokens.push({ field: 'any', value: normalizedToken });
        }
      }
    }
    tokenMatch = SEARCH_TOKEN_PATTERN.exec(normalizedQuery);
  }

  return parsedTokens;
};

const toSearchText = (value: string | null | undefined): string =>
  normalizeCaseSearchText(typeof value === 'string' ? value : '');

const resolveCaseRowMatchesToken = (
  row: IndexedCaseSearchRow,
  token: ParsedCaseSearchToken,
  scope: CaseSearchScope
): boolean => {
  const includes = (value: string): boolean => value.includes(token.value);

  if (token.field === 'name') return includes(row.normalizedName);
  if (token.field === 'folder') return includes(row.normalizedFolder);
  if (token.field === 'tag') return includes(row.normalizedTag);
  if (token.field === 'identifier') return includes(row.normalizedIdentifier);
  if (token.field === 'category') return includes(row.normalizedCategory);
  if (token.field === 'status') return includes(row.normalizedStatus);
  if (token.field === 'locked') return includes(row.normalizedLocked);
  if (token.field === 'sent') return includes(row.normalizedSent);
  if (token.field === 'parent') return includes(row.normalizedParent);
  if (token.field === 'refs') return includes(row.normalizedRefs);
  if (token.field === 'id') return includes(row.normalizedId);
  if (token.field === 'text') return includes(row.normalizedText);

  if (scope === 'name') return includes(row.normalizedName);
  if (scope === 'folder') return includes(row.normalizedFolder);
  if (scope === 'content') return includes(row.normalizedText);

  return (
    includes(row.normalizedName) ||
    includes(row.normalizedFolder) ||
    includes(row.normalizedTag) ||
    includes(row.normalizedIdentifier) ||
    includes(row.normalizedCategory) ||
    includes(row.normalizedStatus) ||
    includes(row.normalizedLocked) ||
    includes(row.normalizedSent) ||
    includes(row.normalizedParent) ||
    includes(row.normalizedRefs) ||
    includes(row.normalizedId) ||
    includes(row.normalizedText)
  );
};

const buildSearchIndex = ({
  workspace,
  includeFullText,
  caseTagPathById,
  caseIdentifierPathById,
  caseCategoryPathById,
}: {
  workspace: CaseResolverWorkspace;
  includeFullText: boolean;
  caseTagPathById: Map<string, string>;
  caseIdentifierPathById: Map<string, string>;
  caseCategoryPathById: Map<string, string>;
}): BuiltSearchIndex => {
  const indexes = getCachedCaseResolverRuntimeIndexes(workspace);
  const caseFiles = workspace.files.filter(
    (file: CaseResolverFile): boolean => file.fileType === 'case'
  );
  const caseFilesById = new Map<string, CaseResolverFile>(
    caseFiles.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );

  const indexedRows = caseFiles.map((caseFile: CaseResolverFile): IndexedCaseSearchRow => {
    const textFragments: string[] = [];
    if (includeFullText) {
      const subtreeCaseIds = getCaseSubtreeIds(indexes, caseFile.id);
      subtreeCaseIds.forEach((subtreeCaseId: string): void => {
        const subtreeCaseFile = indexes.caseFilesById.get(subtreeCaseId) ?? null;
        if (subtreeCaseFile) {
          const subtreeCaseText = indexes.plainTextByFileId.get(subtreeCaseId) ?? '';
          if (subtreeCaseText.length > 0) textFragments.push(subtreeCaseText);
        }

        const subtreeFiles = indexes.nonCaseFilesByOwnerCaseId.get(subtreeCaseId) ?? [];
        subtreeFiles.forEach((file: CaseResolverFile): void => {
          const fileText = indexes.plainTextByFileId.get(file.id) ?? '';
          if (fileText.length > 0) textFragments.push(fileText);
        });

        const subtreeAssets = indexes.assetsByOwnerCaseId.get(subtreeCaseId) ?? [];
        subtreeAssets.forEach((asset: CaseResolverAssetFile): void => {
          const assetTextContent = typeof asset.textContent === 'string' ? asset.textContent : '';
          if (assetTextContent.trim().length > 0) {
            textFragments.push(assetTextContent);
          }
          const assetDescription = typeof asset.description === 'string' ? asset.description : '';
          if (assetDescription.trim().length > 0) {
            textFragments.push(assetDescription);
          }
        });
      });
    }

    const hasParentCase = (indexes.parentCaseIdByCaseId.get(caseFile.id) ?? null) !== null;
    const hasReferences =
      Array.isArray(caseFile.referenceCaseIds) &&
      caseFile.referenceCaseIds.some(
        (referenceCaseId: string): boolean => referenceCaseId.trim().length > 0
      );

    return {
      file: caseFile,
      normalizedName: toSearchText(caseFile.name),
      normalizedFolder: toSearchText(caseFile.folder),
      normalizedTag: toSearchText(
        caseFile.tagId ? (caseTagPathById.get(caseFile.tagId) ?? '') : ''
      ),
      normalizedIdentifier: toSearchText(
        caseFile.caseIdentifierId
          ? (caseIdentifierPathById.get(caseFile.caseIdentifierId) ?? '')
          : ''
      ),
      normalizedCategory: toSearchText(
        caseFile.categoryId ? (caseCategoryPathById.get(caseFile.categoryId) ?? '') : ''
      ),
      normalizedStatus: toSearchText(caseFile.caseStatus ?? 'pending'),
      normalizedLocked: toSearchText(
        caseFile.isLocked === true ? 'locked true yes' : 'unlocked false no'
      ),
      normalizedSent: toSearchText(
        caseFile.isSent === true ? 'sent true yes' : 'not_sent unsent false no'
      ),
      normalizedParent: toSearchText(hasParentCase ? 'child with_parent' : 'root'),
      normalizedRefs: toSearchText(
        hasReferences
          ? 'with_references with_refs has yes true'
          : 'without_references no_refs no false'
      ),
      normalizedId: toSearchText(caseFile.id),
      normalizedText: toSearchText(textFragments.join(' ')),
    };
  });

  return {
    caseFiles,
    caseFilesById,
    parentCaseIdByCaseId: indexes.parentCaseIdByCaseId,
    indexedRows,
  };
};

export function useCaseResolverCaseSearchIndex({
  workspace,
  caseSearchQuery,
  caseSearchScope,
  indexMode = 'metadata_only',
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
  caseTagPathById,
  caseIdentifierPathById,
  caseCategoryPathById,
}: UseCaseResolverCaseSearchIndexInput): UseCaseResolverCaseSearchIndexResult {
  const deferredCaseSearchQuery = useDeferredValue(caseSearchQuery);
  const caseSearchIndexBuildDurationMsRef = useRef<number | null>(null);
  const caseSearchFilterDurationMsRef = useRef<number | null>(null);

  const searchTokens = useMemo(
    (): ParsedCaseSearchToken[] => parseCaseSearchQuery(deferredCaseSearchQuery),
    [deferredCaseSearchQuery]
  );
  const shouldBuildFullTextIndex = useMemo((): boolean => {
    if (indexMode === 'full_text') return true;
    if (deferredCaseSearchQuery.trim().length === 0) return false;
    if (caseSearchScope === 'content' || caseSearchScope === 'all') return true;
    return searchTokens.some((token: ParsedCaseSearchToken): boolean => token.field === 'text');
  }, [caseSearchScope, deferredCaseSearchQuery, indexMode, searchTokens]);

  const builtSearchIndex = useMemo((): BuiltSearchIndex => {
    const startedAtMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const nextIndex = buildSearchIndex({
      workspace,
      includeFullText: shouldBuildFullTextIndex,
      caseTagPathById,
      caseIdentifierPathById,
      caseCategoryPathById,
    });
    const completedAtMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    caseSearchIndexBuildDurationMsRef.current = completedAtMs - startedAtMs;
    return nextIndex;
  }, [
    caseCategoryPathById,
    caseIdentifierPathById,
    caseTagPathById,
    shouldBuildFullTextIndex,
    workspace,
  ]);

  const tagFilterSet = useMemo(() => new Set(caseFilterTagIds), [caseFilterTagIds]);
  const identifierFilterSet = useMemo(
    () => new Set(caseFilterCaseIdentifierIds),
    [caseFilterCaseIdentifierIds]
  );
  const categoryFilterSet = useMemo(() => new Set(caseFilterCategoryIds), [caseFilterCategoryIds]);

  const matchedCaseIds = useMemo((): Set<string> => {
    const searchFilterStartedAtMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const nextMatchedCaseIds = new Set<string>();
    builtSearchIndex.indexedRows.forEach((row: IndexedCaseSearchRow): void => {
      if (caseFileTypeFilter !== 'all' && row.file.fileType !== caseFileTypeFilter) {
        return;
      }
      if (caseFilterFolder !== '__all__' && row.file.folder !== caseFilterFolder) {
        return;
      }
      if (caseFilterStatus !== 'all' && (row.file.caseStatus ?? 'pending') !== caseFilterStatus) {
        return;
      }
      if (caseFilterLocked === 'locked' && row.file.isLocked !== true) {
        return;
      }
      if (caseFilterLocked === 'unlocked' && row.file.isLocked === true) {
        return;
      }
      if (caseFilterSent === 'sent' && row.file.isSent !== true) {
        return;
      }
      if (caseFilterSent === 'not_sent' && row.file.isSent === true) {
        return;
      }
      if (
        caseFilterHierarchy === 'root' &&
        (builtSearchIndex.parentCaseIdByCaseId.get(row.file.id) ?? null) !== null
      ) {
        return;
      }
      if (
        caseFilterHierarchy === 'child' &&
        (builtSearchIndex.parentCaseIdByCaseId.get(row.file.id) ?? null) === null
      ) {
        return;
      }
      const hasReferences =
        Array.isArray(row.file.referenceCaseIds) &&
        row.file.referenceCaseIds.some(
          (referenceCaseId: string): boolean => referenceCaseId.trim().length > 0
        );
      if (caseFilterReferences === 'with_references' && !hasReferences) {
        return;
      }
      if (caseFilterReferences === 'without_references' && hasReferences) {
        return;
      }
      if (tagFilterSet.size > 0 && (!row.file.tagId || !tagFilterSet.has(row.file.tagId))) {
        return;
      }
      if (
        identifierFilterSet.size > 0 &&
        (!row.file.caseIdentifierId || !identifierFilterSet.has(row.file.caseIdentifierId))
      ) {
        return;
      }
      if (
        categoryFilterSet.size > 0 &&
        (!row.file.categoryId || !categoryFilterSet.has(row.file.categoryId))
      ) {
        return;
      }

      const searchMatches =
        searchTokens.length === 0
          ? true
          : searchTokens.every((token: ParsedCaseSearchToken): boolean =>
            resolveCaseRowMatchesToken(row, token, caseSearchScope)
          );
      if (!searchMatches) return;

      nextMatchedCaseIds.add(row.file.id);
    });
    const searchFilterCompletedAtMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    caseSearchFilterDurationMsRef.current = searchFilterCompletedAtMs - searchFilterStartedAtMs;
    return nextMatchedCaseIds;
  }, [
    builtSearchIndex.indexedRows,
    builtSearchIndex.parentCaseIdByCaseId,
    caseFileTypeFilter,
    caseFilterCategoryIds,
    caseFilterFolder,
    caseFilterHierarchy,
    caseFilterLocked,
    caseFilterReferences,
    caseFilterSent,
    caseFilterStatus,
    caseFilterTagIds,
    caseSearchScope,
    categoryFilterSet,
    identifierFilterSet,
    searchTokens,
    tagFilterSet,
  ]);

  useEffect((): void => {
    const durationMs = caseSearchIndexBuildDurationMsRef.current;
    if (typeof durationMs !== 'number') return;
    logCaseResolverDurationMetric('case_list_search_index_build_ms', durationMs, {
      source: 'case_search',
      minDurationMs: 1,
      message: `mode=${shouldBuildFullTextIndex ? 'full_text' : 'metadata_only'} rows=${builtSearchIndex.indexedRows.length}`,
    });
  }, [builtSearchIndex.indexedRows.length, shouldBuildFullTextIndex]);

  useEffect((): void => {
    const durationMs = caseSearchFilterDurationMsRef.current;
    if (typeof durationMs !== 'number') return;
    logCaseResolverDurationMetric('case_search_filter_ms', durationMs, {
      source: 'case_search',
      minDurationMs: 1,
      message: `query_length=${deferredCaseSearchQuery.trim().length} matched=${matchedCaseIds.size}`,
    });
  }, [deferredCaseSearchQuery, matchedCaseIds]);

  const visibleCaseIds = useMemo((): Set<string> => {
    const nextVisibleCaseIds = new Set<string>();
    matchedCaseIds.forEach((caseId: string): void => {
      let currentCaseId: string | null = caseId;
      while (currentCaseId) {
        if (nextVisibleCaseIds.has(currentCaseId)) break;
        nextVisibleCaseIds.add(currentCaseId);
        currentCaseId = builtSearchIndex.parentCaseIdByCaseId.get(currentCaseId) ?? null;
      }
    });
    return nextVisibleCaseIds;
  }, [builtSearchIndex.parentCaseIdByCaseId, matchedCaseIds]);

  return {
    caseFiles: builtSearchIndex.caseFiles,
    caseFilesById: builtSearchIndex.caseFilesById,
    matchedCaseIds,
    visibleCaseIds,
  };
}

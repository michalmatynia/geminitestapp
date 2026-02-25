'use client';

import { useMemo } from 'react';

import type { CaseResolverAssetFile, CaseResolverFile, CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

export type CaseSearchScope = 'all' | 'name' | 'folder' | 'content';

export type UseCaseResolverCaseSearchIndexInput = {
  workspace: CaseResolverWorkspace;
  caseSearchQuery: string;
  caseSearchScope: CaseSearchScope;
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

const SEARCH_TOKEN_PATTERN = /"([^"]+)"|(\S+)/g;

const normalizeCaseSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

const parseCaseSearchQuery = (query: string): ParsedCaseSearchToken[] => {
  const tokens: ParsedCaseSearchToken[] = [];
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return tokens;

  let match: RegExpExecArray | null = SEARCH_TOKEN_PATTERN.exec(normalizedQuery);
  while (match) {
    const rawToken = (match[1] ?? match[2] ?? '').trim();
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
            ? (
              rawField === 'content'
                ? 'text'
                : rawField === 'references'
                  ? 'refs'
                  : rawField
            )
            : 'any';

        if (rawValue.length > 0) {
          tokens.push({ field, value: rawValue });
        }
      } else {
        const normalizedToken = normalizeCaseSearchText(rawToken);
        if (normalizedToken.length > 0) {
          tokens.push({ field: 'any', value: normalizedToken });
        }
      }
    }
    match = SEARCH_TOKEN_PATTERN.exec(normalizedQuery);
  }

  return tokens;
};

const toSearchText = (value: string | null | undefined): string =>
  normalizeCaseSearchText(typeof value === 'string' ? value : '');

const resolvePlainText = (file: CaseResolverFile): string => {
  if (file.documentContentPlainText.trim().length > 0) {
    return file.documentContentPlainText;
  }
  if (file.documentContentMarkdown.trim().length > 0) {
    return file.documentContentMarkdown;
  }
  return stripHtml(file.documentContent);
};

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

export function useCaseResolverCaseSearchIndex({
  workspace,
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
  caseTagPathById,
  caseIdentifierPathById,
  caseCategoryPathById,
}: UseCaseResolverCaseSearchIndexInput): UseCaseResolverCaseSearchIndexResult {
  return useMemo((): UseCaseResolverCaseSearchIndexResult => {
    const caseFiles = workspace.files.filter(
      (file: CaseResolverFile): boolean => file.fileType === 'case'
    );
    const caseFilesById = new Map<string, CaseResolverFile>(
      caseFiles.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
    );

    const parentCaseIdByCaseId = new Map<string, string | null>();
    const childCaseIdsByParentId = new Map<string, string[]>();
    caseFiles.forEach((file: CaseResolverFile): void => {
      const rawParentCaseId = file.parentCaseId?.trim() ?? '';
      const parentCaseId =
        rawParentCaseId.length > 0 &&
        rawParentCaseId !== file.id &&
        caseFilesById.has(rawParentCaseId)
          ? rawParentCaseId
          : null;
      parentCaseIdByCaseId.set(file.id, parentCaseId);
      if (!parentCaseId) return;
      const currentChildren = childCaseIdsByParentId.get(parentCaseId) ?? [];
      currentChildren.push(file.id);
      childCaseIdsByParentId.set(parentCaseId, currentChildren);
    });

    const nonCaseFilesByOwnerCaseId = new Map<string, CaseResolverFile[]>();
    workspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType === 'case') return;
      const ownerCaseId = file.parentCaseId?.trim() ?? '';
      if (!ownerCaseId || !caseFilesById.has(ownerCaseId)) return;
      const current = nonCaseFilesByOwnerCaseId.get(ownerCaseId) ?? [];
      current.push(file);
      nonCaseFilesByOwnerCaseId.set(ownerCaseId, current);
    });

    const ownerCaseIdBySourceFileId = new Map<string, string>();
    nonCaseFilesByOwnerCaseId.forEach((files: CaseResolverFile[], ownerCaseId: string): void => {
      files.forEach((file: CaseResolverFile): void => {
        ownerCaseIdBySourceFileId.set(file.id, ownerCaseId);
      });
    });

    const assetsByOwnerCaseId = new Map<string, CaseResolverAssetFile[]>();
    workspace.assets.forEach((asset: CaseResolverAssetFile): void => {
      const sourceFileId = asset.sourceFileId?.trim() ?? '';
      if (!sourceFileId) return;
      const ownerCaseId = ownerCaseIdBySourceFileId.get(sourceFileId);
      if (!ownerCaseId) return;
      const current = assetsByOwnerCaseId.get(ownerCaseId) ?? [];
      current.push(asset);
      assetsByOwnerCaseId.set(ownerCaseId, current);
    });

    const subtreeCaseIdsMemo = new Map<string, Set<string>>();
    const resolveSubtreeCaseIds = (caseId: string, stack: Set<string>): Set<string> => {
      const cached = subtreeCaseIdsMemo.get(caseId);
      if (cached) return cached;

      const subtreeCaseIds = new Set<string>();
      if (stack.has(caseId)) {
        subtreeCaseIds.add(caseId);
        subtreeCaseIdsMemo.set(caseId, subtreeCaseIds);
        return subtreeCaseIds;
      }

      stack.add(caseId);
      subtreeCaseIds.add(caseId);
      const children = childCaseIdsByParentId.get(caseId) ?? [];
      children.forEach((childCaseId: string): void => {
        const childIds = resolveSubtreeCaseIds(childCaseId, stack);
        childIds.forEach((id: string): void => {
          subtreeCaseIds.add(id);
        });
      });
      stack.delete(caseId);

      subtreeCaseIdsMemo.set(caseId, subtreeCaseIds);
      return subtreeCaseIds;
    };

    const indexedRows: IndexedCaseSearchRow[] = caseFiles.map((caseFile: CaseResolverFile): IndexedCaseSearchRow => {
      const subtreeCaseIds = resolveSubtreeCaseIds(caseFile.id, new Set<string>());
      const textFragments: string[] = [];

      subtreeCaseIds.forEach((subtreeCaseId: string): void => {
        const subtreeCaseFile = caseFilesById.get(subtreeCaseId);
        if (subtreeCaseFile) {
          const subtreeText = resolvePlainText(subtreeCaseFile);
          if (subtreeText.length > 0) textFragments.push(subtreeText);
        }

        const scopedFiles = nonCaseFilesByOwnerCaseId.get(subtreeCaseId) ?? [];
        scopedFiles.forEach((file: CaseResolverFile): void => {
          const fileText = resolvePlainText(file);
          if (fileText.length > 0) textFragments.push(fileText);
        });

        const scopedAssets = assetsByOwnerCaseId.get(subtreeCaseId) ?? [];
        scopedAssets.forEach((asset: CaseResolverAssetFile): void => {
          if (asset.textContent.trim().length > 0) {
            textFragments.push(asset.textContent);
          }
          if (asset.description.trim().length > 0) {
            textFragments.push(asset.description);
          }
        });
      });

      const hasParentCase = (parentCaseIdByCaseId.get(caseFile.id) ?? null) !== null;
      const hasReferences =
        Array.isArray(caseFile.referenceCaseIds) &&
        caseFile.referenceCaseIds.some(
          (referenceCaseId: string): boolean => referenceCaseId.trim().length > 0,
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
          caseFile.isLocked === true ? 'locked true yes' : 'unlocked false no',
        ),
        normalizedSent: toSearchText(
          caseFile.isSent === true ? 'sent true yes' : 'not_sent unsent false no',
        ),
        normalizedParent: toSearchText(hasParentCase ? 'child with_parent' : 'root'),
        normalizedRefs: toSearchText(
          hasReferences ? 'with_references with_refs has yes true' : 'without_references no_refs no false',
        ),
        normalizedId: toSearchText(caseFile.id),
        normalizedText: toSearchText(textFragments.join(' ')),
      };
    });

    const searchTokens = parseCaseSearchQuery(caseSearchQuery);
    const tagFilterSet = new Set(caseFilterTagIds);
    const identifierFilterSet = new Set(caseFilterCaseIdentifierIds);
    const categoryFilterSet = new Set(caseFilterCategoryIds);

    const matchedCaseIds = new Set<string>();
    indexedRows.forEach((row: IndexedCaseSearchRow): void => {
      if (caseFileTypeFilter !== 'all' && row.file.fileType !== caseFileTypeFilter) {
        return;
      }
      if (caseFilterFolder !== '__all__' && row.file.folder !== caseFilterFolder) {
        return;
      }
      if (
        caseFilterStatus !== 'all' &&
        (row.file.caseStatus ?? 'pending') !== caseFilterStatus
      ) {
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
        (parentCaseIdByCaseId.get(row.file.id) ?? null) !== null
      ) {
        return;
      }
      if (
        caseFilterHierarchy === 'child' &&
        (parentCaseIdByCaseId.get(row.file.id) ?? null) === null
      ) {
        return;
      }
      const hasReferences =
        Array.isArray(row.file.referenceCaseIds) &&
        row.file.referenceCaseIds.some(
          (referenceCaseId: string): boolean => referenceCaseId.trim().length > 0,
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

      matchedCaseIds.add(row.file.id);
    });

    const visibleCaseIds = new Set<string>();
    matchedCaseIds.forEach((caseId: string): void => {
      let currentCaseId: string | null = caseId;
      while (currentCaseId) {
        if (visibleCaseIds.has(currentCaseId)) break;
        visibleCaseIds.add(currentCaseId);
        currentCaseId = parentCaseIdByCaseId.get(currentCaseId) ?? null;
      }
    });

    return {
      caseFiles,
      caseFilesById,
      matchedCaseIds,
      visibleCaseIds,
    };
  }, [
    caseCategoryPathById,
    caseFileTypeFilter,
    caseFilterCaseIdentifierIds,
    caseFilterCategoryIds,
    caseFilterFolder,
    caseFilterHierarchy,
    caseFilterLocked,
    caseFilterReferences,
    caseFilterSent,
    caseFilterStatus,
    caseFilterTagIds,
    caseIdentifierPathById,
    caseSearchQuery,
    caseSearchScope,
    caseTagPathById,
    workspace.assets,
    workspace.files,
  ]);
}

import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverFolderRecord,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';

import { getCaseResolverWorkspaceRevision } from '../../workspace-persistence';

const EMPTY_SET = new Set<string>();

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'');

const stripHtml = (value: string): string =>
  decodeHtmlEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

export const resolveCaseResolverPlainText = (file: CaseResolverFile): string => {
  const plainText = file.documentContentPlainText.trim();
  if (plainText.length > 0) return plainText;
  const markdown = file.documentContentMarkdown.trim();
  if (markdown.length > 0) return markdown;
  return stripHtml(file.documentContent);
};

const forEachFolderPathAncestor = (
  folderPath: string,
  callback: (ancestorPath: string) => void
): void => {
  const normalizedFolderPath = folderPath.trim();
  if (!normalizedFolderPath) return;
  const folderParts = normalizedFolderPath.split('/').filter(Boolean);
  for (let index = 0; index < folderParts.length; index += 1) {
    callback(folderParts.slice(0, index + 1).join('/'));
  }
};

export type CaseResolverRuntimeIndexes = {
  workspaceRevision: number;
  filesById: Map<string, CaseResolverFile>;
  assetsById: Map<string, CaseResolverAssetFile>;
  foldersByPath: Set<string>;
  caseFilesById: Map<string, CaseResolverFile>;
  parentCaseIdByCaseId: Map<string, string | null>;
  childCaseIdsByParentId: Map<string, string[]>;
  subtreeCaseIdsByCaseId: Map<string, Set<string>>;
  nonCaseFilesByOwnerCaseId: Map<string, CaseResolverFile[]>;
  ownerCaseIdBySourceFileId: Map<string, string>;
  assetsByOwnerCaseId: Map<string, CaseResolverAssetFile[]>;
  folderOwnerCaseIdsByPath: Map<string, string[]>;
  relatedFileIdsByFileId: Map<string, string[]>;
  plainTextByFileId: Map<string, string>;
};

const runtimeIndexesCache = new WeakMap<
  CaseResolverWorkspace,
  { revision: number; indexes: CaseResolverRuntimeIndexes }
>();

export const buildCaseResolverRuntimeIndexes = (
  workspace: CaseResolverWorkspace
): CaseResolverRuntimeIndexes => {
  const filesById = new Map<string, CaseResolverFile>();
  const assetsById = new Map<string, CaseResolverAssetFile>();
  const foldersByPath = new Set<string>(workspace.folders);
  const caseFilesById = new Map<string, CaseResolverFile>();
  const parentCaseIdByCaseId = new Map<string, string | null>();
  const childCaseIdsByParentId = new Map<string, string[]>();
  const nonCaseFilesByOwnerCaseId = new Map<string, CaseResolverFile[]>();
  const ownerCaseIdBySourceFileId = new Map<string, string>();
  const relatedFileIdsByFileId = new Map<string, string[]>();
  const plainTextByFileId = new Map<string, string>();

  workspace.files.forEach((file: CaseResolverFile): void => {
    filesById.set(file.id, file);
    foldersByPath.add(file.folder);
    plainTextByFileId.set(file.id, resolveCaseResolverPlainText(file));
    const normalizedRelatedIds = (file.relatedFileIds ?? [])
      .map((relatedFileId: string): string => relatedFileId.trim())
      .filter((relatedFileId: string): boolean => relatedFileId.length > 0);
    relatedFileIdsByFileId.set(file.id, normalizedRelatedIds);

    if (file.fileType === 'case') {
      caseFilesById.set(file.id, file);
      return;
    }

    const normalizedOwnerCaseId = file.parentCaseId?.trim() ?? '';
    if (!normalizedOwnerCaseId) return;
    const caseFiles = nonCaseFilesByOwnerCaseId.get(normalizedOwnerCaseId) ?? [];
    caseFiles.push(file);
    nonCaseFilesByOwnerCaseId.set(normalizedOwnerCaseId, caseFiles);
    ownerCaseIdBySourceFileId.set(file.id, normalizedOwnerCaseId);
  });

  caseFilesById.forEach((caseFile: CaseResolverFile): void => {
    const rawParentCaseId = caseFile.parentCaseId?.trim() ?? '';
    const normalizedParentCaseId =
      rawParentCaseId.length > 0 &&
      rawParentCaseId !== caseFile.id &&
      caseFilesById.has(rawParentCaseId)
        ? rawParentCaseId
        : null;
    parentCaseIdByCaseId.set(caseFile.id, normalizedParentCaseId);
    if (!normalizedParentCaseId) return;
    const childCaseIds = childCaseIdsByParentId.get(normalizedParentCaseId) ?? [];
    childCaseIds.push(caseFile.id);
    childCaseIdsByParentId.set(normalizedParentCaseId, childCaseIds);
  });

  const subtreeCaseIdsByCaseId = new Map<string, Set<string>>();
  const collectCaseSubtree = (caseId: string, stack: Set<string>): Set<string> => {
    const cachedSubtree = subtreeCaseIdsByCaseId.get(caseId);
    if (cachedSubtree) return cachedSubtree;
    const subtreeCaseIds = new Set<string>();
    if (stack.has(caseId)) {
      subtreeCaseIds.add(caseId);
      subtreeCaseIdsByCaseId.set(caseId, subtreeCaseIds);
      return subtreeCaseIds;
    }
    stack.add(caseId);
    subtreeCaseIds.add(caseId);
    const childCaseIds = childCaseIdsByParentId.get(caseId) ?? [];
    childCaseIds.forEach((childCaseId: string): void => {
      const childSubtreeIds = collectCaseSubtree(childCaseId, stack);
      childSubtreeIds.forEach((childSubtreeCaseId: string): void => {
        subtreeCaseIds.add(childSubtreeCaseId);
      });
    });
    stack.delete(caseId);
    subtreeCaseIdsByCaseId.set(caseId, subtreeCaseIds);
    return subtreeCaseIds;
  };
  caseFilesById.forEach((_: CaseResolverFile, caseId: string): void => {
    collectCaseSubtree(caseId, new Set<string>());
  });

  const assetsByOwnerCaseId = new Map<string, CaseResolverAssetFile[]>();
  workspace.assets.forEach((asset: CaseResolverAssetFile): void => {
    assetsById.set(asset.id, asset);
    foldersByPath.add(asset.folder);
    const sourceFileId = asset.sourceFileId?.trim() ?? '';
    if (!sourceFileId) return;
    const ownerCaseId = ownerCaseIdBySourceFileId.get(sourceFileId);
    if (!ownerCaseId) return;
    const assets = assetsByOwnerCaseId.get(ownerCaseId) ?? [];
    assets.push(asset);
    assetsByOwnerCaseId.set(ownerCaseId, assets);
  });

  const folderOwnerIdsByPath = new Map<string, Set<string>>();
  const registerFolderOwner = (folderPath: string, ownerCaseId: string): void => {
    if (!folderPath.trim() || !ownerCaseId.trim()) return;
    forEachFolderPathAncestor(folderPath, (ancestorPath: string): void => {
      const ownerIds = folderOwnerIdsByPath.get(ancestorPath) ?? new Set<string>();
      ownerIds.add(ownerCaseId);
      folderOwnerIdsByPath.set(ancestorPath, ownerIds);
    });
  };

  (workspace.folderRecords ?? []).forEach((folderRecord: CaseResolverFolderRecord): void => {
    const ownerCaseId = folderRecord.ownerCaseId?.trim() ?? '';
    if (!ownerCaseId) return;
    registerFolderOwner(folderRecord.path, ownerCaseId);
  });
  workspace.files.forEach((file: CaseResolverFile): void => {
    if (file.fileType === 'case') return;
    const ownerCaseId = file.parentCaseId?.trim() ?? '';
    if (!ownerCaseId) return;
    registerFolderOwner(file.folder, ownerCaseId);
  });
  workspace.assets.forEach((asset: CaseResolverAssetFile): void => {
    const sourceFileId = asset.sourceFileId?.trim() ?? '';
    if (!sourceFileId) return;
    const ownerCaseId = ownerCaseIdBySourceFileId.get(sourceFileId);
    if (!ownerCaseId) return;
    registerFolderOwner(asset.folder, ownerCaseId);
  });

  const folderOwnerCaseIdsByPath = new Map<string, string[]>();
  folderOwnerIdsByPath.forEach((ownerIds: Set<string>, folderPath: string): void => {
    folderOwnerCaseIdsByPath.set(
      folderPath,
      Array.from(ownerIds).sort((left: string, right: string): number => left.localeCompare(right))
    );
  });

  return {
    workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
    filesById,
    assetsById,
    foldersByPath,
    caseFilesById,
    parentCaseIdByCaseId,
    childCaseIdsByParentId,
    subtreeCaseIdsByCaseId,
    nonCaseFilesByOwnerCaseId,
    ownerCaseIdBySourceFileId,
    assetsByOwnerCaseId,
    folderOwnerCaseIdsByPath,
    relatedFileIdsByFileId,
    plainTextByFileId,
  };
};

export const getCachedCaseResolverRuntimeIndexes = (
  workspace: CaseResolverWorkspace
): CaseResolverRuntimeIndexes => {
  const workspaceRevision = getCaseResolverWorkspaceRevision(workspace);
  const cached = runtimeIndexesCache.get(workspace);
  if (cached?.revision === workspaceRevision) {
    return cached.indexes;
  }
  const indexes = buildCaseResolverRuntimeIndexes(workspace);
  runtimeIndexesCache.set(workspace, {
    revision: workspaceRevision,
    indexes,
  });
  return indexes;
};

export const getCaseSubtreeIds = (
  indexes: CaseResolverRuntimeIndexes,
  caseId: string
): Set<string> => indexes.subtreeCaseIdsByCaseId.get(caseId) ?? EMPTY_SET;

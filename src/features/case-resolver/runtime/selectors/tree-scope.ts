import type { CaseResolverAssetFile, CaseResolverFile, CaseResolverFolderRecord } from '@/shared/contracts/case-resolver/file';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';

import { getCachedCaseResolverRuntimeIndexes, type CaseResolverRuntimeIndexes } from './indexes';
import { normalizeFolderPaths } from '../../settings';

type ResolveScopedWorkspaceArgs = {
  workspace: CaseResolverWorkspace;
  selectedFileId: string | null;
  requestedFileId: string | null;
  activeCaseId?: string | null;
  includeDescendantCaseScope?: boolean;
  indexes?: CaseResolverRuntimeIndexes;
};

const resolveCaseContextId = ({
  selectedFileId,
  requestedFileId,
  activeCaseId,
}: {
  selectedFileId: string | null;
  requestedFileId: string | null;
  activeCaseId: string | null;
}): string | null => {
  const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
  if (normalizedRequestedFileId.length > 0) {
    return normalizedRequestedFileId;
  }
  if (selectedFileId) return selectedFileId;
  const normalizedActiveCaseId = activeCaseId?.trim() ?? '';
  return normalizedActiveCaseId.length > 0 ? normalizedActiveCaseId : null;
};

export const resolveScopedCaseResolverWorkspaceWithIndexes = ({
  workspace,
  selectedFileId,
  requestedFileId,
  activeCaseId = null,
  includeDescendantCaseScope = true,
  indexes: providedIndexes,
}: ResolveScopedWorkspaceArgs): CaseResolverWorkspace => {
  const indexes = providedIndexes ?? getCachedCaseResolverRuntimeIndexes(workspace);
  const contextFileId = resolveCaseContextId({
    selectedFileId,
    requestedFileId,
    activeCaseId,
  });
  if (!contextFileId) return workspace;

  const contextFile = indexes.filesById.get(contextFileId) ?? null;
  if (!contextFile) return workspace;

  const scopedRootCaseId =
    contextFile.fileType === 'case'
      ? contextFile.id
      : contextFile.parentCaseId &&
          indexes.caseFilesById.get(contextFile.parentCaseId)?.fileType === 'case'
        ? contextFile.parentCaseId
        : null;
  if (!scopedRootCaseId) return workspace;

  const scopedCaseIds = new Set<string>();
  const visitCase = (caseId: string): void => {
    if (!caseId || scopedCaseIds.has(caseId)) return;
    if (!indexes.caseFilesById.has(caseId)) return;
    scopedCaseIds.add(caseId);
    if (!includeDescendantCaseScope) return;
    const childCaseIds = indexes.childCaseIdsByParentId.get(caseId) ?? [];
    childCaseIds.forEach((childCaseId: string): void => {
      visitCase(childCaseId);
    });
  };
  visitCase(scopedRootCaseId);
  if (scopedCaseIds.size === 0) return workspace;

  const scopedFileIds = new Set<string>();
  workspace.files.forEach((file: CaseResolverFile): void => {
    if (file.fileType === 'case') {
      if (scopedCaseIds.has(file.id)) {
        scopedFileIds.add(file.id);
      }
      return;
    }
    const ownerCaseId = file.parentCaseId?.trim() ?? '';
    if (ownerCaseId && scopedCaseIds.has(ownerCaseId)) {
      scopedFileIds.add(file.id);
    }
  });

  let relationRecovered = true;
  while (relationRecovered) {
    relationRecovered = false;
    workspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType === 'case') return;
      if (scopedFileIds.has(file.id)) return;
      const ownerCaseId = file.parentCaseId?.trim() ?? '';
      if (ownerCaseId) return;
      const relatedFileIds = indexes.relatedFileIdsByFileId.get(file.id) ?? [];
      const hasScopedRelation = relatedFileIds.some((relatedFileId: string): boolean =>
        scopedFileIds.has(relatedFileId)
      );
      if (!hasScopedRelation) return;
      scopedFileIds.add(file.id);
      relationRecovered = true;
    });
  }

  const scopedFiles = workspace.files.filter((file: CaseResolverFile): boolean =>
    scopedFileIds.has(file.id)
  );
  if (scopedFiles.length === 0) {
    return workspace;
  }

  const scopedFileIdSet = new Set<string>(
    scopedFiles.map((file: CaseResolverFile): string => file.id)
  );
  const scopedNodeFileAssetIds = new Set<string>();
  scopedFiles.forEach((file: CaseResolverFile): void => {
    const nodeFileAssetIdByNode = file.graph?.nodeFileAssetIdByNode ?? {};
    Object.values(nodeFileAssetIdByNode).forEach((assetId: unknown): void => {
      const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : '';
      if (!normalizedAssetId) return;
      scopedNodeFileAssetIds.add(normalizedAssetId);
    });
  });

  const isStandaloneNodeFileInScope = (asset: CaseResolverAssetFile): boolean => {
    if (asset.kind !== 'node_file') return false;
    if (scopedNodeFileAssetIds.has(asset.id)) return true;

    const metadataOwnerCaseId =
      asset.metadata &&
      typeof asset.metadata === 'object' &&
      typeof asset.metadata['ownerCaseId'] === 'string'
        ? asset.metadata['ownerCaseId'].trim()
        : '';
    if (metadataOwnerCaseId.length > 0) {
      return scopedCaseIds.has(metadataOwnerCaseId);
    }

    const normalizedFolderPath = asset.folder.trim();
    if (normalizedFolderPath.length === 0) return false;
    const folderOwnerCaseIds = indexes.folderOwnerCaseIdsByPath.get(normalizedFolderPath) ?? [];
    if (folderOwnerCaseIds.length === 0) return false;
    return folderOwnerCaseIds.every((ownerCaseId: string): boolean =>
      scopedCaseIds.has(ownerCaseId)
    );
  };

  const scopedAssets = workspace.assets.filter((asset: CaseResolverAssetFile): boolean => {
    if (asset.sourceFileId && scopedFileIdSet.has(asset.sourceFileId)) return true;
    return isStandaloneNodeFileInScope(asset);
  });

  const scopedFolderRecords = (workspace.folderRecords ?? []).filter(
    (folderRecord: CaseResolverFolderRecord): boolean =>
      Boolean(folderRecord.ownerCaseId && scopedCaseIds.has(folderRecord.ownerCaseId))
  );
  const scopedFolders = normalizeFolderPaths([
    ...scopedFolderRecords.map(
      (folderRecord: CaseResolverFolderRecord): string => folderRecord.path
    ),
    ...scopedFiles.map((file: CaseResolverFile): string => file.folder),
    ...scopedAssets.map((asset): string => asset.folder),
  ]);
  const scopedFolderTimestamps = Object.fromEntries(
    Object.entries(workspace.folderTimestamps ?? {}).filter(
      ([folderPath]: [string, unknown]): boolean => scopedFolders.includes(folderPath)
    )
  );

  const normalizedActiveCaseId = activeCaseId?.trim() ?? '';
  const activeCandidates = [
    selectedFileId,
    normalizedActiveCaseId.length > 0 ? normalizedActiveCaseId : null,
    scopedRootCaseId,
    scopedFiles[0]?.id ?? null,
  ];
  const nextActiveFileId =
    activeCandidates.find(
      (candidate: string | null): candidate is string =>
        typeof candidate === 'string' && scopedFileIdSet.has(candidate)
    ) ?? null;

  return {
    ...workspace,
    folders: scopedFolders,
    folderRecords: scopedFolderRecords,
    folderTimestamps: scopedFolderTimestamps,
    files: scopedFiles,
    assets: scopedAssets,
    activeFileId: nextActiveFileId,
  };
};

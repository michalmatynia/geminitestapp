import type { CaseResolverFile, CaseResolverFolderRecord, CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import { normalizeFolderPaths } from '../settings';


type ResolveCaseResolverTreeWorkspaceArgs = {
  selectedFileId: string | null;
  requestedFileId: string | null;
  workspace: CaseResolverWorkspace;
  includeDescendantCaseScope?: boolean;
};

const forEachFolderPathAncestor = (
  folderPath: string,
  callback: (path: string) => void,
): void => {
  const normalizedFolder = folderPath.trim();
  if (!normalizedFolder) return;
  const parts = normalizedFolder.split('/').filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    callback(parts.slice(0, index + 1).join('/'));
  }
};

export const resolveCaseResolverTreeWorkspace = ({
  selectedFileId,
  requestedFileId,
  workspace,
  includeDescendantCaseScope = true,
}: ResolveCaseResolverTreeWorkspaceArgs): CaseResolverWorkspace => {
  const filesById = new Map<string, CaseResolverFile>(
    workspace.files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  const buildEmptyScopedWorkspace = (): CaseResolverWorkspace => ({
    ...workspace,
    folders: [],
    folderRecords: [],
    folderTimestamps: {},
    files: [],
    assets: [],
    activeFileId: null,
  });
  const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
  const forcedContextFileId = normalizedRequestedFileId.length > 0 ? normalizedRequestedFileId : null;
  const fallbackCaseId =
    workspace.files.find((file: CaseResolverFile): boolean => file.fileType === 'case')?.id ?? null;
  const contextFileId =
    forcedContextFileId ??
    selectedFileId ??
    workspace.activeFileId ??
    fallbackCaseId;
  if (!contextFileId) return workspace;
  const contextFile = filesById.get(contextFileId) ?? null;
  if (!contextFile) {
    if (forcedContextFileId) {
      return buildEmptyScopedWorkspace();
    }
    if (!selectedFileId || selectedFileId !== contextFileId) return workspace;
    return buildEmptyScopedWorkspace();
  }

  const scopedRootCaseId =
    contextFile.fileType === 'case'
      ? contextFile.id
      : (
        contextFile.parentCaseId &&
        (filesById.get(contextFile.parentCaseId)?.fileType === 'case')
          ? contextFile.parentCaseId
          : null
      );
  if (!scopedRootCaseId) return workspace;

  const caseChildIdsByParentId = new Map<string, string[]>();
  workspace.files.forEach((file: CaseResolverFile): void => {
    if (file.fileType !== 'case') return;
    const parentCaseId = file.parentCaseId;
    if (!parentCaseId || parentCaseId === file.id) return;
    const parentFile = filesById.get(parentCaseId);
    if (parentFile?.fileType !== 'case') return;
    const current = caseChildIdsByParentId.get(parentCaseId) ?? [];
    current.push(file.id);
    caseChildIdsByParentId.set(parentCaseId, current);
  });

  const scopedCaseIds = new Set<string>();
  const visitCase = (caseId: string): void => {
    if (!caseId || scopedCaseIds.has(caseId)) return;
    const candidate = filesById.get(caseId);
    if (candidate?.fileType !== 'case') return;
    scopedCaseIds.add(caseId);
    if (!includeDescendantCaseScope) return;
    const childCaseIds = caseChildIdsByParentId.get(caseId) ?? [];
    childCaseIds.forEach((childCaseId: string): void => {
      visitCase(childCaseId);
    });
  };
  visitCase(scopedRootCaseId);
  if (scopedCaseIds.size === 0) {
    if (forcedContextFileId) return buildEmptyScopedWorkspace();
    return workspace;
  }

  const ownerCaseIdsByFolderPath = new Map<string, Set<string>>();
  (workspace.folderRecords ?? []).forEach((record: CaseResolverFolderRecord): void => {
    const ownerCaseId = record.ownerCaseId?.trim() ?? '';
    const folderPath = record.path.trim();
    if (!ownerCaseId || !folderPath) return;
    const currentOwners = ownerCaseIdsByFolderPath.get(folderPath) ?? new Set<string>();
    currentOwners.add(ownerCaseId);
    ownerCaseIdsByFolderPath.set(folderPath, currentOwners);
  });

  const folderOwnedByScopedCase = (folderPath: string): boolean => {
    let isOwned = false;
    forEachFolderPathAncestor(folderPath, (ancestorPath: string): void => {
      if (isOwned) return;
      const ownerCaseIds = ownerCaseIdsByFolderPath.get(ancestorPath);
      if (!ownerCaseIds || ownerCaseIds.size === 0) return;
      isOwned = Array.from(ownerCaseIds).some((ownerCaseId: string): boolean =>
        scopedCaseIds.has(ownerCaseId)
      );
    });
    return isOwned;
  };

  const scopedFileIds = new Set<string>();
  workspace.files.forEach((file: CaseResolverFile): void => {
    if (file.fileType === 'case') {
      if (scopedCaseIds.has(file.id)) {
        scopedFileIds.add(file.id);
      }
      return;
    }
    const ownerCaseId = file.parentCaseId?.trim() ?? '';
    if (!ownerCaseId || !scopedCaseIds.has(ownerCaseId)) return;
    scopedFileIds.add(file.id);
  });
  workspace.files.forEach((file: CaseResolverFile): void => {
    if (file.fileType === 'case') return;
    if (scopedFileIds.has(file.id)) return;
    const ownerCaseId = file.parentCaseId?.trim() ?? '';
    if (ownerCaseId) return;
    if (!folderOwnedByScopedCase(file.folder)) return;
    scopedFileIds.add(file.id);
  });

  let relationRecovered = true;
  while (relationRecovered) {
    relationRecovered = false;
    workspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType === 'case') return;
      if (scopedFileIds.has(file.id)) return;
      const ownerCaseId = file.parentCaseId?.trim() ?? '';
      if (ownerCaseId) return;
      const hasScopedRelation = (file.relatedFileIds ?? []).some(
        (relatedFileId: string): boolean => scopedFileIds.has(relatedFileId),
      );
      if (!hasScopedRelation) return;
      scopedFileIds.add(file.id);
      relationRecovered = true;
    });
  }

  const scopedFiles = workspace.files.filter((file: CaseResolverFile): boolean =>
    scopedFileIds.has(file.id),
  );
  if (scopedFiles.length === 0) {
    if (forcedContextFileId) return buildEmptyScopedWorkspace();
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
  const scopedAssets = workspace.assets.filter((asset): boolean =>
    Boolean(
      (asset.sourceFileId && scopedFileIdSet.has(asset.sourceFileId)) ||
      (asset.kind === 'node_file' && scopedNodeFileAssetIds.has(asset.id))
    )
  );
  const scopedFolderRecords = (workspace.folderRecords ?? []).filter(
    (record: CaseResolverFolderRecord): boolean =>
      Boolean(record.ownerCaseId && scopedCaseIds.has(record.ownerCaseId))
  );
  const scopedFolders = normalizeFolderPaths([
    ...scopedFolderRecords.map((record: CaseResolverFolderRecord): string => record.path),
    ...scopedFiles.map((file: CaseResolverFile): string => file.folder),
    ...scopedAssets.map((asset): string => asset.folder),
  ]);
  const scopedFolderTimestamps = Object.fromEntries(
    Object.entries(workspace.folderTimestamps ?? {}).filter(
      ([folderPath]: [string, unknown]): boolean => scopedFolders.includes(folderPath)
    )
  );
  const activeCandidates = [
    selectedFileId,
    workspace.activeFileId,
    scopedRootCaseId,
    scopedFiles[0]?.id ?? null,
  ];
  const nextActiveFileId =
    activeCandidates.find((candidate: string | null): candidate is string =>
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

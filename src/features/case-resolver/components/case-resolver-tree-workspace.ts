import { normalizeFolderPaths } from '../settings';

import type { CaseResolverFile, CaseResolverFolderRecord, CaseResolverWorkspace } from '../types';

type ResolveCaseResolverTreeWorkspaceArgs = {
  selectedFileId: string | null;
  requestedFileId: string | null;
  workspace: CaseResolverWorkspace;
};

export const resolveCaseResolverTreeWorkspace = ({
  selectedFileId,
  requestedFileId,
  workspace,
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

  const scopedFiles = workspace.files.filter((file: CaseResolverFile): boolean => {
    if (file.fileType === 'case') {
      return scopedCaseIds.has(file.id);
    }
    return Boolean(file.parentCaseId && scopedCaseIds.has(file.parentCaseId));
  });
  if (scopedFiles.length === 0) {
    if (forcedContextFileId) return buildEmptyScopedWorkspace();
    return workspace;
  }

  const scopedFileIds = new Set<string>(
    scopedFiles.map((file: CaseResolverFile): string => file.id)
  );
  const scopedNodeFileAssetIds = new Set<string>();
  scopedFiles.forEach((file: CaseResolverFile): void => {
    const nodeFileAssetIdByNode = file.graph.nodeFileAssetIdByNode ?? {};
    Object.values(nodeFileAssetIdByNode).forEach((assetId: string): void => {
      const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : '';
      if (!normalizedAssetId) return;
      scopedNodeFileAssetIds.add(normalizedAssetId);
    });
  });
  const scopedAssets = workspace.assets.filter((asset): boolean =>
    Boolean(
      (asset.sourceFileId && scopedFileIds.has(asset.sourceFileId)) ||
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
      typeof candidate === 'string' && scopedFileIds.has(candidate)
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

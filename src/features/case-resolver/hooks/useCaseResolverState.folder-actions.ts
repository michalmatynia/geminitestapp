import { useCallback } from 'react';

import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';

import { normalizeFolderPath, normalizeFolderPaths, renameFolderPath } from '../settings';
import {
  collectCaseScopeIds,
  removeOwnedFolderRecordsWithinPath,
  renameOwnedFolderRecordsWithinPath,
} from './useCaseResolverState.helpers';
import { isPathWithinFolder } from '@/features/case-resolver/utils/caseResolverUtils';

type ConfirmFn = (input: {
  title: string;
  message: string;
  confirmText: string;
  isDangerous: boolean;
  onConfirm: () => void;
}) => void;

type UpdateWorkspaceOptions = {
  persistToast?: string;
  persistNow?: boolean;
  mutationId?: string;
  source?: string;
};

type UpdateWorkspaceFn = (
  updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
  options?: UpdateWorkspaceOptions
) => void;

type CaseResolverToast = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'warning' | 'info' }
) => void;

type UseCaseResolverStateFolderActionsInput = {
  confirm: ConfirmFn;
  toast: CaseResolverToast;
  updateWorkspace: UpdateWorkspaceFn;
  workspace: CaseResolverWorkspace;
  selectedCaseScopeIds: Set<string> | null;
  selectedCaseContainerId: string | null;
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  treeSaveToast: string;
};

export type UseCaseResolverStateFolderActionsResult = {
  handleDeleteFolder: (folderPath: string) => void;
  handleMoveFile: (fileId: string, targetFolder: string) => Promise<void>;
  handleMoveAsset: (assetId: string, targetFolder: string) => Promise<void>;
  handleRenameFile: (fileId: string, nextName: string) => Promise<void>;
  handleRenameAsset: (assetId: string, nextName: string) => Promise<void>;
  handleRenameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
};

export const useCaseResolverStateFolderActions = ({
  confirm,
  toast,
  updateWorkspace,
  workspace,
  selectedCaseScopeIds,
  selectedCaseContainerId,
  setSelectedFileId,
  setSelectedAssetId,
  setSelectedFolderPath,
  setEditingDocumentDraft,
  treeSaveToast,
}: UseCaseResolverStateFolderActionsInput): UseCaseResolverStateFolderActionsResult => {
  const isLockedEditableFile = useCallback(
    (file: CaseResolverFile): boolean => file.fileType !== 'case' && file.isLocked === true,
    []
  );

  const handleDeleteFolder = useCallback(
    (folderPath: string): void => {
      const normalizedFolder = normalizeFolderPath(folderPath);
      if (!normalizedFolder) return;
      const scopedCaseIds = selectedCaseScopeIds;
      const scopedFileIds = scopedCaseIds
        ? new Set<string>(
          workspace.files
            .filter(
              (file: CaseResolverFile): boolean =>
                file.fileType !== 'case' &&
                  Boolean(file.parentCaseId && scopedCaseIds.has(file.parentCaseId))
            )
            .map((file: CaseResolverFile): string => file.id)
        )
        : null;
      const hasLockedFilesInFolder = workspace.files.some(
        (file: CaseResolverFile): boolean =>
          isLockedEditableFile(file) &&
          isPathWithinFolder(file.folder, normalizedFolder) &&
          (!scopedCaseIds || Boolean(file.parentCaseId && scopedCaseIds.has(file.parentCaseId)))
      );
      if (hasLockedFilesInFolder) {
        toast('Folder contains locked documents. Unlock them before deleting this folder.', {
          variant: 'warning',
        });
        return;
      }

      confirm({
        title: 'Delete Folder?',
        message: `Are you sure you want to delete folder "${normalizedFolder}" and all nested content? This action cannot be undone.`,
        confirmText: 'Delete Folder',
        isDangerous: true,
        onConfirm: () => {
          const filesInDeletedFolder = workspace.files.filter(
            (file: CaseResolverFile): boolean =>
              file.fileType !== 'case' &&
              isPathWithinFolder(file.folder, normalizedFolder) &&
              (!scopedCaseIds || Boolean(file.parentCaseId && scopedCaseIds.has(file.parentCaseId)))
          );
          const assetsInDeletedFolder = workspace.assets.filter(
            (asset: CaseResolverAssetFile): boolean =>
              isPathWithinFolder(asset.folder, normalizedFolder) &&
              (!scopedFileIds ||
                Boolean(asset.sourceFileId && scopedFileIds.has(asset.sourceFileId)))
          );
          const removedFileIds = new Set<string>(
            filesInDeletedFolder.map((file: CaseResolverFile): string => file.id)
          );
          const removedAssetIds = new Set<string>(
            assetsInDeletedFolder.map((asset: CaseResolverAssetFile): string => asset.id)
          );

          updateWorkspace(
            (current) => {
              const currentScopeCaseIds = collectCaseScopeIds(
                current.files,
                selectedCaseContainerId
              );
              const currentHasLockedFilesInFolder = current.files.some(
                (file: CaseResolverFile): boolean =>
                  isLockedEditableFile(file) &&
                  isPathWithinFolder(file.folder, normalizedFolder) &&
                  (!currentScopeCaseIds ||
                    Boolean(file.parentCaseId && currentScopeCaseIds.has(file.parentCaseId)))
              );
              if (currentHasLockedFilesInFolder) return current;
              const currentScopeFileIds = currentScopeCaseIds
                ? new Set<string>(
                  current.files
                    .filter(
                      (file: CaseResolverFile): boolean =>
                        file.fileType !== 'case' &&
                          Boolean(file.parentCaseId && currentScopeCaseIds.has(file.parentCaseId))
                    )
                    .map((file: CaseResolverFile): string => file.id)
                )
                : null;
              const currentRemovedFileIds = new Set(
                current.files
                  .filter(
                    (file: CaseResolverFile): boolean =>
                      file.fileType !== 'case' &&
                      isPathWithinFolder(file.folder, normalizedFolder) &&
                      (!currentScopeCaseIds ||
                        Boolean(file.parentCaseId && currentScopeCaseIds.has(file.parentCaseId)))
                  )
                  .map((file: CaseResolverFile): string => file.id)
              );
              const nextFiles = current.files.filter(
                (file: CaseResolverFile): boolean =>
                  file.fileType === 'case' ||
                  !isPathWithinFolder(file.folder, normalizedFolder) ||
                  (currentScopeCaseIds !== null &&
                    (!file.parentCaseId || !currentScopeCaseIds.has(file.parentCaseId)))
              );
              const nextAssets = current.assets.filter(
                (asset: CaseResolverAssetFile): boolean =>
                  !isPathWithinFolder(asset.folder, normalizedFolder) ||
                  (currentScopeFileIds !== null &&
                    (!asset.sourceFileId || !currentScopeFileIds.has(asset.sourceFileId)))
              );
              const fallbackCaseId = (() => {
                if (!current.activeFileId || !currentRemovedFileIds.has(current.activeFileId)) {
                  return null;
                }
                const removedActiveFile =
                  current.files.find(
                    (file: CaseResolverFile): boolean => file.id === current.activeFileId
                  ) ?? null;
                if (!removedActiveFile?.parentCaseId) return null;
                const parentCase =
                  current.files.find(
                    (file: CaseResolverFile): boolean => file.id === removedActiveFile.parentCaseId
                  ) ?? null;
                return parentCase?.fileType === 'case' ? parentCase.id : null;
              })();
              const fallbackFileId =
                nextFiles.find((file: CaseResolverFile): boolean => file.fileType !== 'case')?.id ??
                nextFiles.find((file: CaseResolverFile): boolean => file.fileType === 'case')?.id ??
                null;

              return {
                ...current,
                folders: current.folders.filter(
                  (path: string): boolean => !isPathWithinFolder(path, normalizedFolder)
                ),
                folderRecords: removeOwnedFolderRecordsWithinPath({
                  records: current.folderRecords,
                  folderPath: normalizedFolder,
                  ownerCaseIds: currentScopeCaseIds,
                }),
                files: nextFiles,
                assets: nextAssets,
                activeFileId:
                  current.activeFileId && currentRemovedFileIds.has(current.activeFileId)
                    ? (fallbackCaseId ?? fallbackFileId)
                    : current.activeFileId,
              };
            },
            { persistToast: treeSaveToast }
          );

          setSelectedFileId((current: string | null): string | null => {
            if (!current || !removedFileIds.has(current)) return current;
            const removedSelectedFile =
              workspace.files.find((file: CaseResolverFile): boolean => file.id === current) ??
              null;
            if (!removedSelectedFile?.parentCaseId) return null;
            const parentCase =
              workspace.files.find(
                (file: CaseResolverFile): boolean =>
                  file.id === removedSelectedFile.parentCaseId && file.fileType === 'case'
              ) ?? null;
            return parentCase?.id ?? null;
          });
          setSelectedAssetId((current: string | null): string | null =>
            current && removedAssetIds.has(current) ? null : current
          );
          setSelectedFolderPath((current: string | null): string | null =>
            current && isPathWithinFolder(current, normalizedFolder) ? null : current
          );
        },
      });
    },
    [
      confirm,
      isLockedEditableFile,
      selectedCaseContainerId,
      selectedCaseScopeIds,
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      toast,
      treeSaveToast,
      updateWorkspace,
      workspace.assets,
      workspace.files,
    ]
  );

  const handleMoveFile = useCallback(
    async (fileId: string, targetFolder: string): Promise<void> => {
      const targetFile = workspace.files.find(
        (file: CaseResolverFile): boolean => file.id === fileId
      );
      if (targetFile && isLockedEditableFile(targetFile)) {
        toast('Document is locked. Unlock it before moving.', { variant: 'warning' });
        return;
      }
      const normalizedTarget = normalizeFolderPath(targetFolder);
      updateWorkspace(
        (current) => {
          const currentTargetFile = current.files.find(
            (file: CaseResolverFile): boolean => file.id === fileId
          );
          if (currentTargetFile && isLockedEditableFile(currentTargetFile)) return current;
          return {
            ...current,
            files: current.files.map((file: CaseResolverFile) =>
              file.id === fileId
                ? { ...file, folder: normalizedTarget, updatedAt: new Date().toISOString() }
                : file
            ),
            folders: normalizeFolderPaths(
              normalizedTarget ? [...current.folders, normalizedTarget] : current.folders
            ),
          };
        },
        { persistToast: treeSaveToast }
      );
      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
        if (current?.id !== fileId) return current;
        return {
          ...current,
          folder: normalizedTarget,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [
      isLockedEditableFile,
      setEditingDocumentDraft,
      toast,
      treeSaveToast,
      updateWorkspace,
      workspace.files,
    ]
  );

  const handleMoveAsset = useCallback(
    async (assetId: string, targetFolder: string): Promise<void> => {
      const normalizedTarget = normalizeFolderPath(targetFolder);
      updateWorkspace(
        (current) => ({
          ...current,
          assets: current.assets.map((asset: CaseResolverAssetFile) =>
            asset.id === assetId
              ? { ...asset, folder: normalizedTarget, updatedAt: new Date().toISOString() }
              : asset
          ),
          folders: normalizeFolderPaths(
            normalizedTarget ? [...current.folders, normalizedTarget] : current.folders
          ),
        }),
        { persistToast: treeSaveToast }
      );
    },
    [treeSaveToast, updateWorkspace]
  );

  const handleRenameFile = useCallback(
    async (fileId: string, nextName: string): Promise<void> => {
      const trimmedName = nextName.trim();
      if (!trimmedName) return;
      const targetFile = workspace.files.find(
        (file: CaseResolverFile): boolean => file.id === fileId
      );
      if (targetFile && isLockedEditableFile(targetFile)) {
        toast('Document is locked. Unlock it before renaming.', { variant: 'warning' });
        return;
      }
      updateWorkspace(
        (current) => {
          const currentTargetFile = current.files.find(
            (file: CaseResolverFile): boolean => file.id === fileId
          );
          if (currentTargetFile && isLockedEditableFile(currentTargetFile)) return current;
          return {
            ...current,
            files: current.files.map((file: CaseResolverFile) =>
              file.id === fileId
                ? { ...file, name: trimmedName, updatedAt: new Date().toISOString() }
                : file
            ),
          };
        },
        { persistToast: treeSaveToast }
      );
      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
        if (current?.id !== fileId) return current;
        return {
          ...current,
          name: trimmedName,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [
      isLockedEditableFile,
      setEditingDocumentDraft,
      toast,
      treeSaveToast,
      updateWorkspace,
      workspace.files,
    ]
  );

  const handleRenameAsset = useCallback(
    async (assetId: string, nextName: string): Promise<void> => {
      const trimmedName = nextName.trim();
      if (!trimmedName) return;
      updateWorkspace(
        (current) => ({
          ...current,
          assets: current.assets.map((asset: CaseResolverAssetFile) =>
            asset.id === assetId
              ? { ...asset, name: trimmedName, updatedAt: new Date().toISOString() }
              : asset
          ),
        }),
        { persistToast: treeSaveToast }
      );
    },
    [treeSaveToast, updateWorkspace]
  );

  const handleRenameFolder = useCallback(
    async (folderPath: string, nextFolderPath: string): Promise<void> => {
      const normalizedSource = normalizeFolderPath(folderPath);
      const normalizedTarget = normalizeFolderPath(nextFolderPath);
      if (!normalizedSource || !normalizedTarget) return;
      if (normalizedSource === normalizedTarget) return;
      const hasLockedFilesInFolder = workspace.files.some(
        (file: CaseResolverFile): boolean =>
          isLockedEditableFile(file) &&
          isPathWithinFolder(file.folder, normalizedSource) &&
          (!selectedCaseScopeIds ||
            Boolean(file.parentCaseId && selectedCaseScopeIds.has(file.parentCaseId)))
      );
      if (hasLockedFilesInFolder) {
        toast('Folder contains locked documents. Unlock them before renaming this folder.', {
          variant: 'warning',
        });
        return;
      }

      updateWorkspace(
        (current) => {
          const now = new Date().toISOString();
          const rename = (value: string): string =>
            renameFolderPath(value, normalizedSource, normalizedTarget);
          const currentScopeCaseIds = collectCaseScopeIds(current.files, selectedCaseContainerId);
          const currentHasLockedFilesInFolder = current.files.some(
            (file: CaseResolverFile): boolean =>
              isLockedEditableFile(file) &&
              isPathWithinFolder(file.folder, normalizedSource) &&
              (!currentScopeCaseIds ||
                Boolean(file.parentCaseId && currentScopeCaseIds.has(file.parentCaseId)))
          );
          if (currentHasLockedFilesInFolder) return current;
          const currentScopeFileIds = currentScopeCaseIds
            ? new Set<string>(
              current.files
                .filter(
                  (file: CaseResolverFile): boolean =>
                    file.fileType !== 'case' &&
                      Boolean(file.parentCaseId && currentScopeCaseIds.has(file.parentCaseId))
                )
                .map((file: CaseResolverFile): string => file.id)
            )
            : null;

          return {
            ...current,
            folders: normalizeFolderPaths(current.folders.map(rename)),
            folderRecords: renameOwnedFolderRecordsWithinPath({
              records: current.folderRecords,
              sourceFolderPath: normalizedSource,
              targetFolderPath: normalizedTarget,
              ownerCaseIds: currentScopeCaseIds,
            }),
            folderTimestamps: Object.fromEntries(
              Object.entries(current.folderTimestamps ?? {}).map(([path, timestamps]) => [
                rename(path),
                timestamps,
              ])
            ),
            files: current.files.map((file: CaseResolverFile) => {
              const shouldRename =
                isPathWithinFolder(file.folder, normalizedSource) &&
                (!currentScopeCaseIds ||
                  (file.fileType === 'case'
                    ? currentScopeCaseIds.has(file.id)
                    : Boolean(file.parentCaseId && currentScopeCaseIds.has(file.parentCaseId))));
              if (!shouldRename) return file;
              const nextFolder = rename(file.folder);
              if (nextFolder === file.folder) return file;
              return { ...file, folder: nextFolder, updatedAt: now };
            }),
            assets: current.assets.map((asset: CaseResolverAssetFile) => {
              const shouldRename =
                isPathWithinFolder(asset.folder, normalizedSource) &&
                (!currentScopeFileIds ||
                  Boolean(asset.sourceFileId && currentScopeFileIds.has(asset.sourceFileId)));
              if (!shouldRename) return asset;
              const nextFolder = rename(asset.folder);
              if (nextFolder === asset.folder) return asset;
              return { ...asset, folder: nextFolder, updatedAt: now };
            }),
          };
        },
        { persistToast: treeSaveToast }
      );

      setSelectedFolderPath((current) => {
        if (!current || !isPathWithinFolder(current, normalizedSource)) return current;
        return renameFolderPath(current, normalizedSource, normalizedTarget);
      });
      setEditingDocumentDraft((current: CaseResolverFileEditDraft | null) => {
        if (!current || !isPathWithinFolder(current.folder, normalizedSource)) return current;
        return {
          ...current,
          folder: renameFolderPath(current.folder, normalizedSource, normalizedTarget),
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [
      isLockedEditableFile,
      selectedCaseContainerId,
      selectedCaseScopeIds,
      setEditingDocumentDraft,
      setSelectedFolderPath,
      toast,
      treeSaveToast,
      updateWorkspace,
      workspace.files,
    ]
  );

  return {
    handleDeleteFolder,
    handleMoveFile,
    handleMoveAsset,
    handleRenameFile,
    handleRenameAsset,
    handleRenameFolder,
  };
};

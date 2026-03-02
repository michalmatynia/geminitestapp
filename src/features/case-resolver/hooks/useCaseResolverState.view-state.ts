import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CaseResolverFile,
  CaseResolverWorkspace,
  CaseResolverRequestedCaseStatus,
} from '@/shared/contracts/case-resolver';
import {
  resolveCaseContainerIdForFileId,
  resolveCaseContainerIdForFolderPath,
  resolveCaseResolverActiveCaseId,
  isCaseResolverCreateContextReady,
} from './useCaseResolverState.helpers';

export interface UseCaseResolverStateViewStateValue {
  selectedFileId: string | null;
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedFolderPath: string | null;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  selectedAssetId: string | null;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  folderPanelCollapsed: boolean;
  setFolderPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  activeMainView: 'workspace' | 'search';
  setActiveMainView: React.Dispatch<React.SetStateAction<'workspace' | 'search'>>;
  isPreviewPageVisible: boolean;
  setIsPreviewPageVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isPartiesModalOpen: boolean;
  setIsPartiesModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSelectFile: (fileId: string) => void;
  handleSelectAsset: (assetId: string) => void;
  handleSelectFolder: (folderPath: string | null) => void;
  activeCaseId: string | null;
  canCreateInActiveCase: boolean;
  requestedFileExists: boolean;
}

export function useCaseResolverStateViewState({
  workspace,
  setWorkspace,
  requestedFileId,
  requestedCaseStatus,
  initialWorkspaceState,
  syncPersistedWorkspaceTracking,
  clearQueuedWorkspacePersistMutation,
  handledRequestedFileIdRef,
}: {
  workspace: CaseResolverWorkspace;
  setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>>;
  requestedFileId: string | null;
  requestedCaseStatus: CaseResolverRequestedCaseStatus;
  initialWorkspaceState: CaseResolverWorkspace;
  syncPersistedWorkspaceTracking: (workspace: CaseResolverWorkspace) => void;
  clearQueuedWorkspacePersistMutation: () => void;
  handledRequestedFileIdRef: React.MutableRefObject<string | null>;
}): UseCaseResolverStateViewStateValue {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    requestedFileId ?? initialWorkspaceState.activeFileId
  );
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(false);
  const [activeMainView, setActiveMainView] = useState<'workspace' | 'search'>('workspace');
  const [isPreviewPageVisible, setIsPreviewPageVisible] = useState(false);
  const [isPartiesModalOpen, setIsPartiesModalOpen] = useState(false);

  const filesById = useMemo(
    () =>
      new Map<string, CaseResolverFile>(
        workspace.files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
      ),
    [workspace.files]
  );

  const requestedCaseContainerId = useMemo(
    (): string | null => resolveCaseContainerIdForFileId(filesById, requestedFileId),
    [filesById, requestedFileId]
  );

  const selectedCaseContainerId = useMemo((): string | null => {
    const contextFileId = selectedFileId ?? workspace.activeFileId;
    return resolveCaseContainerIdForFileId(filesById, contextFileId);
  }, [filesById, selectedFileId, workspace.activeFileId]);

  const selectedFolderCaseContainerId = useMemo(
    (): string | null =>
      resolveCaseContainerIdForFolderPath({
        filesById,
        folderRecords: workspace.folderRecords,
        folderPath: selectedFolderPath,
      }),
    [filesById, selectedFolderPath, workspace.folderRecords]
  );

  const activeCaseId = useMemo(
    (): string | null =>
      resolveCaseResolverActiveCaseId({
        requestedFileId,
        requestedCaseContainerId,
        selectedCaseContainerId,
        selectedFolderCaseContainerId,
        files: workspace.files,
      }),
    [
      requestedCaseContainerId,
      requestedFileId,
      selectedCaseContainerId,
      selectedFolderCaseContainerId,
      workspace.files,
    ]
  );

  const handleSelectFile = useCallback(
    (fileId: string): void => {
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
        setSelectedFolderPath(null);
        setSelectedAssetId(null);
        return;
      }
      setSelectedFileId(fileId);
      setWorkspace(
        (current: CaseResolverWorkspace): CaseResolverWorkspace =>
          current.activeFileId === fileId
            ? current
            : {
              ...current,
              activeFileId: fileId,
            }
      );
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
    },
    [selectedFileId, setWorkspace]
  );

  const handleSelectAsset = useCallback((assetId: string): void => {
    setSelectedFileId(null);
    setSelectedAssetId(assetId);
    setSelectedFolderPath(null);
  }, []);

  const handleSelectFolder = useCallback(
    (folderPath: string | null): void => {
      const preservedCaseId = selectedFolderCaseContainerId ?? activeCaseId;
      if (folderPath !== null && selectedFolderPath === folderPath) {
        setSelectedFileId(null);
        setSelectedFolderPath(null);
        setSelectedAssetId(null);
        if (preservedCaseId) {
          setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace =>
            current.activeFileId === preservedCaseId
              ? current
              : {
                ...current,
                activeFileId: preservedCaseId,
              }
          );
        }
        return;
      }

      const nextFolderCaseContainerId = resolveCaseContainerIdForFolderPath({
        filesById,
        folderRecords: workspace.folderRecords,
        folderPath,
      });

      setSelectedFileId(null);
      setSelectedFolderPath(folderPath);
      setSelectedAssetId(null);
      const nextActiveCaseId = nextFolderCaseContainerId ?? activeCaseId;
      if (nextActiveCaseId) {
        setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace =>
          current.activeFileId === nextActiveCaseId
            ? current
            : {
              ...current,
              activeFileId: nextActiveCaseId,
            }
        );
      }
    },
    [
      activeCaseId,
      filesById,
      selectedFolderCaseContainerId,
      selectedFolderPath,
      setWorkspace,
      workspace.folderRecords,
    ]
  );

  const canCreateInActiveCase = useMemo(
    (): boolean =>
      isCaseResolverCreateContextReady({
        activeCaseId,
        requestedFileId,
        requestedCaseStatus,
      }),
    [activeCaseId, requestedCaseStatus, requestedFileId]
  );

  const requestedFileExists = useMemo(
    (): boolean =>
      Boolean(
        requestedFileId &&
        workspace.files.some((file: CaseResolverFile): boolean => file.id === requestedFileId)
      ),
    [requestedFileId, workspace.files]
  );

  useEffect(() => {
    if (!requestedFileId) {
      handledRequestedFileIdRef.current = null;
      return;
    }
    if (!requestedFileExists) {
      handledRequestedFileIdRef.current = null;
      if (selectedFileId !== requestedFileId) {
        setSelectedFileId(requestedFileId);
      }
      if (selectedAssetId !== null) {
        setSelectedAssetId(null);
      }
      if (selectedFolderPath !== null) {
        setSelectedFolderPath(null);
      }
      if (workspace.activeFileId !== null) {
        setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
          if (current.activeFileId === null) return current;
          const nextWorkspace = {
            ...current,
            activeFileId: null,
          };
          syncPersistedWorkspaceTracking(nextWorkspace);
          clearQueuedWorkspacePersistMutation();
          return nextWorkspace;
        });
      }
      return;
    }

    if (handledRequestedFileIdRef.current === requestedFileId) return;

    handledRequestedFileIdRef.current = requestedFileId;
    if (selectedFileId !== requestedFileId) {
      setSelectedFileId(requestedFileId);
    }
    if (selectedAssetId !== null) {
      setSelectedAssetId(null);
    }
    if (selectedFolderPath !== null) {
      setSelectedFolderPath(null);
    }
    if (workspace.activeFileId !== requestedFileId) {
      setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
        if (current.activeFileId === requestedFileId) return current;
        const nextWorkspace = {
          ...current,
          activeFileId: requestedFileId,
        };
        syncPersistedWorkspaceTracking(nextWorkspace);
        clearQueuedWorkspacePersistMutation();
        return nextWorkspace;
      });
    }
  }, [
    clearQueuedWorkspacePersistMutation,
    requestedFileExists,
    requestedFileId,
    selectedAssetId,
    selectedFileId,
    selectedFolderPath,
    syncPersistedWorkspaceTracking,
    workspace.activeFileId,
    setWorkspace,
    handledRequestedFileIdRef,
  ]);

  return {
    selectedFileId,
    setSelectedFileId,
    selectedFolderPath,
    setSelectedFolderPath,
    selectedAssetId,
    setSelectedAssetId,
    folderPanelCollapsed,
    setFolderPanelCollapsed,
    activeMainView,
    setActiveMainView,
    isPreviewPageVisible,
    setIsPreviewPageVisible,
    isPartiesModalOpen,
    setIsPartiesModalOpen,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    activeCaseId,
    canCreateInActiveCase,
    requestedFileExists,
  };
}

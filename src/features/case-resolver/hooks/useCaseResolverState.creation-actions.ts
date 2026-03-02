import { useCallback, useRef } from 'react';
import type {
  CaseResolverFile,
  CaseResolverFolderRecord,
  CaseResolverWorkspace,
  CaseResolverRequestedCaseStatus,
} from '@/shared/contracts/case-resolver';
import { createId, createUniqueFolderPath } from '@/features/case-resolver/utils/caseResolverUtils';
import {
  appendOwnedFolderRecords,
  createUniqueCaseFileName,
  normalizeFolderRecords,
  resolveCaseScopedFolderTarget,
  resolveCaseContainerIdForFileId,
  resolveCaseResolverActiveCaseId,
} from './useCaseResolverState.helpers';
import {
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
} from '../workspace-persistence';
import { createCaseResolverFile, normalizeFolderPaths } from '../settings';

import { type SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';
import { type Toast } from '@/shared/contracts/ui';

export function useCaseResolverStateCreationActions({
  workspace: _workspace,
  updateWorkspace,
  setWorkspace,
  syncPersistedWorkspaceTracking,
  requestedFileId,
  selectedFileId,
  requestedCaseStatus,
  setRequestedCaseStatus,
  activeCaseId,
  canCreateInActiveCase,
  defaultTagId,
  defaultCaseIdentifierId,
  defaultCategoryId,
  setSelectedFileId,
  setSelectedAssetId,
  setSelectedFolderPath,
  settingsStoreRef,
  toast,
}: {
  workspace: CaseResolverWorkspace;
  updateWorkspace: (
    updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
    options?: {
      persistToast?: string;
      persistNow?: boolean;
      mutationId?: string;
      source?: string;
      skipNormalization?: boolean;
    }
  ) => void;
  setWorkspace: React.Dispatch<React.SetStateAction<CaseResolverWorkspace>>;
  syncPersistedWorkspaceTracking: (workspace: CaseResolverWorkspace) => void;
  requestedFileId: string | null;
  selectedFileId: string | null;
  requestedCaseStatus: CaseResolverRequestedCaseStatus;
  setRequestedCaseStatus: (status: CaseResolverRequestedCaseStatus) => void;
  activeCaseId: string | null;
  canCreateInActiveCase: boolean;
  defaultTagId: string | null;
  defaultCaseIdentifierId: string | null;
  defaultCategoryId: string | null;
  setSelectedFileId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedFolderPath: React.Dispatch<React.SetStateAction<string | null>>;
  settingsStoreRef: React.MutableRefObject<SettingsStoreValue>;
  toast: Toast;
}) {
  const createContextRecoveryInFlightRef = useRef(false);

  const resolveCaseIdForWorkspace = useCallback(
    (targetWorkspace: CaseResolverWorkspace): string | null => {
      const targetFilesById = new Map<string, CaseResolverFile>(
        targetWorkspace.files.map((file: CaseResolverFile): [string, CaseResolverFile] => [
          file.id,
          file,
        ])
      );
      const targetRequestedCaseContainerId = resolveCaseContainerIdForFileId(
        targetFilesById,
        requestedFileId
      );
      const targetContextFileId = selectedFileId ?? targetWorkspace.activeFileId;
      const targetSelectedCaseContainerId = resolveCaseContainerIdForFileId(
        targetFilesById,
        targetContextFileId
      );
      return resolveCaseResolverActiveCaseId({
        requestedFileId,
        requestedCaseContainerId: targetRequestedCaseContainerId,
        selectedCaseContainerId: targetSelectedCaseContainerId,
        files: targetWorkspace.files,
      });
    },
    [requestedFileId, selectedFileId]
  );

  const recoverCreateContextCaseId = useCallback(
    async (source: string): Promise<string | null> => {
      if (createContextRecoveryInFlightRef.current) return null;
      if (!requestedFileId) return null;

      createContextRecoveryInFlightRef.current = true;
      try {
        const refreshedWorkspace = await fetchCaseResolverWorkspaceSnapshot(source);
        if (!refreshedWorkspace) return null;
        const recoveredCaseId = resolveCaseIdForWorkspace(refreshedWorkspace);
        if (!recoveredCaseId) return null;

        syncPersistedWorkspaceTracking(refreshedWorkspace);
        // Note: we can't easily clear queued refs from here if they are in useCaseResolverState
        // but we can pass them in if needed. For now, let's assume we handle the core recovery.

        setWorkspace(refreshedWorkspace);
        setRequestedCaseStatus('ready');

        settingsStoreRef.current.refetch();
        logCaseResolverWorkspaceEvent({
          source,
          action: 'create_context_recovered',
          workspaceRevision: getCaseResolverWorkspaceRevision(refreshedWorkspace),
        });
        return recoveredCaseId;
      } finally {
        createContextRecoveryInFlightRef.current = false;
      }
    },
    [
      requestedFileId,
      resolveCaseIdForWorkspace,
      syncPersistedWorkspaceTracking,
      setWorkspace,
      setRequestedCaseStatus,
      settingsStoreRef,
    ]
  );

  const createFolderForCase = useCallback(
    (ownerCaseId: string, targetFolderPath: string | null): void => {
      updateWorkspace(
        (current) => {
          const normalizedTargetFolder = resolveCaseScopedFolderTarget({
            targetFolderPath,
            ownerCaseId,
            folderRecords: current.folderRecords,
          });
          const existingFoldersForOwner = normalizeFolderRecords(current.folderRecords)
            .filter(
              (record: CaseResolverFolderRecord): boolean => record.ownerCaseId === ownerCaseId
            )
            .map((record: CaseResolverFolderRecord): string => record.path);
          const nextPath = createUniqueFolderPath(existingFoldersForOwner, normalizedTargetFolder);
          const currentFolderRecords = normalizeFolderRecords(current.folderRecords);
          const ownedRecordExists = currentFolderRecords.some(
            (record: CaseResolverFolderRecord): boolean =>
              record.path === nextPath && (record.ownerCaseId ?? null) === ownerCaseId
          );
          if (ownedRecordExists) return current;
          return {
            ...current,
            folders: normalizeFolderPaths([...current.folders, nextPath]),
            folderRecords: appendOwnedFolderRecords({
              records: current.folderRecords,
              folderPath: nextPath,
              ownerCaseId,
            }),
          };
        },
        { persistToast: 'Case Resolver tree changes saved.' }
      );
    },
    [updateWorkspace]
  );

  const createDocumentForCase = useCallback(
    ({
      ownerCaseId,
      targetFolderPath,
    }: {
      ownerCaseId: string;
      targetFolderPath: string | null;
    }): void => {
      let createdDocumentId: string | null = null;
      updateWorkspace(
        (current) => {
          const folder = resolveCaseScopedFolderTarget({
            targetFolderPath,
            ownerCaseId,
            folderRecords: current.folderRecords,
          });
          const name = createUniqueCaseFileName({
            files: current.files,
            folder,
            baseName: 'New Document',
          });
          const file = createCaseResolverFile({
            id: createId('case-file'),
            fileType: 'document',
            name,
            folder,
            parentCaseId: ownerCaseId,
            editorType: 'document',
            tagId: defaultTagId,
            caseIdentifierId: defaultCaseIdentifierId,
            categoryId: defaultCategoryId,
          });
          createdDocumentId = file.id;

          return {
            ...current,
            files: [...current.files, file],
            folders: normalizeFolderPaths([...current.folders, folder]),
            folderRecords: appendOwnedFolderRecords({
              records: current.folderRecords,
              folderPath: folder,
              ownerCaseId,
            }),
          };
        },
        { persistToast: 'Case Resolver tree changes saved.' }
      );
      setSelectedAssetId(null);
      setSelectedFolderPath(null);
      if (createdDocumentId) {
        setSelectedFileId(createdDocumentId);
      }
    },
    [
      defaultCaseIdentifierId,
      defaultCategoryId,
      defaultTagId,
      setSelectedAssetId,
      setSelectedFileId,
      setSelectedFolderPath,
      updateWorkspace,
    ]
  );

  const handleCreateFolder = useCallback(
    (targetFolderPath: string | null): void => {
      if (activeCaseId && canCreateInActiveCase) {
        createFolderForCase(activeCaseId, targetFolderPath);
        return;
      }
      if (requestedCaseStatus === 'loading' || createContextRecoveryInFlightRef.current) {
        toast('Case context is still loading. Please wait.', { variant: 'warning' });
        return;
      }
      if (requestedFileId) {
        setRequestedCaseStatus('loading');
        void (async (): Promise<void> => {
          const recoveredCaseId = await recoverCreateContextCaseId(
            'case_view_create_folder_recover'
          );
          if (recoveredCaseId) {
            createFolderForCase(recoveredCaseId, targetFolderPath);
            return;
          }
          setRequestedCaseStatus('missing');
          logCaseResolverWorkspaceEvent({
            source: 'case_view',
            action: 'create_folder_blocked',
            message: 'No active case context is available after refresh.',
          });
          toast('Cannot create folder without a selected case.', { variant: 'warning' });
        })();
        return;
      }
      logCaseResolverWorkspaceEvent({
        source: 'case_view',
        action: 'create_folder_blocked',
        message: 'No active case context is available.',
      });
      toast('Cannot create folder without a selected case.', { variant: 'warning' });
    },
    [
      activeCaseId,
      canCreateInActiveCase,
      createFolderForCase,
      recoverCreateContextCaseId,
      requestedCaseStatus,
      requestedFileId,
      toast,
      setRequestedCaseStatus,
    ]
  );

  const handleCreateFile = useCallback(
    (targetFolderPath: string | null): void => {
      if (activeCaseId && canCreateInActiveCase) {
        createDocumentForCase({
          ownerCaseId: activeCaseId,
          targetFolderPath,
        });
        return;
      }
      if (requestedCaseStatus === 'loading' || createContextRecoveryInFlightRef.current) {
        toast('Case context is still loading. Please wait.', { variant: 'warning' });
        return;
      }
      if (requestedFileId) {
        setRequestedCaseStatus('loading');
        void (async (): Promise<void> => {
          const recoveredCaseId = await recoverCreateContextCaseId('case_view_create_file_recover');
          if (recoveredCaseId) {
            createDocumentForCase({
              ownerCaseId: recoveredCaseId,
              targetFolderPath,
            });
            return;
          }
          setRequestedCaseStatus('missing');
          logCaseResolverWorkspaceEvent({
            source: 'case_view',
            action: 'create_file_blocked',
            message: 'No active case context is available after refresh.',
          });
          toast('Cannot create document without a selected case.', { variant: 'warning' });
        })();
        return;
      }
      logCaseResolverWorkspaceEvent({
        source: 'case_view',
        action: 'create_file_blocked',
        message: 'No active case context is available.',
      });
      toast('Cannot create document without a selected case.', { variant: 'warning' });
    },
    [
      activeCaseId,
      canCreateInActiveCase,
      createDocumentForCase,
      recoverCreateContextCaseId,
      requestedCaseStatus,
      requestedFileId,
      setRequestedCaseStatus,
      toast,
    ]
  );

  return {
    handleCreateFolder,
    handleCreateFile,
    recoverCreateContextCaseId,
  };
}

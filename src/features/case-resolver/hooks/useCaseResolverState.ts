'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import type {
  CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  CASE_RESOLVER_CAPTURE_SETTINGS_KEY,
  parseCaseResolverCaptureSettings,
} from '@/features/case-resolver-capture/settings';
import {
  deriveDocumentContentSync,
  ensureHtmlForPreview,
  ensureSafeDocumentHtml,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';
import {
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
} from '@/features/filemaker/settings';
import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
import {
  PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
  PROMPT_EXPLODER_BRIDGE_STORAGE_EVENT,
} from '@/features/prompt-exploder/bridge';
import type {
  CaseResolverCategory,
  CaseResolverEditorNodeContext,
  CaseResolverFile,
  CaseResolverFolderRecord,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { usePrompt } from '@/shared/hooks/ui/usePrompt';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY,
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_SETTINGS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverFile,
  hasCaseResolverWorkspaceFilesArray,
  parseCaseResolverCategories,
  parseCaseResolverDefaultDocumentFormat,
  parseCaseResolverIdentifiers,
  parseCaseResolverSettings,
  parseCaseResolverTags,
  normalizeCaseResolverWorkspace,
  normalizeFolderPaths,
  parseCaseResolverWorkspace,
} from '../settings';
import {
  type CaseResolverFileEditDraft,
  type CaseResolverRequestedCaseStatus,
  type CaseResolverStateValue,
} from '../types';
import {
  applyPromptExploderTransferLifecycleUpdate,
  type PromptExploderTransferUiStatus,
} from './prompt-exploder-transfer-lifecycle';
import { useCaseResolverStateFolderActions } from './useCaseResolverState.folder-actions';
import {
  buildFileEditDraft,
  createCaseResolverHistorySnapshotEntry,
  createId,
  createUniqueFolderPath,
} from '../utils/caseResolverUtils';
import {
  computeCaseResolverConflictRetryDelayMs,
  createCaseResolverWorkspaceMutationId,
  fetchCaseResolverWorkspaceMetadata,
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
  persistCaseResolverWorkspaceSnapshot,
  stampCaseResolverWorkspaceMutation,
} from '../workspace-persistence';
import { useCaseResolverStateAssetActions } from './useCaseResolverState.asset-actions';
import {
  CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT,
  buildCaseResolverDraftCanonicalState,
  appendOwnedFolderRecords,
  canCaseResolverDraftPerformInitialManualSave,
  clearStoredEditorDraft,
  collectCaseScopeIds,
  createUniqueCaseFileName,
  hasCaseResolverDraftMeaningfulChanges,
  isCaseResolverCreateContextReady,
  normalizeFolderRecords,
  resolveCaseScopedFolderTarget,
  serializeWorkspaceForUnsavedChangesCheck,
  resolveCaseContainerIdForFileId,
  resolveCaseResolverActiveCaseId,
  resolveCaseResolverFileById,
} from './useCaseResolverState.helpers';
import {
  applyPendingPromptExploderPayloadToCaseResolver,
  discardPendingCaseResolverPromptExploderPayload,
  readCaseResolverPromptExploderPayloadState,
  resolvePromptExploderPendingPayloadIdentity,
  type CaseResolverPromptExploderApplyUiDiagnostics,
  type CaseResolverPromptExploderPayloadReadState,
  type CaseResolverPromptExploderPendingPayload,
} from './useCaseResolverState.prompt-exploder-sync';
import { useCaseResolverStateSelectionActions } from './useCaseResolverState.selection-actions';
import { useCaseResolverPersistence } from './useCaseResolverState.persistence-actions';
import { useCaseResolverPromptExploder } from './useCaseResolverState.prompt-exploder-actions';

const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';
const CASE_RESOLVER_REQUESTED_FILE_REFRESH_MAX_ATTEMPTS = 20;
const CASE_RESOLVER_REQUESTED_FILE_REFRESH_INTERVAL_MS = 250;
const CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_KEY =
  'case_resolver:applied_prompt_exploder_transfer_ids';
const CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_LIMIT = 80;

type CaseResolverOpenFileEditorOptions = {
  nodeContext?: CaseResolverEditorNodeContext | null;
};

/**
 * Custom hook to manage the complex state and logic of the Case Resolver page.
 */
export function useCaseResolverState(): CaseResolverStateValue {
  const settingsStore = useSettingsStore();
  const settingsStoreRef = useRef(settingsStore);
  settingsStoreRef.current = settingsStore;
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const { PromptInputModal } = usePrompt();
  const { isMenuCollapsed, setIsMenuCollapsed } = useAdminLayout();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');
  const shouldOpenEditorFromQuery = searchParams.get('openEditor') === '1';
  const requestedPromptExploderSessionId = searchParams.get('promptExploderSessionId')?.trim() ?? '';

  const rawWorkspace = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverIdentifiers = settingsStore.get(CASE_RESOLVER_IDENTIFIERS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const rawCaseResolverSettings = settingsStore.get(CASE_RESOLVER_SETTINGS_KEY);
  const rawCaseResolverDefaultDocumentFormat = settingsStore.get(
    CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY
  );
  const rawFilemakerDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCaseResolverCaptureSettings = settingsStore.get(CASE_RESOLVER_CAPTURE_SETTINGS_KEY);
  
  const parsedWorkspace = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspace),
    [rawWorkspace]
  );
  const canHydrateWorkspaceFromStore = useMemo(
    (): boolean => hasCaseResolverWorkspaceFilesArray(rawWorkspace),
    [rawWorkspace]
  );
  const caseResolverTags = useMemo(
    (): CaseResolverTag[] => parseCaseResolverTags(rawCaseResolverTags),
    [rawCaseResolverTags]
  );
  const caseResolverIdentifiers = useMemo(
    (): CaseResolverIdentifier[] => parseCaseResolverIdentifiers(rawCaseResolverIdentifiers),
    [rawCaseResolverIdentifiers]
  );
  const caseResolverCategories = useMemo(
    (): CaseResolverCategory[] => parseCaseResolverCategories(rawCaseResolverCategories),
    [rawCaseResolverCategories]
  );
  const caseResolverSettings = useMemo(() => {
    const parsed = parseCaseResolverSettings(rawCaseResolverSettings);
    const defaultDocumentFormat = parseCaseResolverDefaultDocumentFormat(
      rawCaseResolverDefaultDocumentFormat,
      parsed.defaultDocumentFormat
    );
    if (defaultDocumentFormat === parsed.defaultDocumentFormat) return parsed;
    return {
      ...parsed,
      defaultDocumentFormat,
    };
  }, [rawCaseResolverDefaultDocumentFormat, rawCaseResolverSettings]);
  const filemakerDatabase = useMemo(
    () => parseFilemakerDatabase(rawFilemakerDatabase),
    [rawFilemakerDatabase]
  );
  const caseResolverCaptureSettings = useMemo(
    () => parseCaseResolverCaptureSettings(rawCaseResolverCaptureSettings),
    [rawCaseResolverCaptureSettings]
  );
  
  const countriesQuery = useCountries();
  const countries = countriesQuery.data ?? [];

  const initialWorkspaceState = useMemo((): CaseResolverWorkspace => {
    if (!requestedFileId) return parsedWorkspace;
    const hasRequestedFile = parsedWorkspace.files.some(
      (file: CaseResolverFile): boolean => file.id === requestedFileId
    );
    if (hasRequestedFile) {
      if (parsedWorkspace.activeFileId === requestedFileId) return parsedWorkspace;
      return {
        ...parsedWorkspace,
        activeFileId: requestedFileId,
      };
    }
    if (parsedWorkspace.activeFileId === null) return parsedWorkspace;
    return {
      ...parsedWorkspace,
      activeFileId: null,
    };
  }, [parsedWorkspace, requestedFileId]);

  const [workspace, setWorkspace] = useState<CaseResolverWorkspace>(initialWorkspaceState);
  const workspaceRef = useRef<CaseResolverWorkspace>(initialWorkspaceState);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    requestedFileId ?? initialWorkspaceState.activeFileId
  );
  const [requestedCaseStatus, setRequestedCaseStatus] =
    useState<CaseResolverRequestedCaseStatus>(requestedFileId ? 'loading' : 'ready');
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(false);
  const [activeMainView, setActiveMainView] = useState<'workspace' | 'search'>('workspace');
  const [isPreviewPageVisible, setIsPreviewPageVisible] = useState(false);
  const [isPartiesModalOpen, setIsPartiesModalOpen] = useState(false);
  const [editingDocumentDraft, setEditingDocumentDraft] = useState<CaseResolverFileEditDraft | null>(null);
  const [editingDocumentNodeContext, setEditingDocumentNodeContext] =
    useState<CaseResolverEditorNodeContext | null>(null);
  const [isUploadingScanDraftFiles, setIsUploadingScanDraftFiles] = useState(false);
  const [uploadingScanSlotId, setUploadingScanSlotId] = useState<string | null>(null);

  const [, setPersistedWorkspaceSnapshot] = useState<string>(
    JSON.stringify(initialWorkspaceState)
  );
  const [persistedWorkspaceComparableSnapshot, setPersistedWorkspaceComparableSnapshot] =
    useState<string>(() =>
      serializeWorkspaceForUnsavedChangesCheck(initialWorkspaceState)
    );

  const {
    isWorkspaceSaving,
    workspaceSaveStatus,
    workspaceSaveError,
    setWorkspaceSaveStatus,
    setWorkspaceSaveError,
    lastPersistedValueRef,
    lastPersistedRevisionRef,
    pendingSaveToastRef,
    queuedSerializedWorkspaceRef,
    queuedExpectedRevisionRef,
    queuedMutationIdRef,
    conflictRetryTimerRef,
    persistWorkspaceTimerRef,
    persistWorkspaceInFlightRef,
    workspaceConflictAutoRetryCountRef,
    syncPersistedWorkspaceTracking,
    clearConflictRetryTimer,
    flushWorkspacePersist,
  } = useCaseResolverPersistence({
    initialWorkspaceState,
    settingsStoreRef,
    toast,
    setPersistedWorkspaceSnapshot,
    setPersistedWorkspaceComparableSnapshot,
  });

  const {
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal,
    promptExploderPayloadRefreshVersion,
    promptExploderApplyDiagnostics,
    setPromptExploderApplyDiagnostics,
    refreshPendingPromptExploderPayload,
    handleDiscardPendingPromptExploderPayload,
    handleApplyPendingPromptExploderPayload,
    transitionPromptExploderApplyDiagnostics,
  } = useCaseResolverPromptExploder({
    workspace,
    workspaceRef,
    updateWorkspace: (updater: any, options: any) => updateWorkspace(updater, options),
    setEditingDocumentDraft,
    filemakerDatabase,
    caseResolverCaptureSettings,
    requestedFileId,
    shouldOpenEditorFromQuery,
    requestedPromptExploderSessionId,
    toast,
    flushWorkspacePersist,
  });

  const defaultTagId = caseResolverTags[0]?.id ?? null;
  const defaultCaseIdentifierId = caseIdentifierId ?? caseResolverIdentifiers[0]?.id ?? null;
  const defaultCategoryId = categoryId ?? caseResolverCategories[0]?.id ?? null;

  const handledRequestedFileIdRef = useRef<string | null>(null);
  const requestedWorkspaceRefreshFileIdRef = useRef<string | null>(null);
  const requestedWorkspaceMissingFileIdRef = useRef<string | null>(null);
  const createContextRecoveryInFlightRef = useRef(false);
  const isApplyingPromptExploderPartyProposalRef = useRef(
    isApplyingPromptExploderPartyProposal
  );
  const setRequestedCaseStatusSafe = useCallback(
    (nextStatus: CaseResolverRequestedCaseStatus): void => {
      if (requestedCaseStatusRef.current === nextStatus) return;
      requestedCaseStatusRef.current = nextStatus;
      setRequestedCaseStatus(nextStatus);
    },
    []
  );
  const refetchSettingsStore = useCallback((): void => {
    settingsStoreRef.current.refetch();
  }, []);

  useEffect(() => {
    requestedCaseStatusRef.current = requestedCaseStatus;
  }, [requestedCaseStatus]);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    if (canHydrateWorkspaceFromStore) return;
    if (requestedFileId) return;
    let isCancelled = false;
    void (async (): Promise<void> => {
      const snapshot = await fetchCaseResolverWorkspaceSnapshot('case_view_bootstrap');
      if (!snapshot || isCancelled) return;
      const snapshotRevision = getCaseResolverWorkspaceRevision(snapshot);
      setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
        const currentRevision = getCaseResolverWorkspaceRevision(current);
        if (snapshotRevision <= currentRevision) return current;
        syncPersistedWorkspaceTracking(snapshot);
        queuedSerializedWorkspaceRef.current = null;
        queuedExpectedRevisionRef.current = null;
        queuedMutationIdRef.current = null;
        return snapshot;
      });
      settingsStoreRef.current.refetch();
    })();
    return (): void => {
      isCancelled = true;
    };
  }, [canHydrateWorkspaceFromStore, requestedFileId, syncPersistedWorkspaceTracking]);

  // Sync with store
  useEffect(() => {
    if (!canHydrateWorkspaceFromStore) return;
    if (isApplyingPromptExploderPartyProposal) return;
    const incomingRevision = getCaseResolverWorkspaceRevision(parsedWorkspace);
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
      if (requestedFileId) {
        const currentHasRequestedFile = current.files.some(
          (file: CaseResolverFile): boolean => file.id === requestedFileId
        );
        const incomingHasRequestedFile = parsedWorkspace.files.some(
          (file: CaseResolverFile): boolean => file.id === requestedFileId
        );
        if (!currentHasRequestedFile && incomingHasRequestedFile) {
          syncPersistedWorkspaceTracking(parsedWorkspace);
          queuedSerializedWorkspaceRef.current = null;
          queuedExpectedRevisionRef.current = null;
          queuedMutationIdRef.current = null;
          return parsedWorkspace;
        }
      }

      const currentRevision = getCaseResolverWorkspaceRevision(current);
      if (incomingRevision <= currentRevision) return current;

      syncPersistedWorkspaceTracking(parsedWorkspace);
      queuedSerializedWorkspaceRef.current = null;
      queuedExpectedRevisionRef.current = null;
      queuedMutationIdRef.current = null;
      return parsedWorkspace;
    });
  }, [
    canHydrateWorkspaceFromStore,
    isApplyingPromptExploderPartyProposal,
    parsedWorkspace,
    requestedFileId,
    syncPersistedWorkspaceTracking,
  ]);

  useEffect(() => {
    return (): void => {
      clearConflictRetryTimer();
      if (persistWorkspaceTimerRef.current) {
        window.clearTimeout(persistWorkspaceTimerRef.current);
        persistWorkspaceTimerRef.current = null;
      }
    };
  }, [clearConflictRetryTimer]);

  const updateWorkspace = useCallback(
    (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
      options?: {
        persistToast?: string;
        persistNow?: boolean;
        mutationId?: string;
        source?: string;
        skipNormalization?: boolean;
      }
    ): void => {
      setWorkspace((current: CaseResolverWorkspace) => {
        const baseCurrent = options?.skipNormalization
          ? current
          : normalizeCaseResolverWorkspace(current);
        const updated = updater(baseCurrent);
        if (updated === current || updated === baseCurrent) return current;
        const normalizedUpdated = options?.skipNormalization
          ? updated
          : normalizeCaseResolverWorkspace(updated);
        const mutationId =
          options?.mutationId?.trim() ||
          createCaseResolverWorkspaceMutationId('case-resolver-workspace');
        const stampedWorkspace = stampCaseResolverWorkspaceMutation(normalizedUpdated, {
          baseRevision: getCaseResolverWorkspaceRevision(baseCurrent),
          mutationId,
          normalizeWorkspace: options?.skipNormalization ? false : true,
        });
        logCaseResolverWorkspaceEvent({
          source: options?.source ?? 'case_view',
          action: 'mutation_enqueued',
          mutationId,
          expectedRevision:
            queuedExpectedRevisionRef.current ?? lastPersistedRevisionRef.current,
          workspaceRevision: getCaseResolverWorkspaceRevision(stampedWorkspace),
        });
        if (options?.persistToast) pendingSaveToastRef.current = options.persistToast;
        if (queuedExpectedRevisionRef.current === null) {
          queuedExpectedRevisionRef.current = lastPersistedRevisionRef.current;
        }
        queuedMutationIdRef.current = mutationId;
        queuedSerializedWorkspaceRef.current = JSON.stringify(stampedWorkspace);
        return stampedWorkspace;
      });
      if (options?.persistToast || options?.persistNow) {
        window.setTimeout((): void => {
          flushWorkspacePersist();
        }, 0);
      }
    },
    [flushWorkspacePersist]
  );

  const workspaceComparableSnapshot = useMemo(
    (): string => serializeWorkspaceForUnsavedChangesCheck(workspace),
    [workspace]
  );
  const isWorkspaceDirty = useMemo(
    (): boolean =>
      workspaceComparableSnapshot !== persistedWorkspaceComparableSnapshot,
    [persistedWorkspaceComparableSnapshot, workspaceComparableSnapshot]
  );

  useEffect(() => {
    if (isWorkspaceSaving) return;
    if (isWorkspaceDirty) {
      setWorkspaceSaveStatus((current) =>
        current === 'conflict' || current === 'error' ? current : 'dirty'
      );
      return;
    }
    setWorkspaceSaveStatus('saved');
    setWorkspaceSaveError(null);
  }, [isWorkspaceDirty, isWorkspaceSaving]);

  const handleSelectFile = useCallback((fileId: string): void => {
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
      return;
    }
    setSelectedFileId(fileId);
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => (
      current.activeFileId === fileId
        ? current
        : {
          ...current,
          activeFileId: fileId,
        }
    ));
    setSelectedFolderPath(null);
    setSelectedAssetId(null);
  }, [selectedFileId]);

  const handleSelectAsset = useCallback((assetId: string): void => {
    setSelectedFileId(null);
    setSelectedAssetId(assetId);
    setSelectedFolderPath(null);
  }, []);

  const handleSelectFolder = useCallback((folderPath: string | null): void => {
    if (folderPath !== null && selectedFolderPath === folderPath) {
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
      return;
    }
    setSelectedFileId(null);
    setSelectedFolderPath(folderPath);
    setSelectedAssetId(null);
  }, [selectedFolderPath]);

  const filesById = useMemo(
    () => new Map<string, CaseResolverFile>(workspace.files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])),
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

  const activeCaseId = useMemo(
    (): string | null =>
      resolveCaseResolverActiveCaseId({
        requestedFileId,
        requestedCaseContainerId,
        selectedCaseContainerId,
        files: workspace.files,
      }),
    [requestedCaseContainerId, requestedFileId, selectedCaseContainerId, workspace.files]
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

  const resolveCaseIdForWorkspace = useCallback(
    (targetWorkspace: CaseResolverWorkspace): string | null => {
      const targetFilesById = new Map<string, CaseResolverFile>(
        targetWorkspace.files.map(
          (file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file]
        )
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
        queuedSerializedWorkspaceRef.current = null;
        queuedExpectedRevisionRef.current = null;
        queuedMutationIdRef.current = null;
        requestedWorkspaceRefreshFileIdRef.current = null;
        requestedWorkspaceMissingFileIdRef.current = null;
        handledRequestedFileIdRef.current = null;

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
    [requestedFileId, resolveCaseIdForWorkspace, syncPersistedWorkspaceTracking]
  );

  const createFolderForCase = useCallback(
    (ownerCaseId: string, targetFolderPath: string | null): void => {
      updateWorkspace((current) => {
        const normalizedTargetFolder = resolveCaseScopedFolderTarget({
          targetFolderPath,
          ownerCaseId,
          folderRecords: current.folderRecords,
        });
        const existingFoldersForOwner = normalizeFolderRecords(current.folderRecords)
          .filter((record: CaseResolverFolderRecord): boolean => record.ownerCaseId === ownerCaseId)
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
      }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
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
      updateWorkspace((current) => {
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
      }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });
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
      updateWorkspace
    ]
  );

  const selectedCaseScopeIds = useMemo(
    (): Set<string> | null => collectCaseScopeIds(workspace.files, activeCaseId),
    [activeCaseId, workspace.files]
  );

  const handleCreateFolder = useCallback((targetFolderPath: string | null): void => {
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
        const recoveredCaseId = await recoverCreateContextCaseId('case_view_create_folder_recover');
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
  }, [
    activeCaseId,
    canCreateInActiveCase,
    createFolderForCase,
    recoverCreateContextCaseId,
    requestedCaseStatus,
    requestedFileId,
    requestedPromptExploderSessionId,
    shouldOpenEditorFromQuery,
    toast,
  ]);

  const handleCreateFile = useCallback((targetFolderPath: string | null): void => {
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
  }, [
    activeCaseId,
    canCreateInActiveCase,
    createDocumentForCase,
    recoverCreateContextCaseId,
    requestedCaseStatus,
    requestedFileId,
    setRequestedCaseStatus,
    toast,
  ]);

  const {
    handleCreateScanFile,
    handleCreateNodeFile,
    handleUploadScanFiles,
    handleRunScanFileOcr,
    handleCreateDocumentFromText,
    handleCreateImageAsset,
    handleUploadAssets,
    handleAttachAssetFile,
  } = useCaseResolverStateAssetActions({
    settingsStore,
    toast,
    updateWorkspace,
    workspace,
    editingDocumentDraft,
    setEditingDocumentDraft,
    setIsUploadingScanDraftFiles,
    setUploadingScanSlotId,
    defaultTagId,
    defaultCaseIdentifierId,
    defaultCategoryId,
    activeCaseId,
    requestedCaseStatus,
    setSelectedFileId,
    setSelectedFolderPath,
    setSelectedAssetId,
    treeSaveToast: CASE_RESOLVER_TREE_SAVE_TOAST,
  });

  const requestedFileExists = useMemo(
    (): boolean =>
      Boolean(
        requestedFileId &&
        workspace.files.some((file: CaseResolverFile): boolean => file.id === requestedFileId)
      ),
    [requestedFileId, workspace.files]
  );

  useEffect(() => {
    if (requestedFileId) return;
    handledRequestedFileIdRef.current = null;
    requestedWorkspaceRefreshFileIdRef.current = null;
    requestedWorkspaceMissingFileIdRef.current = null;
    setRequestedCaseStatusSafe('ready');
  }, [requestedFileId, setRequestedCaseStatusSafe]);

  useEffect(() => {
    if (!requestedFileId) {
      requestedWorkspaceRefreshFileIdRef.current = null;
      requestedWorkspaceMissingFileIdRef.current = null;
      return;
    }
    if (requestedFileExists) {
      // The requested file is present: stop refresh/missing flows, and let
      // the selection effect reconcile final ready state once.
      requestedWorkspaceRefreshFileIdRef.current = null;
      requestedWorkspaceMissingFileIdRef.current = null;
      return;
    }
    if (requestedWorkspaceMissingFileIdRef.current === requestedFileId) {
      setRequestedCaseStatusSafe('missing');
      return;
    }
    if (requestedWorkspaceRefreshFileIdRef.current === requestedFileId) return;
    setRequestedCaseStatusSafe('loading');

    requestedWorkspaceRefreshFileIdRef.current = requestedFileId;
    let isCancelled = false;
    let observedWorkspaceRevision = getCaseResolverWorkspaceRevision(workspaceRef.current);
    const wait = async (ms: number): Promise<void> =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });
    void (async (): Promise<void> => {
      for (
        let attempt = 0;
        attempt < CASE_RESOLVER_REQUESTED_FILE_REFRESH_MAX_ATTEMPTS;
        attempt += 1
      ) {
        const refreshedMetadata = await fetchCaseResolverWorkspaceMetadata('case_view');
        if (isCancelled) return;
        if (!refreshedMetadata?.exists) {
          if (attempt < CASE_RESOLVER_REQUESTED_FILE_REFRESH_MAX_ATTEMPTS - 1) {
            await wait(CASE_RESOLVER_REQUESTED_FILE_REFRESH_INTERVAL_MS);
          }
          continue;
        }
        if (refreshedMetadata.revision <= observedWorkspaceRevision) {
          if (attempt < CASE_RESOLVER_REQUESTED_FILE_REFRESH_MAX_ATTEMPTS - 1) {
            await wait(CASE_RESOLVER_REQUESTED_FILE_REFRESH_INTERVAL_MS);
          }
          continue;
        }

        const refreshedWorkspace = await fetchCaseResolverWorkspaceSnapshot('case_view');
        if (isCancelled) return;
        if (refreshedWorkspace) {
          observedWorkspaceRevision = Math.max(
            observedWorkspaceRevision,
            getCaseResolverWorkspaceRevision(refreshedWorkspace)
          );
          const refreshedHasRequestedFile = refreshedWorkspace.files.some(
            (file: CaseResolverFile): boolean => file.id === requestedFileId
          );
          if (refreshedHasRequestedFile) {
            requestedWorkspaceMissingFileIdRef.current = null;
            syncPersistedWorkspaceTracking(refreshedWorkspace);
            queuedSerializedWorkspaceRef.current = null;
            queuedExpectedRevisionRef.current = null;
            queuedMutationIdRef.current = null;
            setWorkspace(refreshedWorkspace);
            handledRequestedFileIdRef.current = null;
            logCaseResolverWorkspaceEvent({
              source: 'case_view',
              action: 'requested_file_refresh_applied',
              workspaceRevision: getCaseResolverWorkspaceRevision(refreshedWorkspace),
            });
            return;
          }
        }
        if (attempt < CASE_RESOLVER_REQUESTED_FILE_REFRESH_MAX_ATTEMPTS - 1) {
          await wait(CASE_RESOLVER_REQUESTED_FILE_REFRESH_INTERVAL_MS);
        }
      }
      requestedWorkspaceRefreshFileIdRef.current = requestedFileId;
      requestedWorkspaceMissingFileIdRef.current = requestedFileId;
      setRequestedCaseStatusSafe('missing');
      logCaseResolverWorkspaceEvent({
        source: 'case_view',
        action: 'requested_file_refresh_missing',
        message: `Requested file is unavailable after refresh attempts: ${requestedFileId}`,
      });
    })();

    return (): void => {
      isCancelled = true;
      if (
        requestedWorkspaceRefreshFileIdRef.current === requestedFileId &&
        requestedWorkspaceMissingFileIdRef.current !== requestedFileId
      ) {
        requestedWorkspaceRefreshFileIdRef.current = null;
      }
    };
  }, [requestedFileExists, requestedFileId, setRequestedCaseStatusSafe]);

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
          queuedSerializedWorkspaceRef.current = null;
          queuedExpectedRevisionRef.current = null;
          queuedMutationIdRef.current = null;
          return nextWorkspace;
        });
      }
      return;
    }

    if (handledRequestedFileIdRef.current === requestedFileId) return;

    handledRequestedFileIdRef.current = requestedFileId;
    setRequestedCaseStatusSafe('ready');
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
        queuedSerializedWorkspaceRef.current = null;
        queuedExpectedRevisionRef.current = null;
        queuedMutationIdRef.current = null;
        return nextWorkspace;
      });
    }
  }, [
    requestedFileExists,
    requestedFileId,
    selectedAssetId,
    selectedFileId,
    selectedFolderPath,
    setRequestedCaseStatusSafe,
    syncPersistedWorkspaceTracking,
    workspace.activeFileId,
  ]);

  const {
    handleDeleteFolder,
    handleMoveFile,
    handleMoveAsset,
    handleRenameFile,
    handleRenameAsset,
    handleRenameFolder,
  } = useCaseResolverStateFolderActions({
    confirm,
    toast,
    updateWorkspace,
    workspace,
    selectedCaseScopeIds,
    selectedCaseContainerId: activeCaseId,
    setSelectedFileId,
    setSelectedAssetId,
    setSelectedFolderPath,
    setEditingDocumentDraft,
    treeSaveToast: CASE_RESOLVER_TREE_SAVE_TOAST,
  });

  const handleOpenFileEditor = useCallback((
    fileId: string,
    options?: CaseResolverOpenFileEditorOptions
  ): void => {
    const target = workspace.files.find((file) => file.id === fileId);
    if (!target) {
      setEditingDocumentNodeContext(null);
      toast('File not found.', { variant: 'warning' });
      return;
    }
    if (target.fileType === 'case') {
      setEditingDocumentNodeContext(null);
      toast('Cases are edited in the Cases list. Select a document to edit.', {
        variant: 'info',
      });
      return;
    }
    const baseDraft = buildFileEditDraft(target);
    const mergedDraft: CaseResolverFileEditDraft = {
      ...baseDraft,
      documentHistory: baseDraft.documentHistory ?? [],
    };
    const resolvedDraftHtml = (() => {
      if (
        typeof mergedDraft.documentContentHtml === 'string' &&
        mergedDraft.documentContentHtml.trim().length > 0
      ) {
        return mergedDraft.documentContentHtml;
      }
      if (
        typeof mergedDraft.documentContentMarkdown === 'string' &&
        mergedDraft.documentContentMarkdown.trim().length > 0
      ) {
        return ensureHtmlForPreview(mergedDraft.documentContentMarkdown, 'markdown');
      }
      return ensureSafeDocumentHtml(mergedDraft.documentContent ?? '');
    })();
    const canonicalDraft = deriveDocumentContentSync({
      mode: 'wysiwyg',
      value: resolvedDraftHtml,
      previousHtml: mergedDraft.documentContentHtml,
      previousMarkdown: mergedDraft.documentContentMarkdown,
    });
    const nextDraft: CaseResolverFileEditDraft = {
      ...mergedDraft,
      editorType: 'wysiwyg',
      documentContentFormatVersion: 1,
      documentContent: toStorageDocumentValue(canonicalDraft),
      documentContentMarkdown: canonicalDraft.markdown,
      documentContentHtml: canonicalDraft.html,
      documentContentPlainText: canonicalDraft.plainText,
      documentConversionWarnings: canonicalDraft.warnings,
    };
    clearStoredEditorDraft(fileId);
    setEditingDocumentDraft(nextDraft);
    setEditingDocumentNodeContext(options?.nodeContext ?? null);
    setSelectedFileId(fileId);
    setSelectedAssetId(null);
    setSelectedFolderPath(null);
    setWorkspace((current) => (
      current.activeFileId === fileId
        ? current
        : {
          ...current,
          activeFileId: fileId,
        }
    ));
  }, [workspace.files, toast]);

  const {
    activeFile,
    selectedAsset,
    handleUpdateSelectedAsset,
    handleUpdateActiveFileParties,
  } = useCaseResolverStateSelectionActions({
    workspace,
    selectedAssetId,
    updateWorkspace,
    treeSaveToast: CASE_RESOLVER_TREE_SAVE_TOAST,
  });

  const handleLinkRelatedFiles = useCallback(
    (fileIdA: string, fileIdB: string): void => {
      const normalizedFileIdA = fileIdA.trim();
      const normalizedFileIdB = fileIdB.trim();
      if (!normalizedFileIdA || !normalizedFileIdB || normalizedFileIdA === normalizedFileIdB) {
        return;
      }

      const fileA = workspace.files.find((f: CaseResolverFile) => f.id === normalizedFileIdA);
      const fileB = workspace.files.find((f: CaseResolverFile) => f.id === normalizedFileIdB);
      if (!fileA || !fileB) {
        toast('Cannot link documents because one of them no longer exists.', {
          variant: 'warning',
        });
        return;
      }
      if (fileA.fileType === 'case' || fileB.fileType === 'case') {
        toast('Only documents can be linked in this panel.', { variant: 'info' });
        return;
      }
      if (fileA.isLocked || fileB.isLocked) {
        toast('Unlock both documents before changing links.', { variant: 'warning' });
        return;
      }

      const linkInA = (fileA.relatedFileIds ?? []).includes(normalizedFileIdB);
      const linkInB = (fileB.relatedFileIds ?? []).includes(normalizedFileIdA);
      if (linkInA && linkInB) {
        toast('These documents are already linked.', { variant: 'info' });
        return;
      }
      const now = new Date().toISOString();
      updateWorkspace((current) => {
        const currentFileA =
          current.files.find((file: CaseResolverFile): boolean => file.id === normalizedFileIdA) ?? null;
        const currentFileB =
          current.files.find((file: CaseResolverFile): boolean => file.id === normalizedFileIdB) ?? null;
        if (!currentFileA || !currentFileB) return current;
        if (
          currentFileA.fileType === 'case' ||
          currentFileB.fileType === 'case' ||
          currentFileA.isLocked ||
          currentFileB.isLocked
        ) {
          return current;
        }
        return {
          ...current,
          files: current.files.map((file: CaseResolverFile) => {
            if (file.id === normalizedFileIdA) {
              const existing = file.relatedFileIds ?? [];
              const next = Array.from(new Set([...existing, normalizedFileIdB])).sort((left, right) =>
                left.localeCompare(right)
              );
              return { ...file, relatedFileIds: next, updatedAt: now };
            }
            if (file.id === normalizedFileIdB) {
              const existing = file.relatedFileIds ?? [];
              const next = Array.from(new Set([...existing, normalizedFileIdA])).sort((left, right) =>
                left.localeCompare(right)
              );
              return { ...file, relatedFileIds: next, updatedAt: now };
            }
            return file;
          }),
        };
      }, { persistNow: true, source: 'case_view_link_related_files' });
      const nameA = fileA?.name ?? fileIdA;
      const nameB = fileB?.name ?? fileIdB;
      toast(
        linkInA || linkInB
          ? `Repaired relation link between "${nameA}" and "${nameB}".`
          : `"${nameA}" linked to "${nameB}".`,
        { variant: 'success' }
      );
    },
    [updateWorkspace, workspace.files, toast],
  );

  const handleUnlinkRelatedFile = useCallback(
    (sourceFileId: string, targetFileId: string): void => {
      const normalizedSourceFileId = sourceFileId.trim();
      const normalizedTargetFileId = targetFileId.trim();
      if (
        !normalizedSourceFileId ||
        !normalizedTargetFileId ||
        normalizedSourceFileId === normalizedTargetFileId
      ) {
        return;
      }
      const sourceFile = workspace.files.find((file: CaseResolverFile) => file.id === normalizedSourceFileId);
      const targetFile = workspace.files.find((file: CaseResolverFile) => file.id === normalizedTargetFileId);
      if (!sourceFile || !targetFile) {
        toast('Cannot unlink documents because one of them no longer exists.', {
          variant: 'warning',
        });
        return;
      }
      if (sourceFile.isLocked || targetFile.isLocked) {
        toast('Unlock both documents before changing links.', { variant: 'warning' });
        return;
      }
      const now = new Date().toISOString();
      updateWorkspace((current) => {
        const currentSourceFile =
          current.files.find((file: CaseResolverFile): boolean => file.id === normalizedSourceFileId) ?? null;
        const currentTargetFile =
          current.files.find((file: CaseResolverFile): boolean => file.id === normalizedTargetFileId) ?? null;
        if (!currentSourceFile || !currentTargetFile) return current;
        if (currentSourceFile.isLocked || currentTargetFile.isLocked) return current;
        return {
          ...current,
          files: current.files.map((file: CaseResolverFile) => {
            if (file.id === normalizedSourceFileId || file.id === normalizedTargetFileId) {
              const otherId =
                file.id === normalizedSourceFileId ? normalizedTargetFileId : normalizedSourceFileId;
              const next = (file.relatedFileIds ?? []).filter((id: string) => id !== otherId);
              return { ...file, relatedFileIds: next.length > 0 ? next : undefined, updatedAt: now };
            }
            return file;
          }),
        };
      }, { persistNow: true, source: 'case_view_unlink_related_files' });
    },
    [toast, updateWorkspace, workspace.files],
  );

  const handleSaveFileEditor = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const currentFile = workspace.files.find(
      (file: CaseResolverFile): boolean => file.id === editingDocumentDraft.id
    );
    if (!currentFile) {
      toast('Document no longer exists. Please refresh list.', { variant: 'warning' });
      return;
    }
    if (currentFile.isLocked) {
      setEditingDocumentDraft((current) => (
        current?.id === currentFile.id ? buildFileEditDraft(currentFile) : current
      ));
      toast('Document is locked. Unlock it in Case Resolver before saving.', {
        variant: 'warning',
      });
      return;
    }
    const hasVersionDrift =
      currentFile.documentContentVersion !== editingDocumentDraft.baseDocumentContentVersion;
    const canonicalState = buildCaseResolverDraftCanonicalState(editingDocumentDraft);
    const nextStoredContent = canonicalState.storedContent;
    const nextOriginalDocumentContent = canonicalState.originalDocumentContent;
    const nextExplodedDocumentContent = canonicalState.explodedDocumentContent;
    const hasContentChanges =
      currentFile.activeDocumentVersion !== editingDocumentDraft.activeDocumentVersion ||
      currentFile.editorType !== canonicalState.mode ||
      currentFile.documentContent !== nextStoredContent ||
      currentFile.documentContentMarkdown !== canonicalState.markdown ||
      currentFile.documentContentHtml !== canonicalState.html ||
      currentFile.documentContentPlainText !== canonicalState.plainText ||
      JSON.stringify(currentFile.documentConversionWarnings) !== JSON.stringify(canonicalState.warnings) ||
      currentFile.originalDocumentContent !== nextOriginalDocumentContent ||
      currentFile.explodedDocumentContent !== nextExplodedDocumentContent;
    const hasMeaningfulChanges = hasCaseResolverDraftMeaningfulChanges({
      draft: editingDocumentDraft,
      file: currentFile,
      canonicalState,
    });
    const canSavePristineInitialDocument = canCaseResolverDraftPerformInitialManualSave({
      draft: editingDocumentDraft,
      file: currentFile,
      canonicalState,
    });

    if (!hasMeaningfulChanges && !canSavePristineInitialDocument) {
      clearStoredEditorDraft(editingDocumentDraft.id);
      if (hasVersionDrift) {
        setEditingDocumentDraft((current) => (
          current?.id === editingDocumentDraft.id
            ? buildFileEditDraft(currentFile)
            : current
        ));
        toast('Document is already synced with the latest version. No changes to save.', {
          variant: 'info',
        });
        return;
      }
      toast('No document changes to save.', { variant: 'info' });
      return;
    }
    if (hasVersionDrift) {
      toast('Document changed while editor was open. Saving on top of latest version.', {
        variant: 'warning',
      });
    }
    const now = new Date().toISOString();
    const nextDocumentContentVersion = currentFile.documentContentVersion + 1;
    const currentSnapshot = hasContentChanges
      ? createCaseResolverHistorySnapshotEntry({
        savedAt: now,
        documentContentVersion: currentFile.documentContentVersion,
        activeDocumentVersion: currentFile.activeDocumentVersion,
        editorType: currentFile.editorType,
        documentContent: currentFile.documentContent,
        documentContentMarkdown: currentFile.documentContentMarkdown,
        documentContentHtml: currentFile.documentContentHtml,
        documentContentPlainText: currentFile.documentContentPlainText,
      })
      : null;
    const nextDocumentHistory = currentSnapshot
      ? [currentSnapshot, ...currentFile.documentHistory].slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT)
      : currentFile.documentHistory;
    const nextSavedFile = createCaseResolverFile({
      ...currentFile,
      ...editingDocumentDraft,
      editorType: canonicalState.mode,
      documentContentFormatVersion: 1,
      documentContentVersion: nextDocumentContentVersion,
      documentContent: nextStoredContent,
      documentContentMarkdown: canonicalState.markdown,
      documentContentHtml: canonicalState.html,
      documentContentPlainText: canonicalState.plainText,
      documentHistory: nextDocumentHistory,
      documentConversionWarnings: canonicalState.warnings,
      lastContentConversionAt: now,
      originalDocumentContent: nextOriginalDocumentContent,
      explodedDocumentContent: nextExplodedDocumentContent,
      createdAt: editingDocumentDraft.createdAt || currentFile.createdAt || now,
      updatedAt: now,
    });
    updateWorkspace((current) => ({
      ...current,
      files: current.files.map((file) =>
        file.id === editingDocumentDraft.id
          ? nextSavedFile
          : file
      ),
    }), {
      persistToast: 'Document changes saved.',
      source: 'case_view_document_save',
    });
    clearStoredEditorDraft(editingDocumentDraft.id);
    setEditingDocumentDraft((current) => {
      if (current?.id !== editingDocumentDraft.id) return current;
      return buildFileEditDraft(nextSavedFile);
    });
  }, [editingDocumentDraft, toast, updateWorkspace, workspace.files]);

  const handleDiscardFileEditorDraft = useCallback((): void => {
    if (editingDocumentDraft) {
      clearStoredEditorDraft(editingDocumentDraft.id);
    }
    setEditingDocumentDraft(null);
    setEditingDocumentNodeContext(null);
  }, [editingDocumentDraft]);

  return {
    workspace,
    workspaceRef,
    setWorkspace,
    updateWorkspace,
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
    editingDocumentDraft,
    editingDocumentNodeContext,
    setEditingDocumentDraft,
    setEditingDocumentNodeContext,
    isUploadingScanDraftFiles,
    setIsUploadingScanDraftFiles,
    uploadingScanSlotId,
    setUploadingScanSlotId,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    caseResolverSettings,
    countries,
    isMenuCollapsed,
    setIsMenuCollapsed,
    requestedFileId,
    requestedPromptExploderSessionId,
    activeCaseId,
    requestedCaseStatus,
    canCreateInActiveCase,
    shouldOpenEditorFromQuery,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleCreateScanFile,
    handleCreateNodeFile,
    handleCreateImageAsset,
    handleCreateDocumentFromText,
    handleUploadScanFiles,
    handleRunScanFileOcr,
    handleUploadAssets,
    handleAttachAssetFile,
    handleDeleteFolder,
    handleMoveFile,
    handleMoveAsset,
    handleRenameFile,
    handleRenameAsset,
    handleRenameFolder,
    handleOpenFileEditor,
    activeFile,
    selectedAsset,
    handleUpdateSelectedAsset,
    handleUpdateActiveFileParties,
    handleLinkRelatedFiles,
    handleUnlinkRelatedFile,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    pendingPromptExploderPayload,
    refreshPendingPromptExploderPayload,
    handleApplyPendingPromptExploderPayload,
    handleDiscardPendingPromptExploderPayload,
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
     
    promptExploderApplyDiagnostics,
    isPromptExploderPartyProposalOpen,
    
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal,
    refetchSettingsStore,
    confirmAction: confirm,
    ConfirmationModal,
    PromptInputModal,
    filemakerDatabase,
  };
}

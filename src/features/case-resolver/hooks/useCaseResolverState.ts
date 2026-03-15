'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CASE_RESOLVER_CAPTURE_SETTINGS_KEY,
  parseCaseResolverCaptureSettings,
  type CaseResolverCaptureSettings as CaseResolverCaptureSettingsType,
} from '@/features/case-resolver-capture';
import {
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
} from '@/features/filemaker';
import type {
  CaseResolverCategory,
  CaseResolverEditorNodeContext,
  CaseResolverFile,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
  CaseResolverSettings,
} from '@/shared/contracts/case-resolver';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { usePrompt } from '@/shared/hooks/ui/usePrompt';
import { useCountries } from '@/shared/hooks/use-i18n-queries';
import {
  useAdminLayoutActions,
  useAdminLayoutState,
} from '@/shared/providers/AdminLayoutProvider';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

import {
  fromCaseResolverCaseContentFileNodeId,
  fromCaseResolverCaseNodeId,
  fromCaseResolverFileNodeId,
} from '../master-tree';
import {
  CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY,
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_SETTINGS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  getCaseResolverWorkspaceSafeParseDiagnostics,
  hasCaseResolverWorkspaceFilesArray,
  parseCaseResolverCategories,
  parseCaseResolverDefaultDocumentFormat,
  parseCaseResolverIdentifiers,
  parseCaseResolverSettings,
  parseCaseResolverTags,
  safeParseCaseResolverWorkspace,
} from '../settings';
import { type CaseResolverFileEditDraft, type CaseResolverStateValue } from '../types';
import {
  logCaseResolverWorkspaceEvent,
  readCaseResolverNavigationWorkspace,
  getCaseResolverWorkspaceRevision,
} from '../workspace-persistence';
import { useCaseResolverStateAssetActions } from './useCaseResolverState.asset-actions';
import { useCaseResolverStateCreationActions } from './useCaseResolverState.creation-actions';
import { useCaseResolverStateEditorActions } from './useCaseResolverState.editor-actions';
import { useCaseResolverStateFolderActions } from './useCaseResolverState.folder-actions';
import { serializeWorkspaceForUnsavedChangesCheck } from './useCaseResolverState.helpers';
import {
  resolvePreferredCaseResolverWorkspace,
  shouldRefetchSettingsStoreForRequestedFile,
} from './useCaseResolverState.helpers.hydration';
import {
  useCaseResolverPersistence,
  type UseCaseResolverPersistenceValue,
} from './useCaseResolverState.persistence-actions';
import {
  useCaseResolverPromptExploder,
  type UseCaseResolverPromptExploderValue,
} from './useCaseResolverState.prompt-exploder-actions';
import { useCaseResolverStateRelatedFilesActions } from './useCaseResolverState.related-files-actions';
import { useCaseResolverStateRequestedContext } from './useCaseResolverState.requested-context';
import { useCaseResolverStateSelectionActions } from './useCaseResolverState.selection-actions';
import { useCaseResolverStateViewState } from './useCaseResolverState.view-state';
import { useCaseResolverStateWorkspaceDiagnostics } from './useCaseResolverState.workspace-diagnostics';
import { useCaseResolverStateWorkspaceHydration } from './useCaseResolverState.workspace-hydration';
import { useCaseResolverStateWorkspaceMutations } from './useCaseResolverState.workspace-mutations';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';

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
  const { isMenuCollapsed } = useAdminLayoutState();
  const { setIsMenuCollapsed } = useAdminLayoutActions();
  const searchParams = useSearchParams();
  const requestedFileIdRaw = searchParams.get('fileId');
  const requestedFileId = useMemo((): string | null => {
    const rawRequestedFileId = requestedFileIdRaw?.trim() ?? '';
    if (!rawRequestedFileId) return null;

    const resolveNodeIdReference = (value: string): string | null => {
      const decodedCaseNodeId = fromCaseResolverCaseNodeId(value);
      if (decodedCaseNodeId) return decodedCaseNodeId;
      const decodedFileNodeId = fromCaseResolverFileNodeId(value);
      if (decodedFileNodeId) return decodedFileNodeId;
      const decodedCaseContentFileNode = fromCaseResolverCaseContentFileNodeId(value);
      if (decodedCaseContentFileNode?.fileId) return decodedCaseContentFileNode.fileId;
      return null;
    };

    const directResolved = resolveNodeIdReference(rawRequestedFileId);
    if (directResolved) return directResolved;

    let normalizedRequestedFileId = rawRequestedFileId;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const decodedCandidate = decodeURIComponent(normalizedRequestedFileId).trim();
        if (!decodedCandidate || decodedCandidate === normalizedRequestedFileId) break;
        const decodedResolved = resolveNodeIdReference(decodedCandidate);
        if (decodedResolved) return decodedResolved;
        normalizedRequestedFileId = decodedCandidate;
      } catch (error) {
        logClientError(error);
        break;
      }
    }

    return normalizedRequestedFileId;
  }, [requestedFileIdRaw]);
  const shouldOpenEditorFromQuery = searchParams.get('openEditor') === '1';
  const requestedPromptExploderSessionId =
    searchParams.get('promptExploderSessionId')?.trim() ?? '';
  const isPromptExploderReturnFlow =
    shouldOpenEditorFromQuery &&
    requestedPromptExploderSessionId.length > 0 &&
    (requestedFileId?.trim() ?? '').length > 0;

  const rawWorkspaceFromStore = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY) ?? null;
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverIdentifiers = settingsStore.get(CASE_RESOLVER_IDENTIFIERS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const rawCaseResolverSettings = settingsStore.get(CASE_RESOLVER_SETTINGS_KEY);
  const rawCaseResolverDefaultDocumentFormat = settingsStore.get(
    CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY
  );
  const rawCaseResolverCaptureSettings = settingsStore.get(CASE_RESOLVER_CAPTURE_SETTINGS_KEY);
  const rawFilemakerPayload = settingsStore.get(FILEMAKER_DATABASE_KEY);

  const hasWorkspaceFromStore = useMemo(
    (): boolean => hasCaseResolverWorkspaceFilesArray(rawWorkspaceFromStore),
    [rawWorkspaceFromStore]
  );
  const parsedWorkspaceFromStore = useMemo(
    (): CaseResolverWorkspace => safeParseCaseResolverWorkspace(rawWorkspaceFromStore),
    [rawWorkspaceFromStore]
  );
  const workspaceSafeParseDiagnostics = useMemo(
    () => getCaseResolverWorkspaceSafeParseDiagnostics(parsedWorkspaceFromStore),
    [parsedWorkspaceFromStore]
  );
  const storeWorkspaceHasRequestedFile = useMemo((): boolean => {
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) return false;
    return parsedWorkspaceFromStore.files.some(
      (file: CaseResolverFile): boolean => file.id === normalizedRequestedFileId
    );
  }, [parsedWorkspaceFromStore.files, requestedFileId]);
  const navigationWorkspace = useMemo(
    (): CaseResolverWorkspace | null => readCaseResolverNavigationWorkspace(),
    [requestedFileId]
  );
  const hasNavigationWorkspace = useMemo(
    (): boolean =>
      Boolean(
        navigationWorkspace &&
        (navigationWorkspace.files.length > 0 ||
          navigationWorkspace.assets.length > 0 ||
          navigationWorkspace.folders.length > 0)
      ),
    [navigationWorkspace]
  );
  const preferredWorkspaceSelection = useMemo(
    () =>
      resolvePreferredCaseResolverWorkspace({
        storeWorkspace: parsedWorkspaceFromStore,
        navigationWorkspace: navigationWorkspace ?? undefined,
        hasStoreWorkspace: hasWorkspaceFromStore,
        hasNavigationWorkspace,
        requestedFileId,
      }),
    [
      hasNavigationWorkspace,
      hasWorkspaceFromStore,
      navigationWorkspace,
      parsedWorkspaceFromStore,
      requestedFileId,
    ]
  );
  const parsedWorkspace = preferredWorkspaceSelection.workspace;
  const canHydrateWorkspaceFromStore = preferredWorkspaceSelection.source !== 'none';
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
  const caseResolverSettings = useMemo((): CaseResolverSettings => {
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
    () => parseFilemakerDatabase(rawFilemakerPayload),
    [rawFilemakerPayload]
  );
  const caseResolverCaptureSettings = useMemo(
    (): CaseResolverCaptureSettingsType =>
      parseCaseResolverCaptureSettings(rawCaseResolverCaptureSettings),
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
  const [editingDocumentDraft, setEditingDocumentDraft] =
    useState<CaseResolverFileEditDraft | null>(null);
  const [editingDocumentNodeContext, setEditingDocumentNodeContext] =
    useState<CaseResolverEditorNodeContext | null>(null);
  const [isUploadingScanDraftFiles, setIsUploadingScanDraftFiles] = useState(false);
  const [uploadingScanSlotId, setUploadingScanSlotId] = useState<string | null>(null);

  const [, setPersistedWorkspaceSnapshot] = useState<string>(JSON.stringify(initialWorkspaceState));
  const [persistedWorkspaceComparableSnapshot, setPersistedWorkspaceComparableSnapshot] =
    useState<string>(() => serializeWorkspaceForUnsavedChangesCheck(initialWorkspaceState));

  const handledRequestedFileIdRef = useRef<string | null>(null);
  const requestedStoreRefreshFileIdRef = useRef<string | null>(null);
  const requestedUnavailableAutoRetryFileIdRef = useRef<string | null>(null);
  const lastWorkspaceParseFallbackSignatureRef = useRef<string>('');

  const persistence: UseCaseResolverPersistenceValue = useCaseResolverPersistence({
    initialWorkspaceState,
    settingsStoreRef,
    toast,
    setPersistedWorkspaceSnapshot,
    setPersistedWorkspaceComparableSnapshot,
  });
  const syncPersistedWorkspaceTracking = persistence.syncPersistedWorkspaceTracking;
  const clearQueuedWorkspacePersistMutation = persistence.clearQueuedWorkspacePersistMutation;
  const isMountedRef = useRef(true);
  const requestedContext = useCaseResolverStateRequestedContext({
    requestedFileId,
    workspace,
    workspaceRef,
    setWorkspace,
    isMountedRef,
    handledRequestedFileIdRef,
    syncPersistedWorkspaceTracking,
    clearQueuedWorkspacePersistMutation,
    isStoreLoading: settingsStore.isLoading,
    isStoreFetching: settingsStore.isFetching,
    storeWorkspaceHasRequestedFile,
    isPromptExploderReturnFlow,
  });
  const {
    requestedCaseStatus,
    requestedCaseIssue,
    requestedContextAutoClearRequestKey,
    setRequestedCaseStatus,
    handleAcknowledgeRequestedContextAutoClear,
    handleRetryCaseContext,
    resetRequestedContextState,
  } = requestedContext;

  const viewState = useCaseResolverStateViewState({
    workspace,
    setWorkspace,
    requestedFileId,
    requestedCaseStatus,
    initialWorkspaceState,
    syncPersistedWorkspaceTracking: persistence.syncPersistedWorkspaceTracking,
    clearQueuedWorkspacePersistMutation: persistence.clearQueuedWorkspacePersistMutation,
    handledRequestedFileIdRef,
  });
  const { setSelectedFileId, setSelectedAssetId, setSelectedFolderPath } = viewState;
  const workspaceDiagnostics = useCaseResolverStateWorkspaceDiagnostics({
    workspace,
    activeCaseId: viewState.activeCaseId,
    selectedFileId: viewState.selectedFileId,
    requestedFileId,
    toast,
  });
  const {
    selectedCaseScopeIds,
    workspaceIndexes,
    workspaceNormalizationDiagnostics,
    treeWorkspace,
  } = workspaceDiagnostics;
  const { updateWorkspace } = useCaseResolverStateWorkspaceMutations({
    workspace,
    setWorkspace,
    persistedWorkspaceComparableSnapshot,
    persistence,
  });

  const promptExploder: UseCaseResolverPromptExploderValue = useCaseResolverPromptExploder({
    workspace,
    workspaceRef,
    updateWorkspace,
    setEditingDocumentDraft,
    filemakerDatabase,
    caseResolverCaptureSettings,
    requestedFileId,
    shouldOpenEditorFromQuery,
    requestedPromptExploderSessionId,
    toast,
    flushWorkspacePersist: persistence.flushWorkspacePersist,
  });

  useCaseResolverStateWorkspaceHydration({
    workspaceRef,
    setWorkspace,
    isMountedRef,
    requestedFileId,
    canHydrateWorkspaceFromStore,
    preferredWorkspaceSource: preferredWorkspaceSelection.source,
    preferredWorkspaceReason: preferredWorkspaceSelection.reason,
    hasWorkspaceFromStore,
    parsedWorkspace,
    isApplyingPromptExploderPartyProposal: promptExploder.isApplyingPromptExploderPartyProposal,
    syncPersistedWorkspaceTracking,
    clearQueuedWorkspacePersistMutation,
    isPromptExploderReturnFlow,
  });

  const editorActions = useCaseResolverStateEditorActions({
    workspace,
    updateWorkspace,
    editingDocumentDraft,
    setEditingDocumentDraft,
    setEditingDocumentNodeContext,
    setSelectedFileId: viewState.setSelectedFileId,
    setSelectedAssetId: viewState.setSelectedAssetId,
    setSelectedFolderPath: viewState.setSelectedFolderPath,
    setWorkspace,
    toast,
  });

  const relatedFilesActions = useCaseResolverStateRelatedFilesActions({
    workspace,
    updateWorkspace,
    toast,
  });

  const defaultTagId = caseResolverTags[0]?.id ?? null;
  const defaultCaseIdentifierId = caseResolverIdentifiers[0]?.id ?? null;
  const defaultCategoryId = caseResolverCategories[0]?.id ?? null;

  const refetchSettingsStore = useCallback((): void => {
    settingsStoreRef.current.refetch();
  }, []);

  useEffect(() => {
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fallbackApplied = workspaceSafeParseDiagnostics.parseFallbackApplied;
    if (!fallbackApplied) {
      return;
    }
    const signature = [
      rawWorkspaceFromStore ?? '<null>',
      fallbackApplied ? 'fallback:1' : 'fallback:0',
      workspaceSafeParseDiagnostics.parseFallbackReason ?? 'none',
    ].join('|');
    if (lastWorkspaceParseFallbackSignatureRef.current === signature) return;
    lastWorkspaceParseFallbackSignatureRef.current = signature;
    logCaseResolverWorkspaceEvent({
      source: 'case_view',
      action: 'workspace_parse_fallback_applied',
      workspaceRevision: getCaseResolverWorkspaceRevision(parsedWorkspaceFromStore),
      message: [
        `fallback=${fallbackApplied ? 'true' : 'false'}`,
        `reason=${workspaceSafeParseDiagnostics.parseFallbackReason ?? 'none'}`,
      ].join(' '),
    });
  }, [
    parsedWorkspaceFromStore,
    rawWorkspaceFromStore,
    workspaceSafeParseDiagnostics.parseFallbackApplied,
    workspaceSafeParseDiagnostics.parseFallbackReason,
  ]);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect((): void => {
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) {
      requestedStoreRefreshFileIdRef.current = null;
      requestedUnavailableAutoRetryFileIdRef.current = null;
      return;
    }

    const requestedFileResolvedInWorkspace = workspace.files.some(
      (file: CaseResolverFile): boolean => file.id === normalizedRequestedFileId
    );
    const requestedFileResolvedInStore = parsedWorkspaceFromStore.files.some(
      (file: CaseResolverFile): boolean => file.id === normalizedRequestedFileId
    );
    if (requestedFileResolvedInWorkspace || requestedFileResolvedInStore) {
      requestedStoreRefreshFileIdRef.current = null;
      return;
    }

    if (
      !shouldRefetchSettingsStoreForRequestedFile({
        requestedFileId: normalizedRequestedFileId,
        requestedFileResolvedInWorkspace,
        requestedFileResolvedInStore,
        isStoreLoading: settingsStore.isLoading,
        isStoreFetching: settingsStore.isFetching,
        lastRefetchedFileId: requestedStoreRefreshFileIdRef.current,
      })
    ) {
      return;
    }

    requestedStoreRefreshFileIdRef.current = normalizedRequestedFileId;
    logCaseResolverWorkspaceEvent({
      source: 'case_view',
      action: 'requested_context_store_refetch',
      message: `requested_file_id=${normalizedRequestedFileId} reason=missing_from_store_snapshot`,
    });
    settingsStoreRef.current.refetch();
  }, [
    parsedWorkspaceFromStore,
    requestedFileId,
    settingsStore.isFetching,
    settingsStore.isLoading,
    workspace.files,
  ]);

  useEffect((): void => {
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) {
      requestedUnavailableAutoRetryFileIdRef.current = null;
      return;
    }
    const canAutoRetry =
      requestedCaseStatus === 'missing' &&
      requestedCaseIssue === 'workspace_unavailable' &&
      requestedUnavailableAutoRetryFileIdRef.current !== normalizedRequestedFileId;
    if (!canAutoRetry) return;

    requestedUnavailableAutoRetryFileIdRef.current = normalizedRequestedFileId;
    logCaseResolverWorkspaceEvent({
      source: 'case_view',
      action: 'requested_context_auto_retry_after_unavailable',
      message: `requested_file_id=${normalizedRequestedFileId}`,
    });
    settingsStoreRef.current.refetch();
    queueMicrotask((): void => {
      handleRetryCaseContext();
    });
  }, [handleRetryCaseContext, requestedCaseIssue, requestedCaseStatus, requestedFileId]);

  const creationActions = useCaseResolverStateCreationActions({
    workspace,
    updateWorkspace,
    setWorkspace,
    syncPersistedWorkspaceTracking: persistence.syncPersistedWorkspaceTracking,
    requestedFileId,
    selectedFileId: viewState.selectedFileId,
    requestedCaseStatus,
    setRequestedCaseStatus,
    activeCaseId: viewState.activeCaseId,
    canCreateInActiveCase: viewState.canCreateInActiveCase,
    defaultTagId,
    defaultCaseIdentifierId,
    defaultCategoryId,
    setSelectedFileId: viewState.setSelectedFileId,
    setSelectedAssetId: viewState.setSelectedAssetId,
    setSelectedFolderPath: viewState.setSelectedFolderPath,
    settingsStoreRef,
    toast,
  });

  const handleResetCaseContext = useCallback((): void => {
    resetRequestedContextState();
    setSelectedFileId(null);
    setSelectedAssetId(null);
    setSelectedFolderPath(null);
    setWorkspace(
      (current: CaseResolverWorkspace): CaseResolverWorkspace =>
        current.activeFileId === null
          ? current
          : {
            ...current,
            activeFileId: null,
          }
    );
  }, [
    resetRequestedContextState,
    setWorkspace,
    setSelectedAssetId,
    setSelectedFileId,
    setSelectedFolderPath,
  ]);

  const assetActions = useCaseResolverStateAssetActions({
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
    activeCaseId: viewState.activeCaseId,
    requestedCaseStatus,
    setSelectedFileId: viewState.setSelectedFileId,
    setSelectedFolderPath: viewState.setSelectedFolderPath,
    setSelectedAssetId: viewState.setSelectedAssetId,
    treeSaveToast: CASE_RESOLVER_TREE_SAVE_TOAST,
  });

  const folderActions = useCaseResolverStateFolderActions({
    confirm,
    toast,
    updateWorkspace,
    workspace,
    selectedCaseScopeIds,
    selectedCaseContainerId: viewState.activeCaseId,
    setSelectedFileId: viewState.setSelectedFileId,
    setSelectedAssetId: viewState.setSelectedAssetId,
    setSelectedFolderPath: viewState.setSelectedFolderPath,
    setEditingDocumentDraft,
    treeSaveToast: CASE_RESOLVER_TREE_SAVE_TOAST,
  });

  const selectionActions = useCaseResolverStateSelectionActions({
    workspace,
    selectedAssetId: viewState.selectedAssetId,
    updateWorkspace,
    treeSaveToast: CASE_RESOLVER_TREE_SAVE_TOAST,
  });

  return {
    workspace: treeWorkspace,
    workspaceRef,
    setWorkspace,
    updateWorkspace,
    workspaceIndexes,
    workspaceNormalizationDiagnostics,
    ...viewState,
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
    requestedCaseStatus,
    requestedCaseIssue,
    requestedContextAutoClearRequestKey,
    shouldOpenEditorFromQuery,
    handleAcknowledgeRequestedContextAutoClear,
    handleRetryCaseContext,
    handleResetCaseContext,
    handleCreateFolder: creationActions.handleCreateFolder,
    handleCreateFile: creationActions.handleCreateFile,
    handleCreateScanFile: assetActions.handleCreateScanFile,
    handleCreateNodeFile: creationActions.handleCreateNodeFile,
    handleCreateImageAsset: assetActions.handleCreateImageAsset,
    handleCreateDocumentFromText: assetActions.handleCreateDocumentFromText,
    handleUploadScanFiles: assetActions.handleUploadScanFiles,
    handleRunScanFileOcr: assetActions.handleRunScanFileOcr,
    handleUploadAssets: assetActions.handleUploadAssets,
    handleAttachAssetFile: assetActions.handleAttachAssetFile,
    handleDeleteFolder: folderActions.handleDeleteFolder,
    handleMoveFile: folderActions.handleMoveFile,
    handleMoveAsset: folderActions.handleMoveAsset,
    handleRenameFile: folderActions.handleRenameFile,
    handleRenameAsset: folderActions.handleRenameAsset,
    handleRenameFolder: folderActions.handleRenameFolder,
    handleOpenFileEditor: editorActions.handleOpenFileEditor,
    activeFile: selectionActions.activeFile,
    selectedAsset: selectionActions.selectedAsset,
    handleUpdateSelectedAsset: selectionActions.handleUpdateSelectedAsset,
    handleUpdateActiveFileParties: selectionActions.handleUpdateActiveFileParties,
    handleLinkRelatedFiles: relatedFilesActions.handleLinkRelatedFiles,
    handleUnlinkRelatedFile: relatedFilesActions.handleUnlinkRelatedFile,
    handleSaveFileEditor: editorActions.handleSaveFileEditor,
    handleDiscardFileEditorDraft: editorActions.handleDiscardFileEditorDraft,
    ...promptExploder,
    ...persistence,
    refetchSettingsStore,
    confirmAction: confirm,
    ConfirmationModal,
    PromptInputModal,
    filemakerDatabase,
  };
}

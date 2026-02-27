'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import {
  CASE_RESOLVER_CAPTURE_SETTINGS_KEY,
  parseCaseResolverCaptureSettings,
  type CaseResolverCaptureSettings as CaseResolverCaptureSettingsType,
} from '@/features/case-resolver-capture/settings';
import {
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
} from '@/features/filemaker/settings';
import { useCountries } from '@/shared/lib/internationalization/hooks/useInternationalizationQueries';
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
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useSettings } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';

import {
  CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY,
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_SETTINGS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  hasCaseResolverWorkspaceFilesArray,
  parseCaseResolverCategories,
  parseCaseResolverDefaultDocumentFormat,
  parseCaseResolverIdentifiers,
  parseCaseResolverSettings,
  parseCaseResolverTags,
  parseCaseResolverWorkspace,
} from '../settings';
import {
  fromCaseResolverCaseNodeId,
  fromCaseResolverFileNodeId,
} from '../master-tree';
import {
  type CaseResolverFileEditDraft,
  type CaseResolverStateValue,
} from '../types';
import { useCaseResolverStateFolderActions } from './useCaseResolverState.folder-actions';
import { useCaseResolverStateAssetActions } from './useCaseResolverState.asset-actions';
import { serializeWorkspaceForUnsavedChangesCheck } from './useCaseResolverState.helpers';
import {
  resolvePreferredCaseResolverWorkspace,
} from './useCaseResolverState.helpers.hydration';
import { useCaseResolverStateSelectionActions } from './useCaseResolverState.selection-actions';
import { useCaseResolverPersistence, type UseCaseResolverPersistenceValue } from './useCaseResolverState.persistence-actions';
import { useCaseResolverPromptExploder, type UseCaseResolverPromptExploderValue } from './useCaseResolverState.prompt-exploder-actions';
import { useCaseResolverStateEditorActions } from './useCaseResolverState.editor-actions';
import { useCaseResolverStateRelatedFilesActions } from './useCaseResolverState.related-files-actions';
import { useCaseResolverStateCreationActions } from './useCaseResolverState.creation-actions';
import { useCaseResolverStateViewState } from './useCaseResolverState.view-state';
import { useCaseResolverStateRequestedContext } from './useCaseResolverState.requested-context';
import { useCaseResolverStateWorkspaceHydration } from './useCaseResolverState.workspace-hydration';
import { useCaseResolverStateWorkspaceDiagnostics } from './useCaseResolverState.workspace-diagnostics';
import { useCaseResolverStateWorkspaceMutations } from './useCaseResolverState.workspace-mutations';

const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';

/**
 * Custom hook to manage the complex state and logic of the Case Resolver page.
 */
export function useCaseResolverState(): CaseResolverStateValue {
  const settingsStore = useSettingsStore();
  const heavySettingsQuery = useSettings({ scope: 'heavy', enabled: true });
  const settingsStoreRef = useRef(settingsStore);
  settingsStoreRef.current = settingsStore;
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const { PromptInputModal } = usePrompt();
  const { isMenuCollapsed, setIsMenuCollapsed } = useAdminLayout();
  const searchParams = useSearchParams();
  const requestedFileIdRaw = searchParams.get('fileId');
  const requestedFileId = useMemo((): string | null => {
    const normalizedRequestedFileId = requestedFileIdRaw?.trim() ?? '';
    if (!normalizedRequestedFileId) return null;
    const decodedCaseNodeId = fromCaseResolverCaseNodeId(normalizedRequestedFileId);
    if (decodedCaseNodeId) return decodedCaseNodeId;
    const decodedFileNodeId = fromCaseResolverFileNodeId(normalizedRequestedFileId);
    if (decodedFileNodeId) return decodedFileNodeId;
    return normalizedRequestedFileId;
  }, [requestedFileIdRaw]);
  const shouldOpenEditorFromQuery = searchParams.get('openEditor') === '1';
  const requestedPromptExploderSessionId = searchParams.get('promptExploderSessionId')?.trim() ?? '';

  const rawWorkspaceFromStore = settingsStore.get(CASE_RESOLVER_WORKSPACE_KEY) ?? null;
  const rawWorkspaceFromHeavyScope = useMemo((): string | null => {
    const records = heavySettingsQuery.data ?? [];
    const record = records.find(
      (entry): boolean => entry.key === CASE_RESOLVER_WORKSPACE_KEY,
    );
    return typeof record?.value === 'string' ? record.value : null;
  }, [heavySettingsQuery.data]);
  const rawCaseResolverTags = settingsStore.get(CASE_RESOLVER_TAGS_KEY);
  const rawCaseResolverIdentifiers = settingsStore.get(CASE_RESOLVER_IDENTIFIERS_KEY);
  const rawCaseResolverCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const rawCaseResolverSettings = settingsStore.get(CASE_RESOLVER_SETTINGS_KEY);
  const rawCaseResolverDefaultDocumentFormat = settingsStore.get(
    CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY
  );
  const rawFilemakerDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCaseResolverCaptureSettings = settingsStore.get(CASE_RESOLVER_CAPTURE_SETTINGS_KEY);
  
  const hasWorkspaceFromStore = useMemo(
    (): boolean => hasCaseResolverWorkspaceFilesArray(rawWorkspaceFromStore),
    [rawWorkspaceFromStore],
  );
  const hasWorkspaceFromHeavyScope = useMemo(
    (): boolean => hasCaseResolverWorkspaceFilesArray(rawWorkspaceFromHeavyScope),
    [rawWorkspaceFromHeavyScope],
  );
  const parsedWorkspaceFromStore = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspaceFromStore),
    [rawWorkspaceFromStore],
  );
  const parsedWorkspaceFromHeavyScope = useMemo(
    (): CaseResolverWorkspace => parseCaseResolverWorkspace(rawWorkspaceFromHeavyScope),
    [rawWorkspaceFromHeavyScope],
  );
  const preferredWorkspaceSelection = useMemo(
    () =>
      resolvePreferredCaseResolverWorkspace({
        storeWorkspace: parsedWorkspaceFromStore,
        heavyWorkspace: parsedWorkspaceFromHeavyScope,
        hasStoreWorkspace: hasWorkspaceFromStore,
        hasHeavyWorkspace: hasWorkspaceFromHeavyScope,
        requestedFileId,
      }),
    [
      hasWorkspaceFromHeavyScope,
      hasWorkspaceFromStore,
      parsedWorkspaceFromHeavyScope,
      parsedWorkspaceFromStore,
      requestedFileId,
    ],
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
    () => parseFilemakerDatabase(rawFilemakerDatabase),
    [rawFilemakerDatabase]
  );
  const caseResolverCaptureSettings = useMemo(
    (): CaseResolverCaptureSettingsType => parseCaseResolverCaptureSettings(rawCaseResolverCaptureSettings),
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

  const handledRequestedFileIdRef = useRef<string | null>(null);

  const persistence: UseCaseResolverPersistenceValue = useCaseResolverPersistence({
    initialWorkspaceState,
    settingsStoreRef,
    toast,
    setPersistedWorkspaceSnapshot,
    setPersistedWorkspaceComparableSnapshot,
  });
  const syncPersistedWorkspaceTracking = persistence.syncPersistedWorkspaceTracking;
  const clearQueuedWorkspacePersistMutation =
    persistence.clearQueuedWorkspacePersistMutation;
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
    settingsStoreRef,
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
    clearQueuedWorkspacePersistMutation:
      persistence.clearQueuedWorkspacePersistMutation,
    handledRequestedFileIdRef,
  });
  const {
    setSelectedFileId,
    setSelectedAssetId,
    setSelectedFolderPath,
  } = viewState;
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
    workspace,
    workspaceRef,
    setWorkspace,
    isMountedRef,
    requestedFileId,
    canHydrateWorkspaceFromStore,
    preferredWorkspaceSource: preferredWorkspaceSelection.source,
    preferredWorkspaceReason: preferredWorkspaceSelection.reason,
    hasWorkspaceFromStore,
    hasWorkspaceFromHeavyScope,
    parsedWorkspace,
    isApplyingPromptExploderPartyProposal:
      promptExploder.isApplyingPromptExploderPartyProposal,
    heavySettingsIsFetching: heavySettingsQuery.isFetching,
    heavySettingsIsLoading: heavySettingsQuery.isLoading,
    refetchHeavySettings: heavySettingsQuery.refetch,
    syncPersistedWorkspaceTracking,
    clearQueuedWorkspacePersistMutation,
    settingsStoreRef,
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
    workspaceRef.current = workspace;
  }, [workspace]);

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
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace =>
      current.activeFileId === null
        ? current
        : {
          ...current,
          activeFileId: null,
        },
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
    handleCreateNodeFile: assetActions.handleCreateNodeFile,
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

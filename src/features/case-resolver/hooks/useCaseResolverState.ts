'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import {
  type CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  CASE_RESOLVER_CAPTURE_SETTINGS_KEY,
  parseCaseResolverCaptureSettings,
} from '@/features/case-resolver-capture/settings';
import {
  deriveDocumentContentSync,
  normalizeRawDocumentModeFromContent,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';
import {
  FILEMAKER_DATABASE_KEY,
  parseFilemakerDatabase,
} from '@/features/filemaker/settings';
import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
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
  normalizeFolderPath,
  normalizeFolderPaths,
  parseCaseResolverWorkspace,
} from '../settings';
import {
  buildFileEditDraft,
  createId,
  createUniqueFolderPath,
} from '../utils/caseResolverUtils';
import {
  createCaseResolverWorkspaceMutationId,
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
  persistCaseResolverWorkspaceSnapshot,
  stampCaseResolverWorkspaceMutation,
} from '../workspace-persistence';
import { useCaseResolverStateAssetActions } from './useCaseResolverState.asset-actions';
import { useCaseResolverStateFolderActions } from './useCaseResolverState.folder-actions';
import {
  CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT,
  appendOwnedFolderRecords,
  clearStoredEditorDraft,
  collectCaseScopeIds,
  createUniqueCaseFileName,
  normalizeFolderRecords,
  readStoredEditorDraft,
  writeStoredEditorDraft,
} from './useCaseResolverState.helpers';
import { useCaseResolverStatePromptExploderSync } from './useCaseResolverState.prompt-exploder-sync';
import { useCaseResolverStateSelectionActions } from './useCaseResolverState.selection-actions';

import type {
  CaseResolverCategory,
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverFolderRecord,
  CaseResolverIdentifier,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '../types';

const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';

/**
 * Custom hook to manage the complex state and logic of the Case Resolver page.
 */
export function useCaseResolverState() {
  const settingsStore = useSettingsStore();
  const { toast } = useToast();
  const { isMenuCollapsed, setIsMenuCollapsed } = useAdminLayout();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');
  const shouldOpenEditorFromQuery = searchParams.get('openEditor') === '1';

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
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    requestedFileId ?? initialWorkspaceState.activeFileId
  );
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(false);
  const [activeMainView, setActiveMainView] = useState<'workspace' | 'search'>('workspace');
  const [isPreviewPageVisible, setIsPreviewPageVisible] = useState(false);
  const [isPartiesModalOpen, setIsPartiesModalOpen] = useState(false);
  const [editingDocumentDraft, setEditingDocumentDraft] = useState<CaseResolverFileEditDraft | null>(null);
  const [isUploadingScanDraftFiles, setIsUploadingScanDraftFiles] = useState(false);
  const [uploadingScanSlotId, setUploadingScanSlotId] = useState<string | null>(null);

  const [promptExploderPartyProposal, setPromptExploderPartyProposal] = useState<CaseResolverCaptureProposalState | null>(null);
  const [isPromptExploderPartyProposalOpen, setIsPromptExploderPartyProposalOpen] = useState(false);
  const [isApplyingPromptExploderPartyProposal, setIsApplyingPromptExploderPartyProposal] = useState(false);

  const defaultTagId = caseResolverTags[0]?.id ?? null;
  const defaultCaseIdentifierId = caseResolverIdentifiers[0]?.id ?? null;
  const defaultCategoryId = caseResolverCategories[0]?.id ?? null;

  const lastPersistedValueRef = useRef<string>(JSON.stringify(initialWorkspaceState));
  const lastPersistedRevisionRef = useRef<number>(getCaseResolverWorkspaceRevision(initialWorkspaceState));
  const pendingSaveToastRef = useRef<string | null>(null);
  const queuedSerializedWorkspaceRef = useRef<string | null>(null);
  const queuedExpectedRevisionRef = useRef<number | null>(null);
  const queuedMutationIdRef = useRef<string | null>(null);
  const persistWorkspaceTimerRef = useRef<number | null>(null);
  const persistWorkspaceInFlightRef = useRef(false);
  const handledRequestedFileIdRef = useRef<string | null>(null);
  const requestedWorkspaceRefreshFileIdRef = useRef<string | null>(null);

  const flushWorkspacePersist = useCallback((): void => {
    if (persistWorkspaceInFlightRef.current) return;
    const nextSerialized = queuedSerializedWorkspaceRef.current;
    if (!nextSerialized || nextSerialized === lastPersistedValueRef.current) return;
    const expectedRevision =
      queuedExpectedRevisionRef.current ?? lastPersistedRevisionRef.current;
    const mutationId =
      queuedMutationIdRef.current ??
      createCaseResolverWorkspaceMutationId('case-resolver-workspace-auto');
    const parsedWorkspaceForPersist = parseCaseResolverWorkspace(nextSerialized);

    persistWorkspaceInFlightRef.current = true;
    void persistCaseResolverWorkspaceSnapshot({
      workspace: parsedWorkspaceForPersist,
      expectedRevision,
      mutationId,
      source: 'case_view',
    }).then((result) => {
      if (result.ok) {
        const persistedWorkspace = result.workspace;
        const persistedSerialized = JSON.stringify(persistedWorkspace);
        lastPersistedValueRef.current = persistedSerialized;
        lastPersistedRevisionRef.current = getCaseResolverWorkspaceRevision(persistedWorkspace);
        settingsStore.refetch();
        if (queuedSerializedWorkspaceRef.current === nextSerialized) {
          queuedSerializedWorkspaceRef.current = null;
          queuedExpectedRevisionRef.current = null;
          queuedMutationIdRef.current = null;
        } else if (queuedSerializedWorkspaceRef.current) {
          queuedExpectedRevisionRef.current = lastPersistedRevisionRef.current;
        }
        if (pendingSaveToastRef.current) {
          toast(pendingSaveToastRef.current, { variant: 'success' });
          pendingSaveToastRef.current = null;
        }
        return;
      }

      if (result.conflict) {
        const serverWorkspace = result.workspace;
        const serverSerialized = JSON.stringify(serverWorkspace);
        lastPersistedValueRef.current = serverSerialized;
        lastPersistedRevisionRef.current = getCaseResolverWorkspaceRevision(serverWorkspace);
        queuedSerializedWorkspaceRef.current = null;
        queuedExpectedRevisionRef.current = null;
        queuedMutationIdRef.current = null;
        pendingSaveToastRef.current = null;
        setWorkspace(serverWorkspace);
        settingsStore.refetch();
        toast('Case Resolver workspace changed before save completed. Loaded latest server state.', {
          variant: 'warning',
        });
        return;
      }

      if (pendingSaveToastRef.current) {
        pendingSaveToastRef.current = null;
      }
      toast(result.error || 'Failed to save Case Resolver workspace.', { variant: 'error' });
    }).finally(() => {
      persistWorkspaceInFlightRef.current = false;
      if (
        queuedSerializedWorkspaceRef.current &&
        queuedSerializedWorkspaceRef.current !== lastPersistedValueRef.current
      ) {
        flushWorkspacePersist();
      }
    });
  }, [toast]);

  // Sync with store
  useEffect(() => {
    if (!canHydrateWorkspaceFromStore) return;
    const incomingSerialized = JSON.stringify(parsedWorkspace);
    const incomingRevision = getCaseResolverWorkspaceRevision(parsedWorkspace);
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
      const currentSerialized = JSON.stringify(current);
      if (incomingSerialized === currentSerialized) {
        return current;
      }

      if (requestedFileId) {
        const currentHasRequestedFile = current.files.some(
          (file: CaseResolverFile): boolean => file.id === requestedFileId
        );
        const incomingHasRequestedFile = parsedWorkspace.files.some(
          (file: CaseResolverFile): boolean => file.id === requestedFileId
        );
        if (!currentHasRequestedFile && incomingHasRequestedFile) {
          lastPersistedValueRef.current = incomingSerialized;
          lastPersistedRevisionRef.current = incomingRevision;
          queuedSerializedWorkspaceRef.current = null;
          queuedExpectedRevisionRef.current = null;
          queuedMutationIdRef.current = null;
          return parsedWorkspace;
        }
      }

      const currentRevision = getCaseResolverWorkspaceRevision(current);
      if (incomingRevision <= currentRevision) return current;

      lastPersistedValueRef.current = incomingSerialized;
      lastPersistedRevisionRef.current = incomingRevision;
      queuedSerializedWorkspaceRef.current = null;
      queuedExpectedRevisionRef.current = null;
      queuedMutationIdRef.current = null;
      return parsedWorkspace;
    });
  }, [canHydrateWorkspaceFromStore, parsedWorkspace, requestedFileId]);

  // Handle auto-save
  useEffect(() => {
    const serialized = JSON.stringify(workspace);
    if (serialized === lastPersistedValueRef.current) return;
    queuedSerializedWorkspaceRef.current = serialized;
    if (queuedExpectedRevisionRef.current === null) {
      queuedExpectedRevisionRef.current = lastPersistedRevisionRef.current;
    }
    if (!queuedMutationIdRef.current) {
      queuedMutationIdRef.current =
        workspace.lastMutationId ??
        createCaseResolverWorkspaceMutationId('case-resolver-workspace-auto');
    }

    if (persistWorkspaceTimerRef.current) {
      window.clearTimeout(persistWorkspaceTimerRef.current);
      persistWorkspaceTimerRef.current = null;
    }

    persistWorkspaceTimerRef.current = window.setTimeout(() => {
      persistWorkspaceTimerRef.current = null;
      flushWorkspacePersist();
    }, 350);
  }, [flushWorkspacePersist, workspace]);

  useEffect(() => {
    return (): void => {
      if (persistWorkspaceTimerRef.current) {
        window.clearTimeout(persistWorkspaceTimerRef.current);
        persistWorkspaceTimerRef.current = null;
      }
    };
  }, []);

  const updateWorkspace = useCallback(
    (
      updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
      options?: { persistToast?: string; mutationId?: string; source?: string }
    ): void => {
      setWorkspace((current: CaseResolverWorkspace) => {
        const normalizedCurrent = normalizeCaseResolverWorkspace(current);
        const updated = updater(normalizedCurrent);
        if (updated === current || updated === normalizedCurrent) return current;
        const normalizedUpdated = normalizeCaseResolverWorkspace(updated);
        const mutationId =
          options?.mutationId?.trim() ||
          createCaseResolverWorkspaceMutationId('case-resolver-workspace');
        const stampedWorkspace = stampCaseResolverWorkspaceMutation(normalizedUpdated, {
          baseRevision: getCaseResolverWorkspaceRevision(normalizedCurrent),
          mutationId,
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
        return stampedWorkspace;
      });
    },
    []
  );

  const { confirm, ConfirmationModal } = useConfirm();
  const { PromptInputModal } = usePrompt();

  const handleSelectFile = useCallback((fileId: string): void => {
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      setSelectedAssetId(null);
      return;
    }
    setSelectedFileId(fileId);
    updateWorkspace((current) => ({ ...current, activeFileId: fileId }));
    setSelectedFolderPath(null);
    setSelectedAssetId(null);
  }, [selectedFileId, updateWorkspace]);

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
    () => new Map(workspace.files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])),
    [workspace.files]
  );

  const selectedCaseContainerId = useMemo((): string | null => {
    const contextFileId = selectedFileId ?? workspace.activeFileId;
    if (!contextFileId) return null;
    const contextFile = filesById.get(contextFileId) ?? null;
    if (!contextFile) return null;
    if (contextFile.fileType === 'case') return contextFile.id;
    if (!contextFile.parentCaseId) return null;
    const parentFile = filesById.get(contextFile.parentCaseId) ?? null;
    return parentFile?.fileType === 'case' ? parentFile.id : null;
  }, [filesById, selectedFileId, workspace.activeFileId]);

  const resolvedCaseContainerIdForCreate = useMemo((): string | null => {
    if (selectedCaseContainerId) return selectedCaseContainerId;

    if (requestedFileId) {
      const requestedFile = filesById.get(requestedFileId) ?? null;
      if (requestedFile?.fileType === 'case') return requestedFile.id;
      if (requestedFile?.parentCaseId) {
        const parentCase = filesById.get(requestedFile.parentCaseId) ?? null;
        if (parentCase?.fileType === 'case') return parentCase.id;
      }
    }

    const firstCaseFile = workspace.files.find(
      (file: CaseResolverFile): boolean => file.fileType === 'case'
    );
    return firstCaseFile?.id ?? null;
  }, [filesById, requestedFileId, selectedCaseContainerId, workspace.files]);

  const selectedCaseScopeIds = useMemo(
    (): Set<string> | null => collectCaseScopeIds(workspace.files, selectedCaseContainerId),
    [selectedCaseContainerId, workspace.files]
  );

  const handleCreateFolder = useCallback((targetFolderPath: string | null): void => {
    const ownerCaseId = selectedCaseContainerId ?? resolvedCaseContainerIdForCreate ?? null;
    updateWorkspace((current) => {
      const normalizedTargetFolder = normalizeFolderPath(targetFolderPath ?? '');
      const existingFoldersForOwner =
        ownerCaseId
          ? normalizeFolderRecords(current.folderRecords)
            .filter((record: CaseResolverFolderRecord): boolean => record.ownerCaseId === ownerCaseId)
            .map((record: CaseResolverFolderRecord): string => record.path)
          : current.folders;
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
  }, [resolvedCaseContainerIdForCreate, selectedCaseContainerId, updateWorkspace]);

  const handleCreateFile = useCallback((targetFolderPath: string | null): void => {
    const folder = normalizeFolderPath(targetFolderPath ?? '');
    const runtimeCaseResolverSettings = parseCaseResolverSettings(
      settingsStore.get(CASE_RESOLVER_SETTINGS_KEY)
    );
    const runtimeDefaultDocumentFormat = parseCaseResolverDefaultDocumentFormat(
      settingsStore.get(CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY),
      runtimeCaseResolverSettings.defaultDocumentFormat
    );
    let missingCaseContainer = false;
    updateWorkspace((current) => {
      const filesMap = new Map<string, CaseResolverFile>(
        current.files.map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
      );
      const resolveContextCaseId = (): string | null => {
        const contextCandidates = [
          selectedFileId,
          current.activeFileId,
          requestedFileId,
        ];
        for (const candidateId of contextCandidates) {
          if (!candidateId) continue;
          const candidate = filesMap.get(candidateId) ?? null;
          if (!candidate) continue;
          if (candidate.fileType === 'case') return candidate.id;
          if (!candidate.parentCaseId) continue;
          const parent = filesMap.get(candidate.parentCaseId) ?? null;
          if (parent?.fileType === 'case') return parent.id;
        }
        return current.files.find(
          (file: CaseResolverFile): boolean => file.fileType === 'case'
        )?.id ?? null;
      };

      const parentCaseId = resolveContextCaseId();
      if (!parentCaseId) {
        missingCaseContainer = true;
        return current;
      }

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
        parentCaseId,
        editorType: runtimeDefaultDocumentFormat,
        tagId: defaultTagId,
        caseIdentifierId: defaultCaseIdentifierId,
        categoryId: defaultCategoryId,
      });

      return {
        ...current,
        files: [...current.files, file],
        folders: normalizeFolderPaths([...current.folders, folder]),
        folderRecords: appendOwnedFolderRecords({
          records: current.folderRecords,
          folderPath: folder,
          ownerCaseId: parentCaseId,
        }),
      };
    }, { persistToast: CASE_RESOLVER_TREE_SAVE_TOAST });

    if (missingCaseContainer) {
      toast('Cannot create document without a selected case.', { variant: 'error' });
      return;
    }
  }, [
    defaultCaseIdentifierId,
    defaultCategoryId,
    defaultTagId,
    requestedFileId,
    selectedFileId,
    settingsStore,
    toast,
    updateWorkspace,
  ]);

  const {
    handleCreateScanFile,
    handleUploadScanFiles,
    handleRunScanFileOcr,
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
    selectedFileId,
    requestedFileId,
    defaultTagId,
    defaultCaseIdentifierId,
    defaultCategoryId,
    selectedCaseContainerId,
    resolvedCaseContainerIdForCreate,
    setSelectedFileId,
    setSelectedFolderPath,
    setSelectedAssetId,
    treeSaveToast: CASE_RESOLVER_TREE_SAVE_TOAST,
  });

  useEffect(() => {
    if (!requestedFileId) {
      requestedWorkspaceRefreshFileIdRef.current = null;
      return;
    }
    const requestedFileExists = workspace.files.some(
      (file: CaseResolverFile): boolean => file.id === requestedFileId
    );
    if (requestedFileExists) {
      requestedWorkspaceRefreshFileIdRef.current = null;
      return;
    }
    if (requestedWorkspaceRefreshFileIdRef.current === requestedFileId) return;

    requestedWorkspaceRefreshFileIdRef.current = requestedFileId;
    let isCancelled = false;
    void (async (): Promise<void> => {
      const refreshedWorkspace = await fetchCaseResolverWorkspaceSnapshot('case_view');
      if (!refreshedWorkspace) return;
      const refreshedHasRequestedFile = refreshedWorkspace.files.some(
        (file: CaseResolverFile): boolean => file.id === requestedFileId
      );
      if (isCancelled) return;
      if (!refreshedHasRequestedFile) {
        requestedWorkspaceRefreshFileIdRef.current = null;
        return;
      }

      lastPersistedValueRef.current = JSON.stringify(refreshedWorkspace);
      lastPersistedRevisionRef.current = getCaseResolverWorkspaceRevision(refreshedWorkspace);
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
    })();

    return (): void => {
      isCancelled = true;
    };
  }, [requestedFileId, workspace.files]);

  useEffect(() => {
    if (!requestedFileId) {
      handledRequestedFileIdRef.current = null;
      return;
    }
    if (handledRequestedFileIdRef.current === requestedFileId) return;
    const requestedFileExists = workspace.files.some(
      (file: CaseResolverFile): boolean => file.id === requestedFileId
    );
    if (!requestedFileExists) {
      handledRequestedFileIdRef.current = null;
      setSelectedFileId(requestedFileId);
      setSelectedAssetId(null);
      setSelectedFolderPath(null);
      setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
        if (current.activeFileId === null) return current;
        const nextWorkspace = {
          ...current,
          activeFileId: null,
        };
        const serialized = JSON.stringify(nextWorkspace);
        lastPersistedValueRef.current = serialized;
        queuedSerializedWorkspaceRef.current = null;
        queuedExpectedRevisionRef.current = null;
        queuedMutationIdRef.current = null;
        if (persistWorkspaceTimerRef.current) {
          window.clearTimeout(persistWorkspaceTimerRef.current);
          persistWorkspaceTimerRef.current = null;
        }
        return nextWorkspace;
      });
      return;
    }

    handledRequestedFileIdRef.current = requestedFileId;
    setSelectedFileId(requestedFileId);
    setSelectedAssetId(null);
    setSelectedFolderPath(null);
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
      if (current.activeFileId === requestedFileId) return current;
      const nextWorkspace = {
        ...current,
        activeFileId: requestedFileId,
      };
      const serialized = JSON.stringify(nextWorkspace);
      lastPersistedValueRef.current = serialized;
      queuedSerializedWorkspaceRef.current = null;
      queuedExpectedRevisionRef.current = null;
      queuedMutationIdRef.current = null;
      if (persistWorkspaceTimerRef.current) {
        window.clearTimeout(persistWorkspaceTimerRef.current);
        persistWorkspaceTimerRef.current = null;
      }
      return nextWorkspace;
    });
  }, [requestedFileId, workspace.files]);

  const {
    handleDeleteFolder,
    handleMoveFile,
    handleMoveAsset,
    handleRenameFile,
    handleRenameAsset,
    handleRenameFolder,
  } = useCaseResolverStateFolderActions({
    confirm,
    updateWorkspace,
    workspace,
    selectedCaseScopeIds,
    selectedCaseContainerId,
    setSelectedFileId,
    setSelectedAssetId,
    setSelectedFolderPath,
    treeSaveToast: CASE_RESOLVER_TREE_SAVE_TOAST,
  });

  const handleOpenFileEditor = useCallback((fileId: string): void => {
    const target = workspace.files.find((file) => file.id === fileId);
    if (!target) {
      toast('File not found.', { variant: 'warning' });
      return;
    }
    if (target.fileType === 'case') {
      toast('Cases are edited in the Cases list. Select a document to edit.', {
        variant: 'info',
      });
      return;
    }
    const baseDraft = buildFileEditDraft(target);
    const recoveredDraft = readStoredEditorDraft(fileId);
    const canRecoverStoredDraft =
      recoveredDraft?.baseDocumentContentVersion === baseDraft.baseDocumentContentVersion;
    const nextDraft = canRecoverStoredDraft
      ? {
        ...baseDraft,
        ...recoveredDraft.draft,
        documentHistory: baseDraft.documentHistory,
      }
      : baseDraft;
    if (canRecoverStoredDraft) {
      toast('Recovered unsaved draft from local storage.', { variant: 'info' });
    } else if (recoveredDraft) {
      clearStoredEditorDraft(fileId);
    }
    setEditingDocumentDraft(nextDraft);
    setSelectedFileId(fileId);
    setSelectedAssetId(null);
    setSelectedFolderPath(null);
    updateWorkspace((current) => ({ ...current, activeFileId: fileId }));
  }, [workspace.files, updateWorkspace, toast]);

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

  const handleSaveFileEditor = useCallback((): void => {
    if (!editingDocumentDraft) return;
    const currentFile = workspace.files.find(
      (file: CaseResolverFile): boolean => file.id === editingDocumentDraft.id
    );
    if (!currentFile) {
      toast('Document no longer exists. Please refresh list.', { variant: 'warning' });
      return;
    }
    if (currentFile.documentContentVersion !== editingDocumentDraft.baseDocumentContentVersion) {
      toast('Document changed elsewhere. Reopen editor to merge latest version.', {
        variant: 'warning',
      });
      return;
    }
    const resolvedMode = normalizeRawDocumentModeFromContent({
      mode: editingDocumentDraft.editorType,
      rawContent: editingDocumentDraft.documentContent,
      rawMarkdown: editingDocumentDraft.documentContentMarkdown,
      rawHtml: editingDocumentDraft.documentContentHtml,
    });
    const canonical = deriveDocumentContentSync({
      mode: resolvedMode,
      value: resolvedMode === 'wysiwyg'
        ? editingDocumentDraft.documentContentHtml
        : editingDocumentDraft.documentContentMarkdown,
      previousHtml: editingDocumentDraft.documentContentHtml,
      previousMarkdown: editingDocumentDraft.documentContentMarkdown,
    });
    const nextStoredContent = toStorageDocumentValue(canonical);
    const nextOriginalDocumentContent =
      editingDocumentDraft.activeDocumentVersion === 'original'
        ? nextStoredContent
        : editingDocumentDraft.originalDocumentContent;
    const nextExplodedDocumentContent =
      editingDocumentDraft.activeDocumentVersion === 'exploded'
        ? nextStoredContent
        : editingDocumentDraft.explodedDocumentContent;
    const hasContentChanges =
      currentFile.activeDocumentVersion !== editingDocumentDraft.activeDocumentVersion ||
      currentFile.editorType !== canonical.mode ||
      currentFile.documentContent !== nextStoredContent ||
      currentFile.documentContentMarkdown !== canonical.markdown ||
      currentFile.documentContentHtml !== canonical.html ||
      currentFile.documentContentPlainText !== canonical.plainText ||
      JSON.stringify(currentFile.documentConversionWarnings) !== JSON.stringify(canonical.warnings) ||
      currentFile.originalDocumentContent !== nextOriginalDocumentContent ||
      currentFile.explodedDocumentContent !== nextExplodedDocumentContent;
    const hasMeaningfulChanges =
      currentFile.name !== editingDocumentDraft.name ||
      currentFile.folder !== editingDocumentDraft.folder ||
      currentFile.parentCaseId !== editingDocumentDraft.parentCaseId ||
      JSON.stringify(currentFile.referenceCaseIds) !== JSON.stringify(editingDocumentDraft.referenceCaseIds) ||
      currentFile.documentDate !== editingDocumentDraft.documentDate ||
      currentFile.tagId !== editingDocumentDraft.tagId ||
      currentFile.caseIdentifierId !== editingDocumentDraft.caseIdentifierId ||
      currentFile.categoryId !== editingDocumentDraft.categoryId ||
      JSON.stringify(currentFile.addresser) !== JSON.stringify(editingDocumentDraft.addresser) ||
      JSON.stringify(currentFile.addressee) !== JSON.stringify(editingDocumentDraft.addressee) ||
      hasContentChanges;

    if (!hasMeaningfulChanges) {
      clearStoredEditorDraft(editingDocumentDraft.id);
      setEditingDocumentDraft(null);
      return;
    }
    const now = new Date().toISOString();
    updateWorkspace((current) => ({
      ...current,
      files: current.files.map((file) =>
        file.id === editingDocumentDraft.id
          ? (() => {
            const nextDocumentHistory = hasContentChanges
              ? [
                {
                  id: createId('case-doc-history'),
                  savedAt: now,
                  documentContentVersion: file.documentContentVersion,
                  activeDocumentVersion: file.activeDocumentVersion,
                  editorType: file.editorType,
                  documentContent: file.documentContent,
                  documentContentMarkdown: file.documentContentMarkdown,
                  documentContentHtml: file.documentContentHtml,
                  documentContentPlainText: file.documentContentPlainText,
                },
                ...file.documentHistory,
              ].slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT)
              : file.documentHistory;
            return {
              ...file,
              ...editingDocumentDraft,
              editorType: canonical.mode,
              documentContentFormatVersion: 1,
              documentContentVersion: file.documentContentVersion + 1,
              documentContent: nextStoredContent,
              documentContentMarkdown: canonical.markdown,
              documentContentHtml: canonical.html,
              documentContentPlainText: canonical.plainText,
              documentHistory: nextDocumentHistory,
              documentConversionWarnings: canonical.warnings,
              lastContentConversionAt: now,
              originalDocumentContent: nextOriginalDocumentContent,
              explodedDocumentContent: nextExplodedDocumentContent,
              updatedAt: now,
            };
          })()
          : file
      ),
    }), { persistToast: 'Document changes saved.' });
    clearStoredEditorDraft(editingDocumentDraft.id);
    setEditingDocumentDraft(null);
  }, [editingDocumentDraft, toast, updateWorkspace, workspace.files]);

  const handleDiscardFileEditorDraft = useCallback((): void => {
    if (editingDocumentDraft) {
      clearStoredEditorDraft(editingDocumentDraft.id);
    }
    setEditingDocumentDraft(null);
  }, [editingDocumentDraft]);

  useEffect(() => {
    if (!editingDocumentDraft) return;
    const timer = window.setTimeout(() => {
      writeStoredEditorDraft(editingDocumentDraft.id, editingDocumentDraft);
    }, 250);
    return (): void => window.clearTimeout(timer);
  }, [editingDocumentDraft]);

  useCaseResolverStatePromptExploderSync({
    workspaceActiveFileId: workspace.activeFileId,
    filemakerDatabase,
    caseResolverCaptureSettings,
    updateWorkspace,
    setEditingDocumentDraft,
    setPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal,
    setIsPromptExploderPartyProposalOpen,
    toast,
  });

  return {
    workspace,
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
    setEditingDocumentDraft,
    isUploadingScanDraftFiles,
    setIsUploadingScanDraftFiles,
    uploadingScanSlotId,
    setUploadingScanSlotId,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    caseResolverSettings,
    filemakerDatabase,
    countries,
    isMenuCollapsed,
    setIsMenuCollapsed,
    requestedFileId,
    shouldOpenEditorFromQuery,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleCreateScanFile,
    handleCreateImageAsset,
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
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal,
    confirmAction: confirm,
    ConfirmationModal,
    PromptInputModal,
  };
}

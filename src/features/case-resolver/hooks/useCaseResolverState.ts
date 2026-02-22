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
  CaseResolverAssetFile,
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
  createId,
  createUniqueFolderPath,
} from '../utils/caseResolverUtils';
import {
  computeCaseResolverConflictRetryDelayMs,
  createCaseResolverWorkspaceMutationId,
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
  clearStoredEditorDraft,
  collectCaseScopeIds,
  createUniqueCaseFileName,
  hasCaseResolverDraftMeaningfulChanges,
  isCaseResolverCreateContextReady,
  normalizeFolderRecords,
  resolveCaseScopedFolderTarget,
  readStoredEditorDraft,
  serializeWorkspaceForUnsavedChangesCheck,
  resolveCaseContainerIdForFileId,
  resolveCaseResolverActiveCaseId,
  resolveCaseResolverFileById,
  writeStoredEditorDraft,
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

const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';
const CASE_RESOLVER_REQUESTED_FILE_REFRESH_MAX_ATTEMPTS = 20;
const CASE_RESOLVER_REQUESTED_FILE_REFRESH_INTERVAL_MS = 250;
const CASE_RESOLVER_WORKSPACE_CONFLICT_AUTO_RETRY_LIMIT = 5;
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

  const [promptExploderPartyProposal, setPromptExploderPartyProposal] = useState<CaseResolverCaptureProposalState | null>(null);
  const [isPromptExploderPartyProposalOpen, setIsPromptExploderPartyProposalOpen] = useState(false);
  const [isApplyingPromptExploderPartyProposal, setIsApplyingPromptExploderPartyProposalState] =
    useState(false);
  const [promptExploderPayloadRefreshVersion, setPromptExploderPayloadRefreshVersion] = useState(0);
   
  const [promptExploderApplyDiagnostics, setPromptExploderApplyDiagnostics] =
    useState<CaseResolverPromptExploderApplyUiDiagnostics | null>(null);
  const [, setPersistedWorkspaceSnapshot] = useState<string>(
    JSON.stringify(initialWorkspaceState)
  );
  const [persistedWorkspaceComparableSnapshot, setPersistedWorkspaceComparableSnapshot] =
    useState<string>(() =>
      serializeWorkspaceForUnsavedChangesCheck(initialWorkspaceState)
    );
  const [isWorkspaceSaving, setIsWorkspaceSaving] = useState(false);
  const [, setWorkspaceSaveStatus] = useState<
    'idle' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'error'
  >('idle');
  const [, setWorkspaceSaveError] = useState<string | null>(null);

  const defaultTagId = caseResolverTags[0]?.id ?? null;
  const defaultCaseIdentifierId = caseResolverIdentifiers[0]?.id ?? null;
  const defaultCategoryId = caseResolverCategories[0]?.id ?? null;

  const lastPersistedValueRef = useRef<string>(JSON.stringify(initialWorkspaceState));
  const lastPersistedRevisionRef = useRef<number>(getCaseResolverWorkspaceRevision(initialWorkspaceState));
  const pendingSaveToastRef = useRef<string | null>(null);
  const queuedSerializedWorkspaceRef = useRef<string | null>(null);
  const queuedExpectedRevisionRef = useRef<number | null>(null);
  const queuedMutationIdRef = useRef<string | null>(null);
  const conflictRetryTimerRef = useRef<number | null>(null);
  const draftStorageWarningShownRef = useRef(false);
  const persistWorkspaceTimerRef = useRef<number | null>(null);
  const persistWorkspaceInFlightRef = useRef(false);
  const workspaceConflictAutoRetryCountRef = useRef(0);
  const lastPromptExploderPayloadKeyRef = useRef<string | null>(null);
  const autoAppliedPromptExploderPayloadKeysRef = useRef<Set<string>>(new Set());
  const blockedPromptExploderGuardrailKeysRef = useRef<Set<string>>(new Set());
  const appliedPromptExploderTransferIdsRef = useRef<Set<string>>(new Set());
  const requestedCaseStatusRef = useRef<CaseResolverRequestedCaseStatus>(
    requestedFileId ? 'loading' : 'ready'
  );
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
  const setIsApplyingPromptExploderPartyProposal = useCallback(
    (value: boolean | ((current: boolean) => boolean)): void => {
      setIsApplyingPromptExploderPartyProposalState((current) => {
        const nextValue =
          typeof value === 'function'
            ? (value as (current: boolean) => boolean)(current)
            : value;
        isApplyingPromptExploderPartyProposalRef.current = nextValue;
        return nextValue;
      });
    },
    []
  );
  const refetchSettingsStore = useCallback((): void => {
    settingsStoreRef.current.refetch();
  }, []);
  const transitionPromptExploderApplyDiagnostics = useCallback(
    (input: {
      nextStatus: PromptExploderTransferUiStatus;
      reason?: string | null;
      force?: boolean;
      patch?: Partial<CaseResolverPromptExploderApplyUiDiagnostics>;
    }): void => {
      setPromptExploderApplyDiagnostics((current: CaseResolverPromptExploderApplyUiDiagnostics | null) =>
         
        applyPromptExploderTransferLifecycleUpdate<CaseResolverPromptExploderApplyUiDiagnostics>(current, {
          nextStatus: input.nextStatus,
          reason: input.reason ?? null,
          force: input.force ?? false,
           
          patch: input.patch ?? {},
        })
      );
    },
    []
  );
  const logPromptExploderBindingGuardrailEvent = useCallback((input: {
    mode: 'manual' | 'auto';
    reason: 'document_mismatch' | 'session_mismatch';
    payload: CaseResolverPromptExploderPendingPayload;
    requestedContextFileId: string;
    requestedSessionId: string;
  }): void => {
    logCaseResolverWorkspaceEvent({
      source: input.mode === 'manual'
        ? 'prompt_exploder_apply_manual'
        : 'prompt_exploder_apply_auto',
      action: input.reason === 'document_mismatch'
        ? 'prompt_exploder_binding_block_document_mismatch'
        : 'prompt_exploder_binding_block_session_mismatch',
      message: JSON.stringify({
        reason: input.reason,
        payloadCreatedAt: input.payload.createdAt,
        payloadContextFileId: input.payload.caseResolverContext?.fileId ?? null,
        payloadSessionId: input.payload.caseResolverContext?.sessionId ?? null,
        requestedContextFileId: input.requestedContextFileId || null,
        requestedPromptExploderSessionId: input.requestedSessionId || null,
        openEditorFromQuery: shouldOpenEditorFromQuery,
      }),
    });
  }, [shouldOpenEditorFromQuery]);

  const persistAppliedPromptExploderTransferIds = useCallback((): void => {
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify(
        Array.from(appliedPromptExploderTransferIdsRef.current).slice(
          -CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_LIMIT
        )
      );
    
      window.localStorage.setItem(CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_KEY, payload);
    } catch {
      // Ignore storage persistence failures for idempotency cache.
    }
  }, []);

  const markPromptExploderTransferApplied = useCallback((transferId: string | null): void => {
    const normalizedTransferId = transferId?.trim() ?? '';
    if (!normalizedTransferId) return;
    appliedPromptExploderTransferIdsRef.current.add(normalizedTransferId);
    if (
      appliedPromptExploderTransferIdsRef.current.size >
            CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_LIMIT
    ) {
      const values = Array.from(appliedPromptExploderTransferIdsRef.current);
      const trimmed = values.slice(-CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_LIMIT);
    
      appliedPromptExploderTransferIdsRef.current = new Set(trimmed);
    }
    persistAppliedPromptExploderTransferIds();
  }, [persistAppliedPromptExploderTransferIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const next = new Set<string>();
      parsed.forEach((entry: unknown): void => {
        if (typeof entry !== 'string') return;
        const normalized = entry.trim();
        if (!normalized) return;
        next.add(normalized);
      });
      appliedPromptExploderTransferIdsRef.current = next;
    } catch {
      // Ignore idempotency cache restoration issues.
    }
  }, []);

  useEffect(() => {
    requestedCaseStatusRef.current = requestedCaseStatus;
  }, [requestedCaseStatus]);

  useEffect(() => {
    isApplyingPromptExploderPartyProposalRef.current = isApplyingPromptExploderPartyProposal;
  }, [isApplyingPromptExploderPartyProposal]);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  const syncPersistedWorkspaceTracking = useCallback(
    (nextWorkspace: CaseResolverWorkspace): void => {
      const serialized = JSON.stringify(nextWorkspace);
      lastPersistedValueRef.current = serialized;
      setPersistedWorkspaceSnapshot(serialized);
      setPersistedWorkspaceComparableSnapshot(
        serializeWorkspaceForUnsavedChangesCheck(nextWorkspace)
      );
      lastPersistedRevisionRef.current = getCaseResolverWorkspaceRevision(nextWorkspace);
    },
    []
  );

  const clearConflictRetryTimer = useCallback((): void => {
    if (conflictRetryTimerRef.current === null) return;
    window.clearTimeout(conflictRetryTimerRef.current);
    conflictRetryTimerRef.current = null;
  }, []);

  const flushWorkspacePersist = useCallback((): void => {
    if (persistWorkspaceInFlightRef.current) return;
    clearConflictRetryTimer();

    // If the settings store is currently fetching (e.g. after navigation from the
    // Cases page which called refetch() after its own save), defer the save.
    // The pending store update will trigger the sync effect to update
    // lastPersistedRevisionRef to the server's actual revision, preventing
    // a spurious conflict caused by a stale expectedRevision on mount.
    if (settingsStoreRef.current.isFetching) {
      persistWorkspaceTimerRef.current = window.setTimeout(() => {
        persistWorkspaceTimerRef.current = null;
        flushWorkspacePersist();
      }, 100);
      return;
    }

    const nextSerialized = queuedSerializedWorkspaceRef.current;
    if (!nextSerialized || nextSerialized === lastPersistedValueRef.current) {
      workspaceConflictAutoRetryCountRef.current = 0;
      setIsWorkspaceSaving(false);
      setWorkspaceSaveStatus('saved');
      setWorkspaceSaveError(null);
      return;
    }
    const expectedRevision =
      queuedExpectedRevisionRef.current ?? lastPersistedRevisionRef.current;
    const mutationId =
      queuedMutationIdRef.current ??
      createCaseResolverWorkspaceMutationId('case-resolver-workspace-manual');
    const parsedWorkspaceForPersist = parseCaseResolverWorkspace(nextSerialized);

    persistWorkspaceInFlightRef.current = true;
    setIsWorkspaceSaving(true);
    setWorkspaceSaveStatus('saving');
    setWorkspaceSaveError(null);
    let shouldContinuePersistQueue = true;
    void persistCaseResolverWorkspaceSnapshot({
      workspace: parsedWorkspaceForPersist,
      expectedRevision,
      mutationId,
      source: 'case_view',
    }).then((result) => {
      if (result.ok) {
        clearConflictRetryTimer();
        workspaceConflictAutoRetryCountRef.current = 0;
        const persistedWorkspace = result.workspace;
        syncPersistedWorkspaceTracking(persistedWorkspace);
        logCaseResolverWorkspaceEvent({
          source: 'case_view',
          action: 'manual_save_success',
          mutationId,
          expectedRevision,
          workspaceRevision: getCaseResolverWorkspaceRevision(persistedWorkspace),
        });
        settingsStoreRef.current.refetch();
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
        setWorkspaceSaveStatus('saved');
        setWorkspaceSaveError(null);
        return;
      }

      if (!result.ok && result.conflict) {
        const serverWorkspace = result.workspace;
        const serverRevision = getCaseResolverWorkspaceRevision(serverWorkspace);
        syncPersistedWorkspaceTracking(serverWorkspace);
        logCaseResolverWorkspaceEvent({
          source: 'case_view',
          action: 'manual_save_conflict',
          mutationId,
          expectedRevision,
          workspaceRevision: serverRevision,
        });
        const nextRetryCount = workspaceConflictAutoRetryCountRef.current + 1;
        workspaceConflictAutoRetryCountRef.current = nextRetryCount;
        if (nextRetryCount > CASE_RESOLVER_WORKSPACE_CONFLICT_AUTO_RETRY_LIMIT) {
          clearConflictRetryTimer();
          shouldContinuePersistQueue = false;
          pendingSaveToastRef.current = null;
          const retryErrorMessage =
            'Could not save Case Resolver changes because workspace kept changing. Please try again.';
          logCaseResolverWorkspaceEvent({
            source: 'case_view',
            action: 'manual_save_conflict_retry_exhausted',
            mutationId,
            expectedRevision,
            workspaceRevision: serverRevision,
            message: retryErrorMessage,
          });
          setWorkspaceSaveStatus('error');
          setWorkspaceSaveError(retryErrorMessage);
          toast(retryErrorMessage, { variant: 'error' });
          return;
        }

        queuedSerializedWorkspaceRef.current = nextSerialized;
        queuedExpectedRevisionRef.current = serverRevision;
        queuedMutationIdRef.current = mutationId;
        const retryDelayMs = computeCaseResolverConflictRetryDelayMs(nextRetryCount);
        setWorkspaceSaveStatus('saving');
        setWorkspaceSaveError(null);
        clearConflictRetryTimer();
        conflictRetryTimerRef.current = window.setTimeout((): void => {
          conflictRetryTimerRef.current = null;
          flushWorkspacePersist();
        }, retryDelayMs);
        shouldContinuePersistQueue = false;
        logCaseResolverWorkspaceEvent({
          source: 'case_view',
          action: 'manual_save_conflict_retry',
          mutationId,
          expectedRevision: serverRevision,
          workspaceRevision: serverRevision,
          message: `Auto-retrying save after conflict (${nextRetryCount}/${CASE_RESOLVER_WORKSPACE_CONFLICT_AUTO_RETRY_LIMIT}) in ${retryDelayMs}ms.`,
        });
        return;
      }

      clearConflictRetryTimer();
      workspaceConflictAutoRetryCountRef.current = 0;
      if (pendingSaveToastRef.current) {
        pendingSaveToastRef.current = null;
      }
      shouldContinuePersistQueue = false;
      const errorMessage = result.error || 'Failed to save Case Resolver workspace.';
      logCaseResolverWorkspaceEvent({
        source: 'case_view',
        action: 'manual_save_error',
        mutationId,
        expectedRevision,
        message: errorMessage,
      });
      setWorkspaceSaveStatus('error');
      setWorkspaceSaveError(errorMessage);
      toast(errorMessage, { variant: 'error' });
    }).finally(() => {
      persistWorkspaceInFlightRef.current = false;
      if (
        shouldContinuePersistQueue &&
        queuedSerializedWorkspaceRef.current &&
        queuedSerializedWorkspaceRef.current !== lastPersistedValueRef.current
      ) {
        flushWorkspacePersist();
        return;
      }
      setIsWorkspaceSaving(false);
    });
  }, [clearConflictRetryTimer, syncPersistedWorkspaceTracking, toast]);

  // Sync with store
  useEffect(() => {
    if (!canHydrateWorkspaceFromStore) return;
    if (isApplyingPromptExploderPartyProposalRef.current) return;
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

  const refreshPendingPromptExploderPayload = useCallback((): void => {
    setPromptExploderPayloadRefreshVersion((current) => current + 1);
  }, []);

  const promptExploderPayloadReadState = useMemo<CaseResolverPromptExploderPayloadReadState>(
    () => readCaseResolverPromptExploderPayloadState(),
    [promptExploderPayloadRefreshVersion]
  );
  const pendingPromptExploderPayload = promptExploderPayloadReadState.pendingPayload;
  const expiredPromptExploderPayload = promptExploderPayloadReadState.expiredPayload;
  const observedPromptExploderPayload =
    pendingPromptExploderPayload ?? expiredPromptExploderPayload;
  const pendingPromptExploderPayloadKey = useMemo<string | null>(() => {
    if (!pendingPromptExploderPayload) return null;
    return resolvePromptExploderPendingPayloadIdentity(pendingPromptExploderPayload);
  }, [pendingPromptExploderPayload]);
  const workspaceFileIdsSignature = useMemo(
    () => workspace.files.map((file: CaseResolverFile): string => file.id.trim()).join('|'),
    [workspace.files]
  );
  const observedPromptExploderPayloadKey = useMemo<string | null>(() => {
    if (!observedPromptExploderPayload) return null;
    return resolvePromptExploderPendingPayloadIdentity(observedPromptExploderPayload);
  }, [observedPromptExploderPayload]);

  useEffect(() => {
    if (!observedPromptExploderPayload) {
      lastPromptExploderPayloadKeyRef.current = null;
      return;
    }
    if (
      lastPromptExploderPayloadKeyRef.current === observedPromptExploderPayloadKey &&
            observedPromptExploderPayloadKey !== null
    ) {
      setPromptExploderApplyDiagnostics((current: CaseResolverPromptExploderApplyUiDiagnostics | null): CaseResolverPromptExploderApplyUiDiagnostics | null => (
         
        current
          ? {
            ...current,
            captureSettingsEnabled: caseResolverCaptureSettings.enabled,
          }
          : current
      ));
      return;
    }
    lastPromptExploderPayloadKeyRef.current = observedPromptExploderPayloadKey;
    const payloadContextFileId =
      observedPromptExploderPayload.caseResolverContext?.fileId?.trim() || null;
    const precheckResolvedTargetFileId = resolveCaseResolverFileById(
      workspace.files,
      payloadContextFileId
    )?.id ?? null;
    const precheckResolutionStrategy = precheckResolvedTargetFileId ? 'requested_id' : 'unresolved';
    const isExpiredPayload = Boolean(expiredPromptExploderPayload);
    const diagnostics: CaseResolverPromptExploderApplyUiDiagnostics = {
      applyAttemptId: 'pending',
      transferId: observedPromptExploderPayload.transferId?.trim() || null,
      payloadVersion:
        typeof observedPromptExploderPayload.payloadVersion === 'number' &&
        Number.isFinite(observedPromptExploderPayload.payloadVersion)
          ? Math.trunc(observedPromptExploderPayload.payloadVersion)
          : null,
      payloadChecksum: observedPromptExploderPayload.checksum?.trim() || null,
      payloadStatus: observedPromptExploderPayload.status?.trim() || null,
      payloadCreatedAt: observedPromptExploderPayload.createdAt ?? null,
      payloadKey: observedPromptExploderPayloadKey,
      requestedTargetFileId: payloadContextFileId,
      payloadContextFileId,
      fallbackTargetFileId: null,
      precheckResolvedTargetFileId,
      precheckResolutionStrategy,
      precheckWorkspaceFileCount: workspace.files.length,
      mutationResolvedTargetFileId: null,
      mutationResolutionStrategy: 'unresolved',
      mutationWorkspaceFileCount: workspace.files.length,
      resolvedTargetFileId: precheckResolvedTargetFileId,
      resolutionStrategy: precheckResolutionStrategy,
      hasPartiesPayload: Boolean(observedPromptExploderPayload.caseResolverParties),
      hasMetadataPayload: Boolean(observedPromptExploderPayload.caseResolverMetadata?.placeDate),
      captureSettingsEnabled: caseResolverCaptureSettings.enabled,
      proposalBuilt: false,
      proposalReason: caseResolverCaptureSettings.enabled
        ? (
          (observedPromptExploderPayload.caseResolverParties ||
          observedPromptExploderPayload.caseResolverMetadata?.placeDate)
            ? 'proposal_builder_returned_null'
            : 'no_capture_payload'
        )
        : 'capture_disabled',
      mutationMissingAfterPrecheck: false,
      status: isExpiredPayload ? 'expired' : 'pending',
      reason: isExpiredPayload ? 'payload_expired' : null,
      updatedAt: new Date().toISOString(),
    };
    setPromptExploderApplyDiagnostics(diagnostics);
  }, [
    caseResolverCaptureSettings.enabled,
    expiredPromptExploderPayload,
    observedPromptExploderPayload,
    observedPromptExploderPayloadKey,
    workspaceFileIdsSignature,
    workspace.files,
  ]);

  useEffect(() => {
    refreshPendingPromptExploderPayload();
  }, [refreshPendingPromptExploderPayload, requestedFileId, shouldOpenEditorFromQuery]);

  useEffect(() => {
    const refreshPayload = (): void => {
      refreshPendingPromptExploderPayload();
    };
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY) return;
      refreshPayload();
    };
    const handleBridgeStorageEvent = (): void => {
      refreshPayload();
    };
    const handleFocus = (): void => {
      refreshPayload();
    };
    const handlePageShow = (): void => {
      refreshPayload();
    };
    const handleVisibilityChange = (): void => {
      if (document.visibilityState !== 'visible') return;
      refreshPayload();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(
      PROMPT_EXPLODER_BRIDGE_STORAGE_EVENT,
      handleBridgeStorageEvent as EventListener
    );
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return (): void => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(
        PROMPT_EXPLODER_BRIDGE_STORAGE_EVENT,
        handleBridgeStorageEvent as EventListener
      );
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshPendingPromptExploderPayload]);

  const handleDiscardPendingPromptExploderPayload = useCallback((): void => {
    const discardedPayload = discardPendingCaseResolverPromptExploderPayload();
    if (!discardedPayload) {
      toast('No pending Prompt Exploder output to discard.', { variant: 'info' });
      return;
    }
    const payloadContextFileId = discardedPayload.caseResolverContext?.fileId?.trim() || null;
    const precheckResolvedTargetFileId = resolveCaseResolverFileById(
      workspace.files,
      payloadContextFileId
    )?.id ?? null;
    const precheckResolutionStrategy = precheckResolvedTargetFileId ? 'requested_id' : 'unresolved';
    setPromptExploderPartyProposal(null);
    setIsPromptExploderPartyProposalOpen(false);
    setIsApplyingPromptExploderPartyProposal(false);
    const diagnostics: CaseResolverPromptExploderApplyUiDiagnostics = {
      applyAttemptId: 'discarded',
      transferId: discardedPayload.transferId?.trim() || null,
      payloadVersion:
        typeof discardedPayload.payloadVersion === 'number' &&
        Number.isFinite(discardedPayload.payloadVersion)
          ? Math.trunc(discardedPayload.payloadVersion)
          : null,
      payloadChecksum: discardedPayload.checksum?.trim() || null,
      payloadStatus: discardedPayload.status?.trim() || null,
      payloadCreatedAt: discardedPayload.createdAt ?? null,
      payloadKey: [
        discardedPayload.createdAt,
        discardedPayload.caseResolverContext?.fileId ?? '',
        discardedPayload.prompt.length,
      ].join('|'),
      requestedTargetFileId: payloadContextFileId,
      payloadContextFileId,
      fallbackTargetFileId: null,
      precheckResolvedTargetFileId,
      precheckResolutionStrategy,
      precheckWorkspaceFileCount: workspace.files.length,
      mutationResolvedTargetFileId: null,
      mutationResolutionStrategy: 'unresolved',
      mutationWorkspaceFileCount: workspace.files.length,
      resolvedTargetFileId: precheckResolvedTargetFileId,
      resolutionStrategy: precheckResolutionStrategy,
      hasPartiesPayload: Boolean(discardedPayload.caseResolverParties),
      hasMetadataPayload: Boolean(discardedPayload.caseResolverMetadata?.placeDate),
      captureSettingsEnabled: caseResolverCaptureSettings.enabled,
      proposalBuilt: false,
      proposalReason: caseResolverCaptureSettings.enabled
        ? (
          (discardedPayload.caseResolverParties ||
          discardedPayload.caseResolverMetadata?.placeDate)
            ? 'proposal_builder_returned_null'
            : 'no_capture_payload'
        )
        : 'capture_disabled',
      mutationMissingAfterPrecheck: false,
      status: 'discarded',
      reason: null,
      updatedAt: new Date().toISOString(),
    };
    setPromptExploderApplyDiagnostics(diagnostics);
    refreshPendingPromptExploderPayload();
    toast('Prompt Exploder output discarded.', { variant: 'info' });
  }, [
    caseResolverCaptureSettings.enabled,
    refreshPendingPromptExploderPayload,
    toast,
    workspace.files,
  ]);

  const handleApplyPendingPromptExploderPayload = useCallback(
    async (): Promise<boolean> => {
      const payload = pendingPromptExploderPayload;
      if (!payload) {
        if (expiredPromptExploderPayload) {
          transitionPromptExploderApplyDiagnostics({
            nextStatus: 'expired',
            reason: 'payload_expired',
          });
          toast(
            'Pending Prompt Exploder output expired before apply. Discard it and re-send from Prompt Exploder.',
            { variant: 'warning' }
          );
          refreshPendingPromptExploderPayload();
          return false;
        }
        toast('No pending Prompt Exploder output to apply.', { variant: 'info' });
        refreshPendingPromptExploderPayload();
        return false;
      }
      const payloadTransferId = payload.transferId?.trim() ?? '';
      if (
        payloadTransferId.length > 0 &&
        appliedPromptExploderTransferIdsRef.current.has(payloadTransferId)
      ) {
        discardPendingCaseResolverPromptExploderPayload();
        setPromptExploderApplyDiagnostics({
          applyAttemptId: 'already_applied',
          transferId: payloadTransferId,
          payloadVersion:
            typeof payload.payloadVersion === 'number' && Number.isFinite(payload.payloadVersion)
              ? Math.trunc(payload.payloadVersion)
              : null,
          payloadChecksum: payload.checksum?.trim() || null,
          payloadStatus: payload.status?.trim() || null,
          payloadCreatedAt: payload.createdAt ?? null,
          payloadKey: pendingPromptExploderPayloadKey,
          requestedTargetFileId: payload.caseResolverContext?.fileId?.trim() || null,
          payloadContextFileId: payload.caseResolverContext?.fileId?.trim() || null,
          fallbackTargetFileId: null,
          precheckResolvedTargetFileId: null,
          precheckResolutionStrategy: 'unresolved',
          precheckWorkspaceFileCount: workspaceRef.current.files.length,
          mutationResolvedTargetFileId: null,
          mutationResolutionStrategy: 'unresolved',
          mutationWorkspaceFileCount: workspaceRef.current.files.length,
          resolvedTargetFileId: null,
          resolutionStrategy: 'unresolved',
          hasPartiesPayload: Boolean(payload.caseResolverParties),
          hasMetadataPayload: Boolean(payload.caseResolverMetadata?.placeDate),
          captureSettingsEnabled: caseResolverCaptureSettings.enabled,
          proposalBuilt: false,
          proposalReason: caseResolverCaptureSettings.enabled
            ? (
              payload.caseResolverParties || payload.caseResolverMetadata?.placeDate
                ? 'proposal_builder_returned_null'
                : 'no_capture_payload'
            )
            : 'capture_disabled',
          mutationMissingAfterPrecheck: false,
          status: 'applied',
          reason: 'duplicate_transfer_id',
          updatedAt: new Date().toISOString(),
        });
        refreshPendingPromptExploderPayload();
        toast('This Prompt Exploder transfer was already applied. Duplicate payload was discarded.', {
          variant: 'info',
        });
        return true;
      }
      const requestedContextFileId = requestedFileId?.trim() ?? '';
      const payloadContextFileId = payload.caseResolverContext?.fileId?.trim() ?? '';
      if (
        shouldOpenEditorFromQuery &&
        requestedContextFileId.length > 0 &&
        payloadContextFileId.length > 0 &&
        payloadContextFileId !== requestedContextFileId
      ) {
        logPromptExploderBindingGuardrailEvent({
          mode: 'manual',
          reason: 'document_mismatch',
          payload,
          requestedContextFileId,
          requestedSessionId: requestedPromptExploderSessionId,
        });
        toast(
          'Pending Prompt Exploder output belongs to a different document. Reopen Prompt Exploder from this document and apply again.',
          { variant: 'warning' }
        );
        transitionPromptExploderApplyDiagnostics({
          nextStatus: 'blocked',
          reason: 'document_mismatch',
        });
        return false;
      }
      const payloadSessionId = payload.caseResolverContext?.sessionId?.trim() ?? '';
      const hasPromptSessionMismatch =
        requestedPromptExploderSessionId.length > 0 &&
        payloadSessionId !== requestedPromptExploderSessionId;
      if (hasPromptSessionMismatch) {
        logPromptExploderBindingGuardrailEvent({
          mode: 'manual',
          reason: 'session_mismatch',
          payload,
          requestedContextFileId,
          requestedSessionId: requestedPromptExploderSessionId,
        });
        toast(
          'Pending Prompt Exploder output belongs to a different editing session. Reopen Prompt Exploder from this document and apply again.',
          { variant: 'warning' }
        );
        transitionPromptExploderApplyDiagnostics({
          nextStatus: 'blocked',
          reason: 'session_mismatch',
        });
        return false;
      }

      setIsApplyingPromptExploderPartyProposal(true);
      const runApply = (workspaceFilesSnapshot: CaseResolverWorkspace['files']) =>
        applyPendingPromptExploderPayloadToCaseResolver({
          payload,
          workspaceFiles: workspaceFilesSnapshot,
          updateWorkspace,
          setEditingDocumentDraft,
          filemakerDatabase,
          caseResolverCaptureSettings,
        });
      let result: ReturnType<typeof runApply>;
      try {
        result = runApply(workspaceRef.current.files);
      } finally {
        setIsApplyingPromptExploderPartyProposal(false);
      }

      refreshPendingPromptExploderPayload();
      setPromptExploderApplyDiagnostics({
        ...result.diagnostics,
        status: result.applied
          ? (result.proposalState ? 'capture_review' : 'applied')
          : 'failed',
        reason: result.applied
          ? (result.proposalState ? 'awaiting_capture_mapping' : null)
          : result.reason,
        updatedAt: new Date().toISOString(),
      });

      if (!result.applied) {
        if (result.reason === 'empty_prompt') {
          toast('Prompt Exploder output is empty. Reassemble text before applying.', {
            variant: 'warning',
          });
        } else if (result.reason === 'target_file_locked') {
          toast('Target document is locked. Unlock it in Case Resolver before applying output.', {
            variant: 'warning',
          });
        } else if (result.reason === 'missing_context_file_id') {
          toast('Prompt Exploder output is missing a target document context.', {
            variant: 'warning',
          });
        } else if (result.reason === 'target_missing_in_live_workspace_after_precheck') {
          toast(
            'Target document was resolved in precheck but is unavailable in the live workspace snapshot.',
            {
              variant: 'warning',
            }
          );
        } else if (
          result.reason === 'target_file_missing_precheck' ||
          result.reason === 'target_file_missing_mutation_snapshot'
        ) {
          toast('Cannot resolve target document for Prompt Exploder output.', {
            variant: 'warning',
          });
        } else {
          toast('No pending Prompt Exploder output to apply.', { variant: 'info' });
        }
        return false;
      }
      markPromptExploderTransferApplied(result.diagnostics.transferId);

      if (result.proposalState) {
        setPromptExploderPartyProposal(result.proposalState);
        setIsPromptExploderPartyProposalOpen(true);
      } else {
        setPromptExploderPartyProposal(null);
        setIsPromptExploderPartyProposalOpen(false);
        if (result.diagnostics.hasPartiesPayload || result.diagnostics.hasMetadataPayload) {
          if (!result.diagnostics.captureSettingsEnabled) {
            toast('Capture data exists, but Case Resolver Capture is disabled in settings.', {
              variant: 'warning',
            });
          } else {
            toast(
              `Capture data exists, but no mapping proposal was generated (${result.diagnostics.proposalReason}).`,
              {
                variant: 'warning',
              }
            );
          }
        } else {
          toast('Applied output has no captured addresser, addressee, or document date.', {
            variant: 'info',
          });
        }
      }

      if (result.workspaceChanged) {
        window.setTimeout((): void => {
          flushWorkspacePersist();
        }, 0);
        toast('Prompt Exploder output applied to the bound document.', {
          variant: 'success',
        });
      } else {
        toast('Prompt Exploder output already matches the bound document.', {
          variant: 'info',
        });
      }
      return true;
    },
    [
      caseResolverCaptureSettings,
      expiredPromptExploderPayload,
      filemakerDatabase,
      logPromptExploderBindingGuardrailEvent,
      markPromptExploderTransferApplied,
      pendingPromptExploderPayload,
      pendingPromptExploderPayloadKey,
      requestedFileId,
      requestedPromptExploderSessionId,
      refreshPendingPromptExploderPayload,
      shouldOpenEditorFromQuery,
      toast,
      transitionPromptExploderApplyDiagnostics,
      updateWorkspace,
      flushWorkspacePersist,
      workspaceRef,
    ]
  );

  useEffect(() => {
    if (!pendingPromptExploderPayloadKey) {
      autoAppliedPromptExploderPayloadKeysRef.current.clear();
      blockedPromptExploderGuardrailKeysRef.current.clear();
      return;
    }
    if (isApplyingPromptExploderPartyProposalRef.current) return;
    if (autoAppliedPromptExploderPayloadKeysRef.current.has(pendingPromptExploderPayloadKey)) {
      return;
    }
    const contextFileId = pendingPromptExploderPayload?.caseResolverContext?.fileId?.trim() || '';
    if (!contextFileId) return;
    const requestedContextFileId = requestedFileId?.trim() ?? '';
    if (
      shouldOpenEditorFromQuery &&
      requestedContextFileId.length > 0 &&
      contextFileId !== requestedContextFileId
    ) {
      transitionPromptExploderApplyDiagnostics({
        nextStatus: 'blocked',
        reason: 'document_mismatch',
      });
      const blockKey = `${pendingPromptExploderPayloadKey}:document_mismatch`;
      if (!blockedPromptExploderGuardrailKeysRef.current.has(blockKey)) {
        blockedPromptExploderGuardrailKeysRef.current.add(blockKey);
        if (pendingPromptExploderPayload) {
          logPromptExploderBindingGuardrailEvent({
            mode: 'auto',
            reason: 'document_mismatch',
            payload: pendingPromptExploderPayload,
            requestedContextFileId,
            requestedSessionId: requestedPromptExploderSessionId,
          });
        }
      }
      return;
    }
    const payloadSessionId =
      pendingPromptExploderPayload?.caseResolverContext?.sessionId?.trim() ?? '';
    const hasPromptSessionMismatch =
      requestedPromptExploderSessionId.length > 0 &&
      payloadSessionId !== requestedPromptExploderSessionId;
    if (hasPromptSessionMismatch) {
      transitionPromptExploderApplyDiagnostics({
        nextStatus: 'blocked',
        reason: 'session_mismatch',
      });
      const blockKey = `${pendingPromptExploderPayloadKey}:session_mismatch`;
      if (!blockedPromptExploderGuardrailKeysRef.current.has(blockKey)) {
        blockedPromptExploderGuardrailKeysRef.current.add(blockKey);
        if (pendingPromptExploderPayload) {
          logPromptExploderBindingGuardrailEvent({
            mode: 'auto',
            reason: 'session_mismatch',
            payload: pendingPromptExploderPayload,
            requestedContextFileId,
            requestedSessionId: requestedPromptExploderSessionId,
          });
        }
      }
      return;
    }
    const editingDraftFileId = editingDocumentDraft?.id?.trim() ?? '';
    const isContextBoundToCurrentDocument =
      (requestedContextFileId.length > 0 && requestedContextFileId === contextFileId) ||
      (editingDraftFileId.length > 0 && editingDraftFileId === contextFileId);
    const shouldDeferUntilEditorDraftOpens =
      shouldOpenEditorFromQuery &&
      editingDraftFileId.length === 0 &&
      requestedContextFileId.length > 0 &&
      requestedContextFileId === contextFileId;
    if (shouldDeferUntilEditorDraftOpens) return;
    if (!isContextBoundToCurrentDocument) return;
    const resolvedTargetFile = resolveCaseResolverFileById(workspaceRef.current.files, contextFileId);
    if (!resolvedTargetFile) return;

    autoAppliedPromptExploderPayloadKeysRef.current.add(pendingPromptExploderPayloadKey);
    void handleApplyPendingPromptExploderPayload();
  }, [
    editingDocumentDraft?.id,
    handleApplyPendingPromptExploderPayload,
    logPromptExploderBindingGuardrailEvent,
    pendingPromptExploderPayload,
    pendingPromptExploderPayloadKey,
    requestedFileId,
    requestedPromptExploderSessionId,
    shouldOpenEditorFromQuery,
    transitionPromptExploderApplyDiagnostics,
    workspaceFileIdsSignature,
  ]);

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

  const handleSelectFile = useCallback((
    fileId: string,
    options?: { preserveSelectedAsset?: boolean }
  ): void => {
    const hasActiveNodeFileAsset = Boolean(
      selectedAssetId &&
      workspace.assets.some(
        (asset: CaseResolverAssetFile): boolean => asset.id === selectedAssetId && asset.kind === 'node_file'
      )
    );
    const shouldPreserveSelectedAsset = hasActiveNodeFileAsset || Boolean(
      options?.preserveSelectedAsset && hasActiveNodeFileAsset
    );

    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      setSelectedFolderPath(null);
      if (!shouldPreserveSelectedAsset) {
        setSelectedAssetId(null);
      }
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
    if (!shouldPreserveSelectedAsset) {
      setSelectedAssetId(null);
    }
  }, [selectedAssetId, selectedFileId, workspace.assets]);

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
    },
    [defaultCaseIdentifierId, defaultCategoryId, defaultTagId, updateWorkspace]
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
        const refreshedWorkspace = await fetchCaseResolverWorkspaceSnapshot('case_view');
        if (isCancelled) return;
        if (refreshedWorkspace) {
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
    const recoveredDraft = readStoredEditorDraft(fileId);
    const hasRecoverableStoredDraftPayload =
      !target.isLocked &&
      recoveredDraft !== null &&
      recoveredDraft.baseDocumentContentVersion === baseDraft.baseDocumentContentVersion;
    const recoveredMergedDraft: CaseResolverFileEditDraft | null = hasRecoverableStoredDraftPayload
      ? {
        ...baseDraft,
        ...recoveredDraft.draft,
        documentHistory: baseDraft.documentHistory ?? [],
      }
      : null;
    const canRecoverStoredDraft =
      recoveredMergedDraft !== null &&
      hasCaseResolverDraftMeaningfulChanges({
        draft: recoveredMergedDraft,
        file: target,
        canonicalState: buildCaseResolverDraftCanonicalState(recoveredMergedDraft),
      });
    const mergedDraft: CaseResolverFileEditDraft = canRecoverStoredDraft
      ? recoveredMergedDraft
      : {
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
    if (canRecoverStoredDraft) {
      toast('Recovered unsaved draft from local storage.', { variant: 'info' });
    } else if (hasRecoverableStoredDraftPayload || recoveredDraft) {
      clearStoredEditorDraft(fileId);
    }
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

    if (!hasMeaningfulChanges) {
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
    const nextDocumentHistory = hasContentChanges
      ? [
        {
          id: createId('case-doc-history'),
          savedAt: now,
          documentContentVersion: currentFile.documentContentVersion,
          activeDocumentVersion: currentFile.activeDocumentVersion,
          editorType: currentFile.editorType,
          documentContent: currentFile.documentContent,
          documentContentMarkdown: currentFile.documentContentMarkdown,
          documentContentHtml: currentFile.documentContentHtml,
          documentContentPlainText: currentFile.documentContentPlainText,
        },
        ...currentFile.documentHistory,
      ].slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT)
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

  useEffect(() => {
    if (!editingDocumentDraft) return;
    const timer = window.setTimeout(() => {
      const writeResult = writeStoredEditorDraft(editingDocumentDraft.id, editingDocumentDraft);
      if (writeResult.ok) {
        draftStorageWarningShownRef.current = false;
        return;
      }
      if (writeResult.reason !== 'quota' || draftStorageWarningShownRef.current) {
        return;
      }
      draftStorageWarningShownRef.current = true;
      toast(
        'Browser storage is full, so local draft recovery is limited. Save manually to keep changes.',
        { variant: 'warning' }
      );
    }, 250);
    return (): void => window.clearTimeout(timer);
  }, [editingDocumentDraft, toast]);

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

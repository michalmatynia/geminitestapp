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
import { useCountries } from '@/features/internationalization/hooks/useInternationalizationQueries';
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
import { useToast } from '@/shared/ui';

import {
  CASE_RESOLVER_DEFAULT_DOCUMENT_FORMAT_KEY,
  CASE_RESOLVER_CATEGORIES_KEY,
  CASE_RESOLVER_IDENTIFIERS_KEY,
  CASE_RESOLVER_SETTINGS_KEY,
  CASE_RESOLVER_TAGS_KEY,
  CASE_RESOLVER_WORKSPACE_KEY,
  getCaseResolverWorkspaceNormalizationDiagnostics,
  hasCaseResolverWorkspaceFilesArray,
  parseCaseResolverCategories,
  parseCaseResolverDefaultDocumentFormat,
  parseCaseResolverIdentifiers,
  parseCaseResolverSettings,
  parseCaseResolverTags,
  normalizeCaseResolverWorkspace,
  parseCaseResolverWorkspace,
} from '../settings';
import {
  type CaseResolverFileEditDraft,
  type CaseResolverRequestedCaseIssue,
  type CaseResolverRequestedCaseStatus,
  type CaseResolverStateValue,
} from '../types';
import { useCaseResolverStateFolderActions } from './useCaseResolverState.folder-actions';
import {
  createCaseResolverWorkspaceMutationId,
  fetchCaseResolverWorkspaceSnapshot,
  getCaseResolverWorkspaceRevision,
  logCaseResolverWorkspaceEvent,
  stampCaseResolverWorkspaceMutation,
} from '../workspace-persistence';
import { useCaseResolverStateAssetActions } from './useCaseResolverState.asset-actions';
import {
  collectCaseScopeIds,
  serializeWorkspaceForUnsavedChangesCheck,
} from './useCaseResolverState.helpers';
import {
  buildRequestedContextRequestKey,
  hasRequestedCaseFile,
  hasValidRequestedContextInFlight,
  resolveRequestedCaseIssueAfterRefresh,
  shouldStartRequestedContextFetch,
} from './useCaseResolverState.helpers.requested-context';
import { useCaseResolverStateSelectionActions } from './useCaseResolverState.selection-actions';
import { useCaseResolverPersistence, type UseCaseResolverPersistenceValue } from './useCaseResolverState.persistence-actions';
import { useCaseResolverPromptExploder, type UseCaseResolverPromptExploderValue } from './useCaseResolverState.prompt-exploder-actions';
import { useCaseResolverStateEditorActions } from './useCaseResolverState.editor-actions';
import { useCaseResolverStateRelatedFilesActions } from './useCaseResolverState.related-files-actions';
import { useCaseResolverStateCreationActions } from './useCaseResolverState.creation-actions';
import { useCaseResolverStateViewState } from './useCaseResolverState.view-state';
import { resolveCaseResolverTreeWorkspace } from '../components/case-resolver-tree-workspace';

const CASE_RESOLVER_TREE_SAVE_TOAST = 'Case Resolver tree changes saved.';
const CASE_RESOLVER_REQUESTED_CONTEXT_LOADING_WATCHDOG_MS = 10_000;

type RequestedContextInFlightState = {
  requestKey: string;
  requestedFileId: string;
  startedAtMs: number;
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
  const [requestedCaseStatus, setRequestedCaseStatus] =
    useState<CaseResolverRequestedCaseStatus>(requestedFileId ? 'loading' : 'ready');
  const [requestedCaseIssue, setRequestedCaseIssue] =
    useState<CaseResolverRequestedCaseIssue | null>(null);
  const [requestedContextRetryTick, setRequestedContextRetryTick] = useState(0);
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
  const requestedWorkspaceRefreshFileIdRef = useRef<string | null>(null);
  const requestedWorkspaceMissingFileIdRef = useRef<string | null>(null);
  const requestedCaseStatusRef = useRef<CaseResolverRequestedCaseStatus>(
    requestedFileId ? 'loading' : 'ready'
  );
  const requestedCaseIssueRef = useRef<CaseResolverRequestedCaseIssue | null>(null);
  const requestedContextInFlightRef = useRef<RequestedContextInFlightState | null>(null);
  const requestedContextAttemptKeyRef = useRef<string | null>(null);
  const requestedContextStartedAtRef = useRef<number | null>(null);
  const unresolvedOwnershipWarningShownRef = useRef(false);
  const lastLoggedOwnershipDiagnosticsSignatureRef = useRef<string>('');
  const lastLoggedRequestedContextSignatureRef = useRef<string>('');

  const setRequestedCaseStatusSafe = useCallback(
    (nextStatus: CaseResolverRequestedCaseStatus): void => {
      if (requestedCaseStatusRef.current === nextStatus) return;
      requestedCaseStatusRef.current = nextStatus;
      setRequestedCaseStatus(nextStatus);
    },
    []
  );

  const setRequestedCaseIssueSafe = useCallback(
    (nextIssue: CaseResolverRequestedCaseIssue | null): void => {
      if (requestedCaseIssueRef.current === nextIssue) return;
      requestedCaseIssueRef.current = nextIssue;
      setRequestedCaseIssue(nextIssue);
    },
    [],
  );

  const logRequestedContextTransition = useCallback(
    (
      action: string,
      input?: {
        message?: string;
        requestKey?: string | null;
        resolvedVia?: 'workspace_presence' | 'snapshot_fetch' | 'watchdog' | 'manual' | 'none';
      },
    ): void => {
      const message = input?.message;
      const requestKey = input?.requestKey ?? null;
      const resolvedVia = input?.resolvedVia ?? 'none';
      const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
      const signature = [
        action,
        normalizedRequestedFileId,
        requestedCaseStatusRef.current,
        requestedCaseIssueRef.current ?? 'none',
        requestKey ?? 'none',
        resolvedVia,
        requestedContextInFlightRef.current?.requestKey ?? 'none',
        requestedContextAttemptKeyRef.current ?? 'none',
        message ?? '',
      ].join('|');
      if (lastLoggedRequestedContextSignatureRef.current === signature) return;
      lastLoggedRequestedContextSignatureRef.current = signature;
      logCaseResolverWorkspaceEvent({
        source: 'case_view',
        action,
        message: [
          normalizedRequestedFileId
            ? `requested_file_id=${normalizedRequestedFileId}`
            : 'requested_file_id=<none>',
          `request_key=${requestKey ?? 'none'}`,
          `in_flight=${requestedContextInFlightRef.current?.requestKey ?? 'none'}`,
          `attempted_key=${requestedContextAttemptKeyRef.current ?? 'none'}`,
          `resolved_via=${resolvedVia}`,
          `requested_case_status=${requestedCaseStatusRef.current}`,
          `requested_case_issue=${requestedCaseIssueRef.current ?? 'none'}`,
          message ?? '',
        ].filter(Boolean).join(' '),
      });
    },
    [requestedFileId],
  );

  const persistence: UseCaseResolverPersistenceValue = useCaseResolverPersistence({
    initialWorkspaceState,
    settingsStoreRef,
    toast,
    setPersistedWorkspaceSnapshot,
    setPersistedWorkspaceComparableSnapshot,
  });
  const syncPersistedWorkspaceTracking = persistence.syncPersistedWorkspaceTracking;
  const queuedSerializedWorkspaceRef = persistence.queuedSerializedWorkspaceRef;
  const queuedExpectedRevisionRef = persistence.queuedExpectedRevisionRef;
  const queuedMutationIdRef = persistence.queuedMutationIdRef;
  const clearConflictRetryTimer = persistence.clearConflictRetryTimer;
  const persistWorkspaceTimerRef = persistence.persistWorkspaceTimerRef;
  const isWorkspaceSaving = persistence.isWorkspaceSaving;
  const setWorkspaceSaveStatus = persistence.setWorkspaceSaveStatus;
  const setWorkspaceSaveError = persistence.setWorkspaceSaveError;
  const isMountedRef = useRef(true);

  const viewState = useCaseResolverStateViewState({
    workspace,
    setWorkspace,
    requestedFileId,
    requestedCaseStatus,
    initialWorkspaceState,
    syncPersistedWorkspaceTracking: persistence.syncPersistedWorkspaceTracking,
    queuedSerializedWorkspaceRef: persistence.queuedSerializedWorkspaceRef,
    queuedExpectedRevisionRef: persistence.queuedExpectedRevisionRef,
    queuedMutationIdRef: persistence.queuedMutationIdRef,
    handledRequestedFileIdRef,
    requestedWorkspaceRefreshFileIdRef,
    requestedWorkspaceMissingFileIdRef,
  });
  const {
    setSelectedFileId,
    setSelectedAssetId,
    setSelectedFolderPath,
  } = viewState;

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
            persistence.queuedExpectedRevisionRef.current ?? persistence.lastPersistedRevisionRef.current,
          workspaceRevision: getCaseResolverWorkspaceRevision(stampedWorkspace),
        });
        if (options?.persistToast) persistence.pendingSaveToastRef.current = options.persistToast;
        if (persistence.queuedExpectedRevisionRef.current === null) {
          persistence.queuedExpectedRevisionRef.current = persistence.lastPersistedRevisionRef.current;
        }
        persistence.queuedMutationIdRef.current = mutationId;
        persistence.queuedSerializedWorkspaceRef.current = JSON.stringify(stampedWorkspace);
        return stampedWorkspace;
      });
      if (options?.persistToast || options?.persistNow) {
        window.setTimeout((): void => {
          persistence.flushWorkspacePersist();
        }, 0);
      }
    },
    [persistence, setWorkspace]
  );

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
    requestedCaseStatusRef.current = requestedCaseStatus;
  }, [requestedCaseStatus]);

  useEffect(() => {
    requestedCaseIssueRef.current = requestedCaseIssue;
  }, [requestedCaseIssue]);

  useEffect(() => {
    return (): void => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    if (canHydrateWorkspaceFromStore) return;
    void (async (): Promise<void> => {
      const snapshot = await fetchCaseResolverWorkspaceSnapshot('case_view_bootstrap');
      if (!snapshot || !isMountedRef.current) return;
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
  }, [
    canHydrateWorkspaceFromStore,
    queuedExpectedRevisionRef,
    queuedMutationIdRef,
    queuedSerializedWorkspaceRef,
    settingsStoreRef,
    syncPersistedWorkspaceTracking,
  ]);

  // Sync with store
  useEffect(() => {
    if (!canHydrateWorkspaceFromStore) return;
    if (promptExploder.isApplyingPromptExploderPartyProposal) return;
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
    promptExploder.isApplyingPromptExploderPartyProposal,
    parsedWorkspace,
    queuedExpectedRevisionRef,
    queuedMutationIdRef,
    queuedSerializedWorkspaceRef,
    requestedFileId,
    syncPersistedWorkspaceTracking,
  ]);

  useEffect(() => {
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) {
      requestedWorkspaceRefreshFileIdRef.current = null;
      requestedWorkspaceMissingFileIdRef.current = null;
      requestedContextInFlightRef.current = null;
      requestedContextAttemptKeyRef.current = null;
      requestedContextStartedAtRef.current = null;
      handledRequestedFileIdRef.current = null;
      setRequestedCaseIssueSafe(null);
      setRequestedCaseStatusSafe('ready');
      logRequestedContextTransition('requested_context_ready', {
        message: 'No requested file in query.',
        resolvedVia: 'none',
      });
      return;
    }

    const hasRequestedFileInWorkspace = hasRequestedCaseFile(
      workspace.files,
      normalizedRequestedFileId,
    );
    if (!hasRequestedFileInWorkspace) return;

    requestedWorkspaceRefreshFileIdRef.current = null;
    requestedWorkspaceMissingFileIdRef.current = null;
    requestedContextInFlightRef.current = null;
    requestedContextAttemptKeyRef.current = null;
    requestedContextStartedAtRef.current = null;
    handledRequestedFileIdRef.current = null;
    setRequestedCaseIssueSafe(null);
    setRequestedCaseStatusSafe('ready');
    logRequestedContextTransition('requested_context_ready', {
      message: 'Requested file resolved in workspace.',
      resolvedVia: 'workspace_presence',
    });
  }, [
    logRequestedContextTransition,
    requestedFileId,
    setRequestedCaseIssueSafe,
    setRequestedCaseStatusSafe,
    workspace.files,
  ]);

  useEffect(() => {
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) return;
    if (hasRequestedCaseFile(workspaceRef.current.files, normalizedRequestedFileId)) return;

    const requestKey = buildRequestedContextRequestKey(
      normalizedRequestedFileId,
      requestedContextRetryTick,
    );
    const shouldStartFetch = shouldStartRequestedContextFetch({
      currentRequestKey: requestKey,
      attemptedRequestKey: requestedContextAttemptKeyRef.current,
      inFlightRequestKey: requestedContextInFlightRef.current?.requestKey ?? null,
      currentStatus: requestedCaseStatusRef.current,
    });
    if (!shouldStartFetch) {
      return;
    }

    const startedAtMs = Date.now();
    requestedContextAttemptKeyRef.current = requestKey;
    requestedContextInFlightRef.current = {
      requestKey,
      requestedFileId: normalizedRequestedFileId,
      startedAtMs,
    };
    requestedContextStartedAtRef.current = startedAtMs;
    requestedWorkspaceRefreshFileIdRef.current = normalizedRequestedFileId;
    requestedWorkspaceMissingFileIdRef.current = null;
    handledRequestedFileIdRef.current = null;
    setRequestedCaseIssueSafe(null);
    setRequestedCaseStatusSafe('loading');
    logRequestedContextTransition('requested_context_loading', {
      message: 'Refreshing workspace for requested file.',
      requestKey,
      resolvedVia: 'snapshot_fetch',
    });

    void (async (): Promise<void> => {
      const refreshedWorkspace = await fetchCaseResolverWorkspaceSnapshot(
        'case_view_requested_context_resolve',
      );
      if (!isMountedRef.current) return;
      const currentInFlight = requestedContextInFlightRef.current;
      if (currentInFlight?.requestKey !== requestKey) return;

      requestedContextInFlightRef.current = null;
      requestedContextStartedAtRef.current = null;

      const latestRequestedFileId = requestedFileId?.trim() ?? '';
      if (!latestRequestedFileId || latestRequestedFileId !== normalizedRequestedFileId) return;

      if (!refreshedWorkspace) {
        const requestedIssueAfterRefresh = resolveRequestedCaseIssueAfterRefresh({
          refreshSucceeded: false,
          hasRequestedFileAfterRefresh: false,
        });
        requestedWorkspaceMissingFileIdRef.current = normalizedRequestedFileId;
        requestedWorkspaceRefreshFileIdRef.current = null;
        handledRequestedFileIdRef.current = null;
        setRequestedCaseIssueSafe(requestedIssueAfterRefresh);
        setRequestedCaseStatusSafe('missing');
        logRequestedContextTransition('requested_context_missing_fetch_failed', {
          message: 'Workspace refresh failed while resolving requested file.',
          requestKey,
          resolvedVia: 'snapshot_fetch',
        });
        return;
      }

      const refreshedHasRequestedFile = hasRequestedCaseFile(
        refreshedWorkspace.files,
        normalizedRequestedFileId,
      );
      const requestedIssueAfterRefresh = resolveRequestedCaseIssueAfterRefresh({
        refreshSucceeded: true,
        hasRequestedFileAfterRefresh: refreshedHasRequestedFile,
      });

      if (requestedIssueAfterRefresh === null) {
        setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
          const currentRevision = getCaseResolverWorkspaceRevision(current);
          const incomingRevision = getCaseResolverWorkspaceRevision(refreshedWorkspace);
          const currentHasRequestedFile = hasRequestedCaseFile(
            current.files,
            normalizedRequestedFileId,
          );
          if (incomingRevision <= currentRevision && currentHasRequestedFile) {
            return current;
          }
          syncPersistedWorkspaceTracking(refreshedWorkspace);
          queuedSerializedWorkspaceRef.current = null;
          queuedExpectedRevisionRef.current = null;
          queuedMutationIdRef.current = null;
          return refreshedWorkspace;
        });
        settingsStoreRef.current.refetch();
        requestedWorkspaceRefreshFileIdRef.current = null;
        requestedWorkspaceMissingFileIdRef.current = null;
        handledRequestedFileIdRef.current = null;
        setRequestedCaseIssueSafe(null);
        setRequestedCaseStatusSafe('ready');
        logRequestedContextTransition('requested_context_ready', {
          message: 'Requested file resolved after workspace refresh.',
          requestKey,
          resolvedVia: 'snapshot_fetch',
        });
        return;
      }

      requestedWorkspaceMissingFileIdRef.current = normalizedRequestedFileId;
      requestedWorkspaceRefreshFileIdRef.current = null;
      handledRequestedFileIdRef.current = null;
      setRequestedCaseIssueSafe(requestedIssueAfterRefresh);
      setRequestedCaseStatusSafe('missing');
      logRequestedContextTransition('requested_context_missing_not_found', {
        message: 'Requested file not found after workspace refresh.',
        requestKey,
        resolvedVia: 'snapshot_fetch',
      });
    })();
  }, [
    logRequestedContextTransition,
    queuedExpectedRevisionRef,
    queuedMutationIdRef,
    queuedSerializedWorkspaceRef,
    requestedContextRetryTick,
    requestedFileId,
    setRequestedCaseIssueSafe,
    setRequestedCaseStatusSafe,
    syncPersistedWorkspaceTracking,
  ]);

  useEffect(() => {
    if (requestedCaseStatus !== 'loading') return;
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) return;
    const requestKey = buildRequestedContextRequestKey(
      normalizedRequestedFileId,
      requestedContextRetryTick,
    );

    const watchdogTimer = window.setInterval((): void => {
      const currentStatus = requestedCaseStatusRef.current;
      if (currentStatus !== 'loading') return;
      const hasValidInFlightRequest = hasValidRequestedContextInFlight({
        currentRequestKey: requestKey,
        inFlightRequestKey: requestedContextInFlightRef.current?.requestKey ?? null,
        startedAtMs: requestedContextStartedAtRef.current,
        nowMs: Date.now(),
        watchdogMs: CASE_RESOLVER_REQUESTED_CONTEXT_LOADING_WATCHDOG_MS,
      });
      if (hasValidInFlightRequest) return;

      requestedContextInFlightRef.current = null;
      requestedContextStartedAtRef.current = null;
      requestedWorkspaceRefreshFileIdRef.current = null;
      requestedWorkspaceMissingFileIdRef.current = normalizedRequestedFileId;
      handledRequestedFileIdRef.current = null;
      setRequestedCaseIssueSafe('workspace_unavailable');
      setRequestedCaseStatusSafe('missing');
      logRequestedContextTransition('requested_context_missing_fetch_failed', {
        message: 'Loading watchdog forced missing state after stalled context load.',
        requestKey,
        resolvedVia: 'watchdog',
      });
    }, 500);

    return (): void => {
      window.clearInterval(watchdogTimer);
    };
  }, [
    logRequestedContextTransition,
    requestedCaseStatus,
    requestedContextRetryTick,
    requestedFileId,
    setRequestedCaseIssueSafe,
    setRequestedCaseStatusSafe,
  ]);

  useEffect(() => {
    if (requestedCaseStatus !== 'loading') return;
    const deadlockGuardTimer = window.setTimeout((): void => {
      if (requestedCaseStatusRef.current !== 'loading') return;
      const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
      if (!normalizedRequestedFileId) {
        requestedWorkspaceRefreshFileIdRef.current = null;
        requestedWorkspaceMissingFileIdRef.current = null;
        requestedContextInFlightRef.current = null;
        requestedContextAttemptKeyRef.current = null;
        requestedContextStartedAtRef.current = null;
        handledRequestedFileIdRef.current = null;
        setRequestedCaseIssueSafe(null);
        setRequestedCaseStatusSafe('ready');
        logRequestedContextTransition('requested_context_ready', {
          message: 'Deadlock guard resolved loading state with no requested file.',
          resolvedVia: 'watchdog',
        });
        return;
      }
      if (hasRequestedCaseFile(workspaceRef.current.files, normalizedRequestedFileId)) {
        requestedWorkspaceRefreshFileIdRef.current = null;
        requestedWorkspaceMissingFileIdRef.current = null;
        requestedContextInFlightRef.current = null;
        requestedContextAttemptKeyRef.current = null;
        requestedContextStartedAtRef.current = null;
        handledRequestedFileIdRef.current = null;
        setRequestedCaseIssueSafe(null);
        setRequestedCaseStatusSafe('ready');
        logRequestedContextTransition('requested_context_ready', {
          message: 'Deadlock guard resolved loading state from workspace presence.',
          resolvedVia: 'watchdog',
        });
        return;
      }
      if (requestedContextInFlightRef.current !== null) return;
      requestedWorkspaceRefreshFileIdRef.current = null;
      requestedWorkspaceMissingFileIdRef.current = normalizedRequestedFileId;
      requestedContextStartedAtRef.current = null;
      handledRequestedFileIdRef.current = null;
      setRequestedCaseIssueSafe('workspace_unavailable');
      setRequestedCaseStatusSafe('missing');
      logRequestedContextTransition('requested_context_missing_fetch_failed', {
        message: 'Deadlock guard forced missing state (loading without in-flight request).',
        requestKey: requestedContextAttemptKeyRef.current,
        resolvedVia: 'watchdog',
      });
    }, 1500);

    return (): void => {
      window.clearTimeout(deadlockGuardTimer);
    };
  }, [
    logRequestedContextTransition,
    requestedCaseStatus,
    requestedFileId,
    setRequestedCaseIssueSafe,
    setRequestedCaseStatusSafe,
  ]);

  useEffect(() => {
    return (): void => {
      clearConflictRetryTimer();
      if (persistWorkspaceTimerRef.current) {
        window.clearTimeout(persistWorkspaceTimerRef.current);
        persistWorkspaceTimerRef.current = null;
      }
    };
  }, [clearConflictRetryTimer, persistWorkspaceTimerRef]);

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
  }, [isWorkspaceDirty, isWorkspaceSaving, setWorkspaceSaveError, setWorkspaceSaveStatus]);

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

  const handleRetryCaseContext = useCallback((): void => {
    const normalizedRequestedFileId = requestedFileId?.trim() ?? '';
    if (!normalizedRequestedFileId) {
      setRequestedCaseIssueSafe(null);
      setRequestedCaseStatusSafe('ready');
      return;
    }
    const nextRetryTick = requestedContextRetryTick + 1;
    const nextRequestKey = buildRequestedContextRequestKey(
      normalizedRequestedFileId,
      nextRetryTick,
    );
    requestedContextInFlightRef.current = null;
    requestedContextAttemptKeyRef.current = null;
    requestedContextStartedAtRef.current = null;
    requestedWorkspaceMissingFileIdRef.current = null;
    requestedWorkspaceRefreshFileIdRef.current = normalizedRequestedFileId;
    handledRequestedFileIdRef.current = null;
    setRequestedCaseIssueSafe(null);
    setRequestedCaseStatusSafe('loading');
    setRequestedContextRetryTick(nextRetryTick);
    logRequestedContextTransition('requested_context_loading', {
      message: 'Manual retry requested.',
      requestKey: nextRequestKey,
      resolvedVia: 'manual',
    });
  }, [
    logRequestedContextTransition,
    requestedFileId,
    requestedContextRetryTick,
    setRequestedCaseIssueSafe,
    setRequestedCaseStatusSafe,
  ]);

  const handleResetCaseContext = useCallback((): void => {
    requestedWorkspaceRefreshFileIdRef.current = null;
    requestedWorkspaceMissingFileIdRef.current = null;
    requestedContextInFlightRef.current = null;
    requestedContextAttemptKeyRef.current = null;
    requestedContextStartedAtRef.current = null;
    handledRequestedFileIdRef.current = null;
    setRequestedCaseIssueSafe(null);
    setRequestedCaseStatusSafe('loading');
    setRequestedContextRetryTick((prev) => prev + 1);
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
    logRequestedContextTransition('requested_context_reset', {
      message: 'Case context reset requested.',
      resolvedVia: 'manual',
    });
  }, [
    logRequestedContextTransition,
    setWorkspace,
    setSelectedAssetId,
    setSelectedFileId,
    setSelectedFolderPath,
    setRequestedCaseIssueSafe,
    setRequestedCaseStatusSafe,
  ]);

  const selectedCaseScopeIds = useMemo(
    (): Set<string> | null => collectCaseScopeIds(workspace.files, viewState.activeCaseId),
    [viewState.activeCaseId, workspace.files]
  );
  const workspaceNormalizationDiagnostics = useMemo(
    () => getCaseResolverWorkspaceNormalizationDiagnostics(workspace),
    [workspace],
  );
  const unresolvedOwnershipInActiveScopeCount = useMemo((): number => {
    if (!viewState.activeCaseId) return 0;
    const scopedWorkspace = resolveCaseResolverTreeWorkspace({
      selectedFileId: viewState.activeCaseId,
      requestedFileId: null,
      workspace,
      includeDescendantCaseScope: true,
    });
    return scopedWorkspace.files.filter(
      (file: CaseResolverFile): boolean =>
        file.fileType !== 'case' && !file.parentCaseId,
    ).length;
  }, [viewState.activeCaseId, workspace]);

  useEffect((): void => {
    const diagnosticsSignature = [
      getCaseResolverWorkspaceRevision(workspace),
      workspaceNormalizationDiagnostics.ownershipRepairedCount,
      workspaceNormalizationDiagnostics.ownershipUnresolvedCount,
      workspaceNormalizationDiagnostics.droppedDuplicateCount,
    ].join(':');
    if (lastLoggedOwnershipDiagnosticsSignatureRef.current === diagnosticsSignature) return;
    lastLoggedOwnershipDiagnosticsSignatureRef.current = diagnosticsSignature;
    logCaseResolverWorkspaceEvent({
      source: 'case_view',
      action: 'ownership_normalization_state',
      workspaceRevision: getCaseResolverWorkspaceRevision(workspace),
      message: [
        `ownership_repaired_count=${workspaceNormalizationDiagnostics.ownershipRepairedCount}`,
        `ownership_unresolved_count=${workspaceNormalizationDiagnostics.ownershipUnresolvedCount}`,
        `dropped_duplicate_count=${workspaceNormalizationDiagnostics.droppedDuplicateCount}`,
      ].join(' '),
    });
  }, [workspace, workspaceNormalizationDiagnostics]);

  useEffect((): void => {
    if (unresolvedOwnershipInActiveScopeCount <= 0) return;
    if (unresolvedOwnershipWarningShownRef.current) return;
    unresolvedOwnershipWarningShownRef.current = true;
    toast('Some documents have unresolved ownership and appear under Unassigned.', {
      variant: 'warning',
    });
  }, [toast, unresolvedOwnershipInActiveScopeCount]);

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

  useEffect(() => {
    if (requestedFileId) return;
    handledRequestedFileIdRef.current = null;
    requestedWorkspaceRefreshFileIdRef.current = null;
    requestedWorkspaceMissingFileIdRef.current = null;
    requestedContextInFlightRef.current = null;
    requestedContextAttemptKeyRef.current = null;
    requestedContextStartedAtRef.current = null;
    setRequestedCaseIssueSafe(null);
    setRequestedCaseStatusSafe('ready');
  }, [requestedFileId, setRequestedCaseIssueSafe, setRequestedCaseStatusSafe]);

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
    workspace,
    workspaceRef,
    setWorkspace,
    updateWorkspace,
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
    shouldOpenEditorFromQuery,
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

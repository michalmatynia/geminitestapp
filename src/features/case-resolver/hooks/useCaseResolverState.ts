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
import { useSettings } from '@/shared/hooks/use-settings';
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
  fromCaseResolverCaseNodeId,
  fromCaseResolverFileNodeId,
} from '../master-tree';
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
  shouldAdoptIncomingWorkspace,
  resolvePreferredCaseResolverWorkspace,
} from './useCaseResolverState.helpers.hydration';
import {
  buildRequestedContextRequestKey,
  hasRequestedCaseFile,
  hasValidRequestedContextInFlight,
  resolveRequestedCaseIssueAfterRefresh,
  shouldQueueRequestedContextAutoClear,
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
import { buildCaseResolverRuntimeIndexes } from '../runtime';

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
  const [requestedCaseStatus, setRequestedCaseStatus] =
    useState<CaseResolverRequestedCaseStatus>(requestedFileId ? 'loading' : 'ready');
  const [requestedCaseIssue, setRequestedCaseIssue] =
    useState<CaseResolverRequestedCaseIssue | null>(null);
  const [requestedContextRetryTick, setRequestedContextRetryTick] = useState(0);
  const [bootstrapRefreshRetryTick, setBootstrapRefreshRetryTick] = useState(0);
  const [requestedContextAutoClearRequestKey, setRequestedContextAutoClearRequestKey] =
    useState<string | null>(null);
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
  const requestedContextAutoClearRequestKeyRef = useRef<string | null>(null);
  const requestedContextLastQueuedAutoClearKeyRef = useRef<string | null>(null);
  const bootstrapRefreshRetryAttemptRef = useRef(0);
  const bootstrapRefreshRetryTimerRef = useRef<number | null>(null);
  const unresolvedOwnershipWarningShownRef = useRef(false);
  const lastLoggedOwnershipDiagnosticsSignatureRef = useRef<string>('');
  const lastLoggedRequestedContextSignatureRef = useRef<string>('');
  const lastWorkspaceSourceSelectionSignatureRef = useRef<string>('');

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
        resolvedVia?:
          | 'workspace_presence'
          | 'snapshot_fetch'
          | 'watchdog'
          | 'manual'
          | 'auto_clear'
          | 'none';
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

  const queueRequestedContextAutoClear = useCallback(
    ({
      requestKey,
      issue,
      message,
    }: {
      requestKey: string | null;
      issue: CaseResolverRequestedCaseIssue | null;
      message: string;
    }): void => {
      const normalizedRequestKey = requestKey?.trim() ?? '';
      if (issue === 'workspace_unavailable') {
        logRequestedContextTransition('requested_context_auto_clear_suppressed_unavailable', {
          message: `${message} reason_tag=auto_clear_suppressed_unavailable`,
          requestKey: normalizedRequestKey || requestedContextAttemptKeyRef.current,
          resolvedVia: 'none',
        });
        return;
      }
      if (
        !shouldQueueRequestedContextAutoClear({
          requestedFileId,
          requestedCaseStatus: 'missing',
          requestedCaseIssue: issue,
          requestKey: normalizedRequestKey,
          lastQueuedRequestKey: requestedContextLastQueuedAutoClearKeyRef.current,
        })
      ) {
        return;
      }
      requestedContextLastQueuedAutoClearKeyRef.current = normalizedRequestKey;
      requestedContextAutoClearRequestKeyRef.current = normalizedRequestKey;
      setRequestedContextAutoClearRequestKey(normalizedRequestKey);
      logRequestedContextTransition('requested_context_auto_cleared', {
        message,
        requestKey: normalizedRequestKey,
        resolvedVia: 'auto_clear',
      });
    },
    [logRequestedContextTransition, requestedFileId],
  );

  const handleAcknowledgeRequestedContextAutoClear = useCallback(
    (requestKey: string | null): void => {
      const normalizedRequestKey =
        requestKey?.trim() ??
        requestedContextAutoClearRequestKeyRef.current?.trim() ??
        '';
      if (!normalizedRequestKey) return;
      requestedContextLastQueuedAutoClearKeyRef.current = normalizedRequestKey;
      if (requestedContextAutoClearRequestKeyRef.current === normalizedRequestKey) {
        requestedContextAutoClearRequestKeyRef.current = null;
      }
      setRequestedContextAutoClearRequestKey((current: string | null): string | null =>
        current === normalizedRequestKey ? null : current,
      );
    },
    [],
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

  useEffect((): void => {
    const selectionSignature = [
      preferredWorkspaceSelection.source,
      preferredWorkspaceSelection.reason,
      hasWorkspaceFromStore ? 'store:1' : 'store:0',
      hasWorkspaceFromHeavyScope ? 'heavy:1' : 'heavy:0',
      getCaseResolverWorkspaceRevision(parsedWorkspace),
    ].join('|');
    if (lastWorkspaceSourceSelectionSignatureRef.current === selectionSignature) return;
    lastWorkspaceSourceSelectionSignatureRef.current = selectionSignature;
    logCaseResolverWorkspaceEvent({
      source: 'case_view',
      action: 'hydrate_workspace_source_selected',
      workspaceRevision: getCaseResolverWorkspaceRevision(parsedWorkspace),
      message: [
        `source=${preferredWorkspaceSelection.source}`,
        `reason=${preferredWorkspaceSelection.reason}`,
        `has_store=${hasWorkspaceFromStore ? 'true' : 'false'}`,
        `has_heavy=${hasWorkspaceFromHeavyScope ? 'true' : 'false'}`,
      ].join(' '),
    });
  }, [
    hasWorkspaceFromHeavyScope,
    hasWorkspaceFromStore,
    parsedWorkspace,
    preferredWorkspaceSelection.reason,
    preferredWorkspaceSelection.source,
  ]);

  useEffect(() => {
    const workspaceHasTreeData =
      workspaceRef.current.files.length > 0 ||
      workspaceRef.current.assets.length > 0 ||
      workspaceRef.current.folders.length > 0;
    if (workspaceHasTreeData) return;
    const shouldBootstrapRefresh =
      !canHydrateWorkspaceFromStore || preferredWorkspaceSelection.source === 'store';
    if (!shouldBootstrapRefresh) return;
    let cancelled = false;
    void (async (): Promise<void> => {
      const snapshot = await fetchCaseResolverWorkspaceSnapshot('case_view_bootstrap');
      if (!isMountedRef.current || cancelled) return;
      if (!snapshot) {
        if (canHydrateWorkspaceFromStore) {
          logCaseResolverWorkspaceEvent({
            source: 'case_view_bootstrap',
            action: 'refresh_failed_no_retry',
            message: 'Bootstrap refresh failed while store snapshot is available; skipping retry loop.',
          });
          return;
        }
        if (bootstrapRefreshRetryTimerRef.current !== null) {
          window.clearTimeout(bootstrapRefreshRetryTimerRef.current);
        }
        const nextAttempt = bootstrapRefreshRetryAttemptRef.current + 1;
        bootstrapRefreshRetryAttemptRef.current = nextAttempt;
        const retryDelayMs = Math.min(10_000, 700 * nextAttempt);
        bootstrapRefreshRetryTimerRef.current = window.setTimeout((): void => {
          bootstrapRefreshRetryTimerRef.current = null;
          setBootstrapRefreshRetryTick((current: number): number => current + 1);
        }, retryDelayMs);
        logCaseResolverWorkspaceEvent({
          source: 'case_view_bootstrap',
          action: 'refresh_retry_scheduled',
          message: `retry_in_ms=${retryDelayMs} attempt=${nextAttempt}`,
        });
        return;
      }
      bootstrapRefreshRetryAttemptRef.current = 0;
      if (bootstrapRefreshRetryTimerRef.current !== null) {
        window.clearTimeout(bootstrapRefreshRetryTimerRef.current);
        bootstrapRefreshRetryTimerRef.current = null;
      }
      setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
        const hydrationDecision = shouldAdoptIncomingWorkspace({
          current,
          incoming: snapshot,
          requestedFileId,
        });
        if (!hydrationDecision.adopt) return current;
        if (hydrationDecision.reason === 'equal_revision_current_placeholder') {
          logCaseResolverWorkspaceEvent({
            source: 'case_view_bootstrap',
            action: 'refresh_equal_revision_adopted',
            workspaceRevision: getCaseResolverWorkspaceRevision(snapshot),
            message: 'Adopted equal-revision workspace snapshot because current workspace was placeholder.',
          });
        }
        syncPersistedWorkspaceTracking(snapshot);
        queuedSerializedWorkspaceRef.current = null;
        queuedExpectedRevisionRef.current = null;
        queuedMutationIdRef.current = null;
        return snapshot;
      });
      settingsStoreRef.current.refetch();
    })();
    return (): void => {
      cancelled = true;
    };
  }, [
    bootstrapRefreshRetryTick,
    canHydrateWorkspaceFromStore,
    preferredWorkspaceSelection.source,
    queuedExpectedRevisionRef,
    queuedMutationIdRef,
    queuedSerializedWorkspaceRef,
    requestedFileId,
    settingsStoreRef,
    syncPersistedWorkspaceTracking,
  ]);

  useEffect((): (() => void) | void => {
    const hasWorkspaceData =
      workspace.files.length > 0 ||
      workspace.assets.length > 0 ||
      workspace.folders.length > 0;
    if (hasWorkspaceData) return;
    if (heavySettingsQuery.isFetching || heavySettingsQuery.isLoading) return;
    const refreshTimer = window.setTimeout((): void => {
      void heavySettingsQuery.refetch();
    }, 1_500);
    return (): void => {
      window.clearTimeout(refreshTimer);
    };
  }, [
    heavySettingsQuery.isFetching,
    heavySettingsQuery.isLoading,
    heavySettingsQuery.refetch,
    workspace.assets.length,
    workspace.files.length,
    workspace.folders.length,
  ]);

  // Sync with store
  useEffect(() => {
    if (!canHydrateWorkspaceFromStore) return;
    if (promptExploder.isApplyingPromptExploderPartyProposal) return;
    setWorkspace((current: CaseResolverWorkspace): CaseResolverWorkspace => {
      const hydrationDecision = shouldAdoptIncomingWorkspace({
        current,
        incoming: parsedWorkspace,
        requestedFileId,
      });
      if (!hydrationDecision.adopt) return current;
      if (hydrationDecision.reason === 'equal_revision_current_placeholder') {
        logCaseResolverWorkspaceEvent({
          source: 'case_view_sync',
          action: 'refresh_equal_revision_adopted',
          workspaceRevision: getCaseResolverWorkspaceRevision(parsedWorkspace),
          message: 'Adopted equal-revision workspace from settings store because current workspace was placeholder.',
        });
      }

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
      requestedContextAutoClearRequestKeyRef.current = null;
      requestedContextLastQueuedAutoClearKeyRef.current = null;
      handledRequestedFileIdRef.current = null;
      setRequestedContextAutoClearRequestKey(null);
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
    requestedContextAutoClearRequestKeyRef.current = null;
    requestedContextLastQueuedAutoClearKeyRef.current = null;
    handledRequestedFileIdRef.current = null;
    setRequestedContextAutoClearRequestKey(null);
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
        if (hasRequestedCaseFile(workspaceRef.current.files, normalizedRequestedFileId)) {
          requestedWorkspaceRefreshFileIdRef.current = null;
          requestedWorkspaceMissingFileIdRef.current = null;
          handledRequestedFileIdRef.current = null;
          setRequestedCaseIssueSafe(null);
          setRequestedCaseStatusSafe('ready');
          logRequestedContextTransition('requested_context_ready', {
            message:
              'Workspace refresh failed but requested file resolved from in-memory workspace.',
            requestKey,
            resolvedVia: 'workspace_presence',
          });
          return;
        }
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
        queueRequestedContextAutoClear({
          requestKey,
          issue: requestedIssueAfterRefresh,
          message: 'Auto-cleared stale URL context after refresh failure.',
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
          const hydrationDecision = shouldAdoptIncomingWorkspace({
            current,
            incoming: refreshedWorkspace,
            requestedFileId: normalizedRequestedFileId,
          });
          if (!hydrationDecision.adopt) return current;
          if (hydrationDecision.reason === 'equal_revision_current_placeholder') {
            logCaseResolverWorkspaceEvent({
              source: 'case_view_requested_context_resolve',
              action: 'refresh_equal_revision_adopted',
              workspaceRevision: getCaseResolverWorkspaceRevision(refreshedWorkspace),
              message: 'Adopted equal-revision workspace during requested context resolve because current workspace was placeholder.',
            });
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
      queueRequestedContextAutoClear({
        requestKey,
        issue: requestedIssueAfterRefresh,
        message: 'Auto-cleared stale URL context after requested file was not found.',
      });
    })();
  }, [
    queueRequestedContextAutoClear,
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
      if (hasRequestedCaseFile(workspaceRef.current.files, normalizedRequestedFileId)) {
        requestedContextInFlightRef.current = null;
        requestedContextStartedAtRef.current = null;
        requestedWorkspaceRefreshFileIdRef.current = null;
        requestedWorkspaceMissingFileIdRef.current = null;
        handledRequestedFileIdRef.current = null;
        setRequestedCaseIssueSafe(null);
        setRequestedCaseStatusSafe('ready');
        logRequestedContextTransition('requested_context_ready', {
          message:
            'Watchdog recovered requested context from in-memory workspace before forcing missing.',
          requestKey,
          resolvedVia: 'workspace_presence',
        });
        return;
      }

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
      queueRequestedContextAutoClear({
        requestKey,
        issue: 'workspace_unavailable',
        message: 'Auto-cleared stale URL context after loading watchdog timeout.',
      });
    }, 500);

    return (): void => {
      window.clearInterval(watchdogTimer);
    };
  }, [
    queueRequestedContextAutoClear,
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
      queueRequestedContextAutoClear({
        requestKey: requestedContextAttemptKeyRef.current,
        issue: 'workspace_unavailable',
        message: 'Auto-cleared stale URL context after deadlock guard transition.',
      });
    }, 1500);

    return (): void => {
      window.clearTimeout(deadlockGuardTimer);
    };
  }, [
    queueRequestedContextAutoClear,
    logRequestedContextTransition,
    requestedCaseStatus,
    requestedFileId,
    setRequestedCaseIssueSafe,
    setRequestedCaseStatusSafe,
  ]);

  useEffect(() => {
    return (): void => {
      clearConflictRetryTimer();
      if (bootstrapRefreshRetryTimerRef.current) {
        window.clearTimeout(bootstrapRefreshRetryTimerRef.current);
        bootstrapRefreshRetryTimerRef.current = null;
      }
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
    requestedContextAutoClearRequestKeyRef.current = null;
    requestedContextLastQueuedAutoClearKeyRef.current = null;
    requestedWorkspaceMissingFileIdRef.current = null;
    requestedWorkspaceRefreshFileIdRef.current = normalizedRequestedFileId;
    handledRequestedFileIdRef.current = null;
    setRequestedContextAutoClearRequestKey(null);
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
    requestedContextAutoClearRequestKeyRef.current = null;
    requestedContextLastQueuedAutoClearKeyRef.current = null;
    handledRequestedFileIdRef.current = null;
    setRequestedContextAutoClearRequestKey(null);
    setRequestedCaseIssueSafe(null);
    setRequestedCaseStatusSafe('ready');
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
  const workspaceIndexes = useMemo(
    () => buildCaseResolverRuntimeIndexes(workspace),
    [workspace.assets, workspace.files, workspace.folderRecords, workspace.folders],
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
      activeCaseId: viewState.activeCaseId,
      workspace,
      includeDescendantCaseScope: true,
      indexes: workspaceIndexes,
    });
    return scopedWorkspace.files.filter(
      (file: CaseResolverFile): boolean =>
        file.fileType !== 'case' && !file.parentCaseId,
    ).length;
  }, [viewState.activeCaseId, workspace, workspaceIndexes]);

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
    requestedContextAutoClearRequestKeyRef.current = null;
    requestedContextLastQueuedAutoClearKeyRef.current = null;
    setRequestedContextAutoClearRequestKey(null);
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

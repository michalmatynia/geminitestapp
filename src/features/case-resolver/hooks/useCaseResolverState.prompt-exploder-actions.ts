'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CaseResolverCaptureProposalState } from '@/features/case-resolver/capture/public';
import type {
  CaseResolverWorkspace,
  CaseResolverFile,
  CaseResolverCaptureSettings,
} from '@/shared/contracts/case-resolver';
import type { FilemakerDatabaseDto as FilemakerDatabase } from '@/shared/contracts/filemaker';
import { type Toast } from '@/shared/contracts/ui';
import {
  PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
  PROMPT_EXPLODER_BRIDGE_STORAGE_EVENT,
} from '@/shared/lib/prompt-exploder/bridge';

import { resolveCaseResolverFileById } from './useCaseResolverState.helpers';
import {
  discardPendingCaseResolverPromptExploderPayload,
  readCaseResolverPromptExploderPayloadState,
  resolvePromptExploderPendingPayloadIdentity,
  applyPendingPromptExploderPayloadToCaseResolver,
  type CaseResolverPromptExploderApplyUiDiagnostics,
  type CaseResolverPromptExploderPayloadReadState,
  type CaseResolverPromptExploderPendingPayload,
} from './useCaseResolverState.prompt-exploder-sync';
import { logCaseResolverWorkspaceEvent } from '../workspace-persistence';
import {
  applyPromptExploderTransferLifecycleUpdate,
  type PromptExploderTransferUiStatus,
} from './prompt-exploder-transfer-lifecycle';

import type { CaseResolverFileEditDraft } from '../types';
import { logClientError } from '@/shared/utils/observability/client-error-logger';



const CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_KEY =
  'case_resolver:applied_prompt_exploder_transfer_ids';
const CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_LIMIT = 80;

export interface UseCaseResolverPromptExploderValue {
  pendingPromptExploderPayload: CaseResolverPromptExploderPendingPayload | null;
  promptExploderPartyProposal: CaseResolverCaptureProposalState | null;
  setPromptExploderPartyProposal: React.Dispatch<
    React.SetStateAction<CaseResolverCaptureProposalState | null>
  >;
  isPromptExploderPartyProposalOpen: boolean;
  setIsPromptExploderPartyProposalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isApplyingPromptExploderPartyProposal: boolean;
  setIsApplyingPromptExploderPartyProposal: (
    value: boolean | ((current: boolean) => boolean)
  ) => void;
  promptExploderPayloadRefreshVersion: number;
  promptExploderApplyDiagnostics: CaseResolverPromptExploderApplyUiDiagnostics | null;
  setPromptExploderApplyDiagnostics: React.Dispatch<
    React.SetStateAction<CaseResolverPromptExploderApplyUiDiagnostics | null>
  >;
  refreshPendingPromptExploderPayload: () => void;
  handleDiscardPendingPromptExploderPayload: () => void;
  handleApplyPendingPromptExploderPayload: () => Promise<boolean>;
  transitionPromptExploderApplyDiagnostics: (input: {
    nextStatus: PromptExploderTransferUiStatus;
    reason?: string | null;
    force?: boolean;
    patch?: Partial<CaseResolverPromptExploderApplyUiDiagnostics>;
  }) => void;
}

export function useCaseResolverPromptExploder({
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
  flushWorkspacePersist,
}: {
  workspace: CaseResolverWorkspace;
  workspaceRef: React.MutableRefObject<CaseResolverWorkspace>;
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
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  filemakerDatabase: FilemakerDatabase;
  caseResolverCaptureSettings: CaseResolverCaptureSettings;
  requestedFileId: string | null;
  shouldOpenEditorFromQuery: boolean;
  requestedPromptExploderSessionId: string;
  toast: Toast;
  flushWorkspacePersist: () => void;
}): UseCaseResolverPromptExploderValue {
  const [promptExploderPartyProposal, setPromptExploderPartyProposal] =
    useState<CaseResolverCaptureProposalState | null>(null);
  const [isPromptExploderPartyProposalOpen, setIsPromptExploderPartyProposalOpen] = useState(false);
  const [isApplyingPromptExploderPartyProposal, setIsApplyingPromptExploderPartyProposalState] =
    useState(false);
  const [promptExploderPayloadRefreshVersion, setPromptExploderPayloadRefreshVersion] = useState(0);
  const [promptExploderApplyDiagnostics, setPromptExploderApplyDiagnostics] =
    useState<CaseResolverPromptExploderApplyUiDiagnostics | null>(null);

  const lastPromptExploderPayloadKeyRef = useRef<string | null>(null);
  const appliedPromptExploderTransferIdsRef = useRef<Set<string>>(new Set());
  const autoApplyPromptTransferKeysRef = useRef<Set<string>>(new Set());
  const autoApplyPromptTransferInFlightKeyRef = useRef<string | null>(null);
  const isApplyingPromptExploderPartyProposalRef = useRef(isApplyingPromptExploderPartyProposal);

  const setIsApplyingPromptExploderPartyProposal = useCallback(
    (value: boolean | ((current: boolean) => boolean)): void => {
      setIsApplyingPromptExploderPartyProposalState((current) => {
        const nextValue =
          typeof value === 'function' ? (value as (current: boolean) => boolean)(current) : value;
        isApplyingPromptExploderPartyProposalRef.current = nextValue;
        return nextValue;
      });
    },
    []
  );

  const transitionPromptExploderApplyDiagnostics = useCallback(
    (input: {
      nextStatus: PromptExploderTransferUiStatus;
      reason?: string | null;
      force?: boolean;
      patch?: Partial<CaseResolverPromptExploderApplyUiDiagnostics>;
    }): void => {
      setPromptExploderApplyDiagnostics(
        (current: CaseResolverPromptExploderApplyUiDiagnostics | null) =>
          applyPromptExploderTransferLifecycleUpdate<CaseResolverPromptExploderApplyUiDiagnostics>(
            current,
            {
              nextStatus: input.nextStatus,
              reason: input.reason ?? null,
              force: input.force ?? false,
              patch: input.patch ?? {},
            }
          )
      );
    },
    []
  );

  const logPromptExploderBindingGuardrailEvent = useCallback(
    (input: {
      mode: 'manual' | 'auto';
      reason: 'document_mismatch' | 'session_mismatch';
      payload: CaseResolverPromptExploderPendingPayload;
      requestedContextFileId: string;
      requestedSessionId: string;
    }): void => {
      logCaseResolverWorkspaceEvent({
        source:
          input.mode === 'manual' ? 'prompt_exploder_apply_manual' : 'prompt_exploder_apply_auto',
        action:
          input.reason === 'document_mismatch'
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
    },
    [shouldOpenEditorFromQuery]
  );

  const persistAppliedPromptExploderTransferIds = useCallback((): void => {
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify(
        Array.from(appliedPromptExploderTransferIdsRef.current).slice(
          -CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_LIMIT
        )
      );
      window.localStorage.setItem(CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_KEY, payload);
    } catch (error) {
      logClientError(error);
    
      // Ignore storage persistence failures for idempotency cache.
    }
  }, []);

  const markPromptExploderTransferApplied = useCallback(
    (transferId: string | null): void => {
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
    },
    [persistAppliedPromptExploderTransferIds]
  );

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
    } catch (error) {
      logClientError(error);
    
      // Ignore idempotency cache restoration issues.
    }
  }, []);

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
      setPromptExploderApplyDiagnostics(
        (
          current: CaseResolverPromptExploderApplyUiDiagnostics | null
        ): CaseResolverPromptExploderApplyUiDiagnostics | null =>
          current
            ? { ...current, captureSettingsEnabled: caseResolverCaptureSettings.enabled }
            : current
      );
      return;
    }
    lastPromptExploderPayloadKeyRef.current = observedPromptExploderPayloadKey;
    const payloadContextFileId =
      observedPromptExploderPayload.caseResolverContext?.fileId?.trim() || null;
    const precheckResolvedTargetFileId =
      resolveCaseResolverFileById(workspace.files, payloadContextFileId)?.id ?? null;
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
        ? observedPromptExploderPayload.caseResolverParties ||
          observedPromptExploderPayload.caseResolverMetadata?.placeDate
          ? 'proposal_builder_returned_null'
          : 'no_capture_payload'
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
    const precheckResolvedTargetFileId =
      resolveCaseResolverFileById(workspace.files, payloadContextFileId)?.id ?? null;
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
        ? discardedPayload.caseResolverParties || discardedPayload.caseResolverMetadata?.placeDate
          ? 'proposal_builder_returned_null'
          : 'no_capture_payload'
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
    setIsApplyingPromptExploderPartyProposal,
  ]);

  const handleApplyPendingPromptExploderPayload = useCallback(async (): Promise<boolean> => {
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
          ? payload.caseResolverParties || payload.caseResolverMetadata?.placeDate
            ? 'proposal_builder_returned_null'
            : 'no_capture_payload'
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
      status: result.applied ? (result.proposalState ? 'capture_review' : 'applied') : 'failed',
      reason: result.applied
        ? result.proposalState
          ? 'awaiting_capture_mapping'
          : null
        : result.reason,
      updatedAt: new Date().toISOString(),
    });

    if (!result.applied) {
      const errorMessages: Record<string, string> = {
        empty_prompt: 'Prompt Exploder output is empty. Reassemble text before applying.',
        target_file_locked:
          'Target document is locked. Unlock it in Case Resolver before applying output.',
        missing_context_file_id: 'Prompt Exploder output is missing a target document context.',
        target_missing_in_live_workspace_after_precheck:
          'Target document was resolved in precheck but is unavailable in the live workspace snapshot.',
        target_file_missing_precheck: 'Cannot resolve target document for Prompt Exploder output.',
        target_file_missing_mutation_snapshot:
          'Cannot resolve target document for Prompt Exploder output.',
      };
      toast(errorMessages[result.reason || ''] || 'No pending Prompt Exploder output to apply.', {
        variant: result.reason ? 'warning' : 'info',
      });
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
            { variant: 'warning' }
          );
        }
      } else {
        toast('Applied output has no captured addresser, addressee, or document date.', {
          variant: 'info',
        });
      }
    }

    if (result.workspaceChanged) {
      queueMicrotask((): void => {
        flushWorkspacePersist();
      });
      toast('Prompt Exploder output applied to the bound document.', { variant: 'success' });
    } else {
      toast('Prompt Exploder output already matches the bound document.', { variant: 'info' });
    }
    return true;
  }, [
    caseResolverCaptureSettings,
    expiredPromptExploderPayload,
    filemakerDatabase,
    logPromptExploderBindingGuardrailEvent,
    markPromptExploderTransferApplied,
    pendingPromptExploderPayload,
    pendingPromptExploderPayloadKey,
    refreshPendingPromptExploderPayload,
    requestedFileId,
    requestedPromptExploderSessionId,
    setEditingDocumentDraft,
    shouldOpenEditorFromQuery,
    toast,
    transitionPromptExploderApplyDiagnostics,
    updateWorkspace,
    workspaceRef,
    flushWorkspacePersist,
    setIsApplyingPromptExploderPartyProposal,
  ]);

  useEffect((): void => {
    if (!shouldOpenEditorFromQuery) return;
    const payload = pendingPromptExploderPayload;
    if (!payload) return;
    const requestedContextFileId = requestedFileId?.trim() ?? '';
    const requestedSessionId = requestedPromptExploderSessionId.trim();
    if (!requestedContextFileId || !requestedSessionId) return;
    if (
      !workspace.files.some((file: CaseResolverFile): boolean => file.id === requestedContextFileId)
    ) {
      return;
    }

    const payloadTransferId = payload.transferId?.trim() || '';
    const payloadContextFileId = payload.caseResolverContext?.fileId?.trim() || '';
    const payloadSessionId = payload.caseResolverContext?.sessionId?.trim() || '';
    const autoApplyKey = [
      payloadTransferId || payload.createdAt || 'missing-transfer',
      requestedContextFileId,
      requestedSessionId,
    ].join('|');
    if (autoApplyPromptTransferKeysRef.current.has(autoApplyKey)) return;
    if (autoApplyPromptTransferInFlightKeyRef.current === autoApplyKey) return;

    if (
      payloadContextFileId !== requestedContextFileId ||
      payloadSessionId !== requestedSessionId
    ) {
      autoApplyPromptTransferKeysRef.current.add(autoApplyKey);
      logCaseResolverWorkspaceEvent({
        source: 'prompt_exploder_apply_auto',
        action: 'prompt_exploder_return_auto_apply_skipped',
        message: [
          'reason=binding_mismatch',
          `payload_file_id=${payloadContextFileId || 'none'}`,
          `requested_file_id=${requestedContextFileId}`,
          `payload_session_id=${payloadSessionId || 'none'}`,
          `requested_session_id=${requestedSessionId}`,
        ].join(' '),
      });
      return;
    }

    autoApplyPromptTransferKeysRef.current.add(autoApplyKey);
    autoApplyPromptTransferInFlightKeyRef.current = autoApplyKey;
    logCaseResolverWorkspaceEvent({
      source: 'prompt_exploder_apply_auto',
      action: 'prompt_exploder_return_auto_apply_started',
      message: [
        `transfer_id=${payloadTransferId || 'none'}`,
        `requested_file_id=${requestedContextFileId}`,
      ].join(' '),
    });

    void (async (): Promise<void> => {
      try {
        const applied = await handleApplyPendingPromptExploderPayload();
        logCaseResolverWorkspaceEvent({
          source: 'prompt_exploder_apply_auto',
          action: applied
            ? 'prompt_exploder_return_auto_apply_succeeded'
            : 'prompt_exploder_return_auto_apply_skipped',
          message: `transfer_id=${payloadTransferId || 'none'} applied=${applied ? 'true' : 'false'}`,
        });
      } finally {
        if (autoApplyPromptTransferInFlightKeyRef.current === autoApplyKey) {
          autoApplyPromptTransferInFlightKeyRef.current = null;
        }
      }
    })();
  }, [
    handleApplyPendingPromptExploderPayload,
    pendingPromptExploderPayload,
    requestedFileId,
    requestedPromptExploderSessionId,
    shouldOpenEditorFromQuery,
    workspace.files,
  ]);

  return {
    pendingPromptExploderPayload,
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
  };
}

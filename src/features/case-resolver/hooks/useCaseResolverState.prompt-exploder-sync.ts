import {
  buildFileEditDraft,
  createCaseResolverHistorySnapshotEntry,
  createId,
} from '@/features/case-resolver/utils/caseResolverUtils';
import {
  buildCaseResolverCaptureProposalState,
  type CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture';
import {
  deriveDocumentContentSync,
  ensureSafeDocumentHtml,
  toStorageDocumentValue,
} from '@/features/document-editor';
import type {
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import {
  clearPromptExploderApplyPayload,
  consumePromptExploderApplyPromptForCaseResolver,
  readPromptExploderApplyPayloadSnapshot,
  savePromptExploderApplyPromptForCaseResolver,
  type PromptExploderBridgePayload,
} from '@/shared/lib/prompt-exploder/bridge';

import { createCaseResolverFile } from '../settings';
import { type PromptExploderTransferUiStatus } from './prompt-exploder-transfer-lifecycle';
import {
  buildCaseResolverFileComparableFingerprint,
  CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT,
} from './useCaseResolverState.helpers';
import type {
  UseCaseResolverWorkspaceMutationsValue,
} from './useCaseResolverState.workspace-mutations';

type SetEditingDocumentDraftFn = React.Dispatch<
  React.SetStateAction<CaseResolverFileEditDraft | null>
>;

type FilemakerDatabase = Parameters<typeof buildCaseResolverCaptureProposalState>[2];
type CaseResolverCaptureSettings = Parameters<typeof buildCaseResolverCaptureProposalState>[3];

const resolveDefaultProposalReason = ({
  captureSettingsEnabled,
  hasPartiesPayload,
  hasMetadataPayload,
}: {
  captureSettingsEnabled: boolean;
  hasPartiesPayload: boolean;
  hasMetadataPayload: boolean;
}): CaseResolverPromptExploderApplyProposalReason => {
  if (!captureSettingsEnabled) return 'capture_disabled';
  if (!hasPartiesPayload && !hasMetadataPayload) return 'no_capture_payload';
  return 'proposal_builder_returned_null';
};

export type CaseResolverPromptExploderPendingPayload = PromptExploderBridgePayload & {
  target: 'case-resolver';
};

export type CaseResolverPromptExploderPayloadReadState = {
  pendingPayload: CaseResolverPromptExploderPendingPayload | null;
  expiredPayload: CaseResolverPromptExploderPendingPayload | null;
  expiresAt: string | null;
};

export type CaseResolverPromptExploderApplyFailureReason =
  | 'no_payload'
  | 'empty_prompt'
  | 'missing_context_file_id'
  | 'target_file_locked'
  | 'target_file_missing_precheck'
  | 'target_file_missing_mutation_snapshot'
  | 'target_missing_in_live_workspace_after_precheck';

export type CaseResolverPromptExploderApplyProposalReason =
  | 'proposal_generated'
  | 'proposal_builder_returned_null'
  | 'no_capture_payload'
  | 'capture_disabled';

export type CaseResolverPromptExploderApplyTargetResolutionStrategy = 'requested_id' | 'unresolved';

export interface CaseResolverPromptExploderApplyDiagnostics {
  applyAttemptId: string;
  transferId: string | null;
  payloadVersion: number | null;
  payloadChecksum: string | null;
  payloadStatus: string | null;
  payloadCreatedAt: string | null;
  payloadKey: string | null;
  requestedTargetFileId: string | null;
  payloadContextFileId: string | null;
  fallbackTargetFileId: string | null;
  precheckResolvedTargetFileId: string | null;
  precheckResolutionStrategy: CaseResolverPromptExploderApplyTargetResolutionStrategy;
  precheckWorkspaceFileCount: number;
  mutationResolvedTargetFileId: string | null;
  mutationResolutionStrategy: CaseResolverPromptExploderApplyTargetResolutionStrategy;
  mutationWorkspaceFileCount: number;
  resolvedTargetFileId: string | null;
  resolutionStrategy: CaseResolverPromptExploderApplyTargetResolutionStrategy;
  hasPartiesPayload: boolean;
  hasMetadataPayload: boolean;
  captureSettingsEnabled: boolean;
  proposalBuilt: boolean;
  proposalReason: CaseResolverPromptExploderApplyProposalReason;
  mutationMissingAfterPrecheck: boolean;
}

export interface CaseResolverPromptExploderApplyUiDiagnostics extends CaseResolverPromptExploderApplyDiagnostics {
  status: PromptExploderTransferUiStatus;
  reason: string | null;
  updatedAt: string;
}

export type CaseResolverPromptExploderApplyResult =
  | {
      applied: true;
      payload: CaseResolverPromptExploderPendingPayload;
      proposalState: CaseResolverCaptureProposalState | null;
      workspaceChanged: boolean;
      diagnostics: CaseResolverPromptExploderApplyDiagnostics;
    }
  | {
      applied: false;
      payload: CaseResolverPromptExploderPendingPayload | null;
      proposalState: null;
      reason: CaseResolverPromptExploderApplyFailureReason;
      diagnostics: CaseResolverPromptExploderApplyDiagnostics;
    };

const normalizeCandidateId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolvePromptExploderApplyTargetFileId = ({
  requestedTargetFileId,
  workspaceFiles,
}: {
  requestedTargetFileId: string | null;
  workspaceFiles: CaseResolverWorkspace['files'];
}): {
  resolvedTargetFileId: string | null;
  resolutionStrategy: CaseResolverPromptExploderApplyTargetResolutionStrategy;
} => {
  const fileIdByNormalizedId = new Map<string, string>();

  workspaceFiles.forEach((file) => {
    const normalizedFileId = normalizeCandidateId(file.id);
    if (normalizedFileId && !fileIdByNormalizedId.has(normalizedFileId)) {
      fileIdByNormalizedId.set(normalizedFileId, file.id);
    }
  });

  const normalizedRequestedId = normalizeCandidateId(requestedTargetFileId);
  if (normalizedRequestedId) {
    const match = fileIdByNormalizedId.get(normalizedRequestedId);
    if (match) {
      return {
        resolvedTargetFileId: match,
        resolutionStrategy: 'requested_id',
      };
    }
  }

  return {
    resolvedTargetFileId: null,
    resolutionStrategy: 'unresolved',
  };
};

const findWorkspaceFileByNormalizedId = (
  files: CaseResolverWorkspace['files'],
  candidateId: string | null
): CaseResolverFile | null => {
  const normalizedCandidateId = normalizeCandidateId(candidateId);
  if (!normalizedCandidateId) return null;
  return (
    files.find(
      (file: CaseResolverFile): boolean => normalizeCandidateId(file.id) === normalizedCandidateId
    ) ?? null
  );
};

const normalizePayloadCreatedAt = (value: string | null | undefined): string =>
  normalizeCandidateId(value) ?? 'missing-created-at';

const buildPromptExploderPayloadKey = (payload: PromptExploderBridgePayload): string =>
  payload.transferId?.trim()
    ? payload.transferId.trim()
    : [
      normalizePayloadCreatedAt(payload.createdAt),
      payload.caseResolverContext?.fileId ?? '',
      payload.prompt,
      JSON.stringify(payload.caseResolverParties ?? null),
      JSON.stringify(payload.caseResolverMetadata ?? null),
    ].join('|');

export const resolvePromptExploderPendingPayloadIdentity = (
  payload: Pick<
    PromptExploderBridgePayload,
    'transferId' | 'createdAt' | 'caseResolverContext' | 'prompt'
  >
): string =>
  [
    payload.transferId?.trim() || '',
    normalizePayloadCreatedAt(payload.createdAt),
    payload.caseResolverContext?.fileId ?? '',
    String(payload.prompt.length),
  ].join('|');

const toCaseResolverPendingPayload = (
  payload: PromptExploderBridgePayload | null
): CaseResolverPromptExploderPendingPayload | null => {
  if (payload?.target !== 'case-resolver') return null;
  return {
    ...payload,
    target: 'case-resolver',
  };
};

export const readCaseResolverPromptExploderPayloadState =
  (): CaseResolverPromptExploderPayloadReadState => {
    const snapshot = readPromptExploderApplyPayloadSnapshot();
    const payload = toCaseResolverPendingPayload(snapshot.payload);
    if (!payload) {
      return {
        pendingPayload: null,
        expiredPayload: null,
        expiresAt: snapshot.expiresAt,
      };
    }
    if (!payload.prompt.trim()) {
      return {
        pendingPayload: null,
        expiredPayload: null,
        expiresAt: snapshot.expiresAt,
      };
    }
    if (snapshot.isExpired) {
      return {
        pendingPayload: null,
        expiredPayload: payload,
        expiresAt: snapshot.expiresAt,
      };
    }
    return {
      pendingPayload: payload,
      expiredPayload: null,
      expiresAt: snapshot.expiresAt,
    };
  };

export const readPendingCaseResolverPromptExploderPayload =
  (): CaseResolverPromptExploderPendingPayload | null => {
    return readCaseResolverPromptExploderPayloadState().pendingPayload;
  };

export const discardPendingCaseResolverPromptExploderPayload =
  (): CaseResolverPromptExploderPendingPayload | null => {
    const snapshot = readPromptExploderApplyPayloadSnapshot();
    const snapshotPayload = toCaseResolverPendingPayload(snapshot.payload);
    if (snapshotPayload && snapshot.isExpired) {
      clearPromptExploderApplyPayload();
      return snapshotPayload;
    }
    const consumed = toCaseResolverPendingPayload(
      consumePromptExploderApplyPromptForCaseResolver()
    );
    if (consumed) return consumed;
    if (!snapshotPayload) return null;
    clearPromptExploderApplyPayload();
    return snapshotPayload;
  };

export const applyPendingPromptExploderPayloadToCaseResolver = ({
  payload,
  workspaceFiles,
  updateWorkspace,
  setEditingDocumentDraft,
  filemakerDatabase,
  caseResolverCaptureSettings,
}: {
  payload?: CaseResolverPromptExploderPendingPayload | null;
  workspaceFiles: CaseResolverWorkspace['files'];
  updateWorkspace: UseCaseResolverWorkspaceMutationsValue['updateWorkspace'];
  setEditingDocumentDraft: SetEditingDocumentDraftFn;
  filemakerDatabase: FilemakerDatabase;
  caseResolverCaptureSettings: CaseResolverCaptureSettings;
}): CaseResolverPromptExploderApplyResult => {
  const applyAttemptId = createId('case-prompt-apply');
  const payloadToApply = payload ?? readPendingCaseResolverPromptExploderPayload();
  const requestedTargetFileId = normalizeCandidateId(payloadToApply?.caseResolverContext?.fileId);
  const payloadContextFileId = payloadToApply?.caseResolverContext?.fileId ?? null;
  const normalizedFallbackTargetFileId: string | null = null;
  const payloadKey = payloadToApply ? buildPromptExploderPayloadKey(payloadToApply) : null;
  const payloadTransferId = payloadToApply?.transferId?.trim() || null;
  const payloadVersion =
    typeof payloadToApply?.payloadVersion === 'number' &&
    Number.isFinite(payloadToApply.payloadVersion)
      ? Math.trunc(payloadToApply.payloadVersion)
      : null;
  const payloadChecksum = payloadToApply?.checksum?.trim() || null;
  const payloadStatus = payloadToApply?.status?.trim() || null;
  const payloadCreatedAt = payloadToApply?.createdAt?.trim() || null;
  const hasPartiesPayload = Boolean(payloadToApply?.caseResolverParties);
  const hasMetadataPayload = Boolean(payloadToApply?.caseResolverMetadata?.placeDate);
  const precheckTargetResolution = resolvePromptExploderApplyTargetFileId({
    requestedTargetFileId,
    workspaceFiles,
  });
  const buildDiagnostics = (
    input: Partial<
      Pick<
        CaseResolverPromptExploderApplyDiagnostics,
        | 'precheckResolvedTargetFileId'
        | 'precheckResolutionStrategy'
        | 'precheckWorkspaceFileCount'
        | 'mutationResolvedTargetFileId'
        | 'mutationResolutionStrategy'
        | 'mutationWorkspaceFileCount'
        | 'resolvedTargetFileId'
        | 'resolutionStrategy'
        | 'proposalBuilt'
        | 'proposalReason'
        | 'mutationMissingAfterPrecheck'
      >
    >
  ): CaseResolverPromptExploderApplyDiagnostics => ({
    applyAttemptId,
    transferId: payloadTransferId,
    payloadVersion,
    payloadChecksum,
    payloadStatus,
    payloadCreatedAt,
    payloadKey,
    requestedTargetFileId,
    payloadContextFileId,
    fallbackTargetFileId: normalizedFallbackTargetFileId,
    precheckResolvedTargetFileId:
      input.precheckResolvedTargetFileId ?? precheckTargetResolution.resolvedTargetFileId ?? null,
    precheckResolutionStrategy:
      input.precheckResolutionStrategy ?? precheckTargetResolution.resolutionStrategy,
    precheckWorkspaceFileCount: input.precheckWorkspaceFileCount ?? workspaceFiles.length,
    mutationResolvedTargetFileId: input.mutationResolvedTargetFileId ?? null,
    mutationResolutionStrategy: input.mutationResolutionStrategy ?? 'unresolved',
    mutationWorkspaceFileCount: input.mutationWorkspaceFileCount ?? workspaceFiles.length,
    resolvedTargetFileId:
      input.resolvedTargetFileId ??
      input.mutationResolvedTargetFileId ??
      precheckTargetResolution.resolvedTargetFileId ??
      null,
    resolutionStrategy:
      input.resolutionStrategy ??
      input.mutationResolutionStrategy ??
      precheckTargetResolution.resolutionStrategy,
    hasPartiesPayload,
    hasMetadataPayload,
    captureSettingsEnabled: caseResolverCaptureSettings.enabled,
    proposalBuilt: input.proposalBuilt ?? false,
    proposalReason:
      input.proposalReason ??
      resolveDefaultProposalReason({
        captureSettingsEnabled: caseResolverCaptureSettings.enabled,
        hasPartiesPayload,
        hasMetadataPayload,
      }),
    mutationMissingAfterPrecheck: input.mutationMissingAfterPrecheck ?? false,
  });

  if (!payloadToApply) {
    return {
      applied: false,
      payload: null,
      proposalState: null,
      reason: 'no_payload',
      diagnostics: buildDiagnostics({}),
    };
  }

  const nextExplodedContent = payloadToApply.prompt;
  if (!nextExplodedContent.trim()) {
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: 'empty_prompt',
      diagnostics: buildDiagnostics({
        resolvedTargetFileId: precheckTargetResolution.resolvedTargetFileId,
        resolutionStrategy: precheckTargetResolution.resolutionStrategy,
      }),
    };
  }
  if (!requestedTargetFileId) {
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: 'missing_context_file_id',
      diagnostics: buildDiagnostics({
        mutationResolvedTargetFileId: null,
        mutationResolutionStrategy: 'unresolved',
        mutationWorkspaceFileCount: workspaceFiles.length,
        resolvedTargetFileId: null,
        resolutionStrategy: 'unresolved',
      }),
    };
  }

  const now = new Date().toISOString();
  const canonicalExploded = deriveDocumentContentSync({
    mode: 'wysiwyg',
    value: ensureSafeDocumentHtml(nextExplodedContent),
  });
  const explodedStoredContent = toStorageDocumentValue(canonicalExploded);

  const buildExplodedFile = (file: CaseResolverFile): CaseResolverFile => {
    const currentSnapshot = createCaseResolverHistorySnapshotEntry({
      savedAt: now,
      documentContentVersion: file.documentContentVersion,
      activeDocumentVersion: file.activeDocumentVersion,
      editorType: file.editorType,
      documentContent: file.documentContent,
      documentContentMarkdown: file.documentContentMarkdown,
      documentContentHtml: file.documentContentHtml,
      documentContentPlainText: file.documentContentPlainText,
    });
    const nextDocumentHistory = currentSnapshot
      ? [currentSnapshot, ...file.documentHistory].slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT)
      : file.documentHistory;
    return createCaseResolverFile({
      ...file,
      originalDocumentContent: file.originalDocumentContent ?? file.documentContent,

      explodedDocumentContent: explodedStoredContent,
      activeDocumentVersion: 'exploded',
      editorType: canonicalExploded.mode,
      documentContentFormatVersion: 1,
      documentContentVersion: file.documentContentVersion + 1,
      documentContent: explodedStoredContent,
      documentContentMarkdown: canonicalExploded.markdown,
      documentContentHtml: canonicalExploded.html,
      documentContentPlainText: canonicalExploded.plainText,
      documentHistory: nextDocumentHistory,
      documentConversionWarnings: canonicalExploded.warnings,
      lastContentConversionAt: now,
      updatedAt: now,
      createdAt: file.createdAt || now,
    });
  };
  let mutationResolvedTargetFileId = precheckTargetResolution.resolvedTargetFileId;
  let mutationResolutionStrategy = precheckTargetResolution.resolutionStrategy;
  const mutationWorkspaceFileCount = workspaceFiles.length;

  if (!mutationResolvedTargetFileId) {
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: 'target_file_missing_precheck',
      diagnostics: buildDiagnostics({
        mutationResolvedTargetFileId: null,
        mutationResolutionStrategy,
        mutationWorkspaceFileCount,
        resolvedTargetFileId: null,
        resolutionStrategy: mutationResolutionStrategy,
      }),
    };
  }

  const mutationSourceFile =
    workspaceFiles.find(
      (file: CaseResolverFile): boolean => file.id === mutationResolvedTargetFileId
    ) ?? findWorkspaceFileByNormalizedId(workspaceFiles, mutationResolvedTargetFileId);

  if (mutationSourceFile?.isLocked) {
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: 'target_file_locked',
      diagnostics: buildDiagnostics({
        mutationResolvedTargetFileId: mutationSourceFile.id,
        mutationResolutionStrategy,
        mutationWorkspaceFileCount,
        resolvedTargetFileId: mutationSourceFile.id,
        resolutionStrategy: mutationResolutionStrategy,
      }),
    };
  }

  if (!mutationSourceFile) {
    const missingAfterPrecheck = Boolean(precheckTargetResolution.resolvedTargetFileId);
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: missingAfterPrecheck
        ? 'target_missing_in_live_workspace_after_precheck'
        : 'target_file_missing_mutation_snapshot',
      diagnostics: buildDiagnostics({
        mutationResolvedTargetFileId: null,
        mutationResolutionStrategy: 'unresolved',
        mutationWorkspaceFileCount,
        resolvedTargetFileId: null,
        resolutionStrategy: 'unresolved',
        mutationMissingAfterPrecheck: missingAfterPrecheck,
      }),
    };
  }

  mutationResolvedTargetFileId = mutationSourceFile.id;

  const mutationNextFile = buildExplodedFile(mutationSourceFile);
  const mutationChangedFromSnapshot =
    buildCaseResolverFileComparableFingerprint(mutationSourceFile) !==
    buildCaseResolverFileComparableFingerprint(mutationNextFile);
  let liveMutationResolvedTargetFileId: string | null = null;
  let liveMutationResolutionStrategy: CaseResolverPromptExploderApplyTargetResolutionStrategy =
    'unresolved';
  let liveMutationWorkspaceFileCount = mutationWorkspaceFileCount;
  let liveMutationSourceFile: CaseResolverFile | null = null;
  let liveMutationNextFile: CaseResolverFile | null = null;
  let liveMutationChanged = false;
  let liveMutationAttempted = false;
  let liveMutationBlockedByLock = false;

  updateWorkspace(
    (current) => {
      liveMutationAttempted = true;
      const liveTargetFileId = mutationResolvedTargetFileId;
      liveMutationWorkspaceFileCount = current.files.length;
      liveMutationResolutionStrategy = liveTargetFileId ? 'requested_id' : 'unresolved';
      liveMutationResolvedTargetFileId = liveTargetFileId;
      if (!liveTargetFileId) return current;

      const existingTarget =
        current.files.find((file: CaseResolverFile): boolean => file.id === liveTargetFileId) ??
        findWorkspaceFileByNormalizedId(current.files, liveTargetFileId);
      if (!existingTarget) {
        liveMutationResolvedTargetFileId = null;
        liveMutationResolutionStrategy = 'unresolved';
        return current;
      }
      if (existingTarget.isLocked) {
        liveMutationSourceFile = existingTarget;
        liveMutationNextFile = existingTarget;
        liveMutationChanged = false;
        liveMutationBlockedByLock = true;
        return current;
      }
      liveMutationSourceFile = existingTarget;
      const candidate = buildExplodedFile(existingTarget);
      liveMutationNextFile = candidate;

      const existingTargetId = existingTarget.id;
      const fileChangedFromExisting =
        buildCaseResolverFileComparableFingerprint(existingTarget) !==
        buildCaseResolverFileComparableFingerprint(candidate);
      liveMutationChanged = fileChangedFromExisting;

      let fileChanged = false;
      let nextFiles = current.files;
      if (fileChangedFromExisting) {
        nextFiles = current.files.map(
          (file: CaseResolverFile): CaseResolverFile =>
            file.id === existingTargetId ? candidate : file
        );
        fileChanged = true;
      }

      const nextActiveFileId =
        current.activeFileId === liveTargetFileId ? current.activeFileId : liveTargetFileId;
      const activeFileChanged = nextActiveFileId !== current.activeFileId;
      if (!fileChanged && !activeFileChanged) {
        return current;
      }

      return {
        ...current,
        activeFileId: nextActiveFileId,
        files: fileChanged ? nextFiles : current.files,
      };
    },
    {
      source: 'prompt_exploder_apply_manual',
      skipNormalization: true,
    }
  );

  if (liveMutationBlockedByLock && liveMutationResolvedTargetFileId) {
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: 'target_file_locked',
      diagnostics: buildDiagnostics({
        mutationResolvedTargetFileId: liveMutationResolvedTargetFileId,
        mutationResolutionStrategy: liveMutationResolutionStrategy,
        mutationWorkspaceFileCount: liveMutationWorkspaceFileCount,
        resolvedTargetFileId: liveMutationResolvedTargetFileId,
        resolutionStrategy: liveMutationResolutionStrategy,
      }),
    };
  }

  if (
    liveMutationAttempted &&
    (!liveMutationResolvedTargetFileId || !liveMutationSourceFile || !liveMutationNextFile)
  ) {
    const missingAfterPrecheck = Boolean(precheckTargetResolution.resolvedTargetFileId);
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: missingAfterPrecheck
        ? 'target_missing_in_live_workspace_after_precheck'
        : 'target_file_missing_mutation_snapshot',
      diagnostics: buildDiagnostics({
        mutationResolvedTargetFileId: null,
        mutationResolutionStrategy: 'unresolved',
        mutationWorkspaceFileCount: liveMutationWorkspaceFileCount,
        resolvedTargetFileId: null,
        resolutionStrategy: 'unresolved',
        mutationMissingAfterPrecheck: missingAfterPrecheck,
      }),
    };
  }

  const effectiveMutationSourceFile = liveMutationAttempted
    ? liveMutationSourceFile
    : (liveMutationSourceFile ?? mutationSourceFile);
  const effectiveMutationNextFile = liveMutationAttempted
    ? liveMutationNextFile
    : (liveMutationNextFile ?? mutationNextFile);
  const effectiveMutationResolvedTargetFileId = liveMutationAttempted
    ? liveMutationResolvedTargetFileId
    : (liveMutationResolvedTargetFileId ?? mutationResolvedTargetFileId);
  const effectiveMutationResolutionStrategy = liveMutationAttempted
    ? liveMutationResolutionStrategy
    : liveMutationResolvedTargetFileId
      ? liveMutationResolutionStrategy
      : mutationResolutionStrategy;
  const effectiveMutationWorkspaceFileCount = liveMutationWorkspaceFileCount;

  if (
    !effectiveMutationResolvedTargetFileId ||
    !effectiveMutationSourceFile ||
    !effectiveMutationNextFile
  ) {
    const missingAfterPrecheck = Boolean(precheckTargetResolution.resolvedTargetFileId);
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: missingAfterPrecheck
        ? 'target_missing_in_live_workspace_after_precheck'
        : 'target_file_missing_mutation_snapshot',
      diagnostics: buildDiagnostics({
        mutationResolvedTargetFileId: null,
        mutationResolutionStrategy: 'unresolved',
        mutationWorkspaceFileCount: effectiveMutationWorkspaceFileCount,
        resolvedTargetFileId: null,
        resolutionStrategy: 'unresolved',
        mutationMissingAfterPrecheck: missingAfterPrecheck,
      }),
    };
  }

  setEditingDocumentDraft(
    (current: CaseResolverFileEditDraft | null): CaseResolverFileEditDraft | null => {
      if (current?.id !== effectiveMutationResolvedTargetFileId) return current;
      return buildFileEditDraft(effectiveMutationNextFile);
    }
  );

  const primaryProposalState = buildCaseResolverCaptureProposalState(
    payloadToApply.caseResolverParties,
    effectiveMutationNextFile.id,
    filemakerDatabase,
    caseResolverCaptureSettings,
    {
      metadata: payloadToApply.caseResolverMetadata,
      sourceText: payloadToApply.prompt,
    }
  );
  const proposalState = primaryProposalState;
  const proposalReason: CaseResolverPromptExploderApplyProposalReason = (() => {
    if (!caseResolverCaptureSettings.enabled) return 'capture_disabled';
    if (!hasPartiesPayload && !hasMetadataPayload) return 'no_capture_payload';
    if (primaryProposalState) return 'proposal_generated';
    return 'proposal_builder_returned_null';
  })();

  const consumedPayload = consumePromptExploderApplyPromptForCaseResolver();
  if (consumedPayload) {
    const consumedPayloadKey = buildPromptExploderPayloadKey(consumedPayload);
    if (consumedPayloadKey !== payloadKey) {
      savePromptExploderApplyPromptForCaseResolver(
        consumedPayload.prompt,
        consumedPayload.caseResolverContext ?? null,
        consumedPayload.caseResolverParties ?? null,
        consumedPayload.caseResolverMetadata ?? null,
        {
          transferId: consumedPayload.transferId ?? null,
          payloadVersion: consumedPayload.payloadVersion ?? null,
          createdAt: consumedPayload.createdAt ?? null,
          expiresAt: consumedPayload.expiresAt ?? null,
          checksum: consumedPayload.checksum ?? null,
          status: consumedPayload.status ?? null,
          appliedAt: consumedPayload.appliedAt ?? null,
        }
      );
    }
  }

  return {
    applied: true,
    payload: payloadToApply,
    proposalState,
    workspaceChanged: liveMutationResolvedTargetFileId
      ? liveMutationChanged
      : mutationChangedFromSnapshot,
    diagnostics: buildDiagnostics({
      mutationResolvedTargetFileId: effectiveMutationResolvedTargetFileId,
      mutationResolutionStrategy: effectiveMutationResolutionStrategy,
      mutationWorkspaceFileCount: effectiveMutationWorkspaceFileCount,
      resolvedTargetFileId: effectiveMutationResolvedTargetFileId,
      resolutionStrategy: effectiveMutationResolutionStrategy,
      proposalBuilt: Boolean(proposalState),
      proposalReason,
    }),
  };
};

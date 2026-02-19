import {
  buildCaseResolverCaptureProposalState,
  type CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  deriveDocumentContentSync,
  ensureSafeDocumentHtml,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';
import {
  consumePromptExploderApplyPromptForCaseResolver,
  readPromptExploderApplyPayload,
  savePromptExploderApplyPromptForCaseResolver,
  type PromptExploderBridgePayload,
} from '@/features/prompt-exploder/bridge';

import { createCaseResolverFile } from '../settings';
import {
  buildCaseResolverFileComparableFingerprint,
  CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT,
} from './useCaseResolverState.helpers';
import { createId } from '../utils/caseResolverUtils';

import type {
  CaseResolverFile,
  CaseResolverFileEditDraft,
  CaseResolverWorkspace,
} from '../types';

type UpdateWorkspaceOptions = {
  persistToast?: string;
  mutationId?: string;
  source?: string;
  skipNormalization?: boolean;
};

type UpdateWorkspaceFn = (
  updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
  options?: UpdateWorkspaceOptions
) => void;

type SetEditingDocumentDraftFn = React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;

type FilemakerDatabase = Parameters<typeof buildCaseResolverCaptureProposalState>[2];
type CaseResolverCaptureSettings = Parameters<typeof buildCaseResolverCaptureProposalState>[3];

export type CaseResolverPromptExploderPendingPayload = PromptExploderBridgePayload & {
  target: 'case-resolver';
};

export type CaseResolverPromptExploderApplyFailureReason =
  | 'no_payload'
  | 'empty_prompt'
  | 'target_file_missing_precheck'
  | 'target_file_missing_mutation_snapshot'
  | 'target_missing_after_refresh';

export type CaseResolverPromptExploderApplyTargetResolutionStrategy =
  | 'requested_id'
  | 'payload_context_id'
  | 'fallback_id'
  | 'requested_name'
  | 'payload_context_name'
  | 'fallback_name'
  | 'unresolved';

export type CaseResolverPromptExploderApplyDiagnostics = {
  applyAttemptId: string;
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
};

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

const normalizeTargetFileName = (value: string | null | undefined): string | null => {
  const normalized = normalizeCandidateId(value);
  if (!normalized) return null;
  return normalized.replace(/\s+/g, ' ').toLowerCase();
};

const resolvePromptExploderApplyTargetFileId = ({
  requestedTargetFileId,
  payloadContextFileId,
  fallbackTargetFileId,
  workspaceFiles,
}: {
  requestedTargetFileId: string | null;
  payloadContextFileId: string | null;
  fallbackTargetFileId: string | null;
  workspaceFiles: CaseResolverWorkspace['files'];
}): {
  resolvedTargetFileId: string | null;
  resolutionStrategy: CaseResolverPromptExploderApplyTargetResolutionStrategy;
} => {
  const fileIdByNormalizedId = new Map<string, string>();
  const fileIdByNormalizedName = new Map<string, string>();
  const duplicateNormalizedNames = new Set<string>();

  workspaceFiles.forEach((file) => {
    const normalizedFileId = normalizeCandidateId(file.id);
    if (normalizedFileId && !fileIdByNormalizedId.has(normalizedFileId)) {
      fileIdByNormalizedId.set(normalizedFileId, file.id);
    }

    const normalizedName = normalizeTargetFileName(file.name);
    if (!normalizedName) return;
    if (duplicateNormalizedNames.has(normalizedName)) return;
    if (fileIdByNormalizedName.has(normalizedName)) {
      fileIdByNormalizedName.delete(normalizedName);
      duplicateNormalizedNames.add(normalizedName);
      return;
    }
    fileIdByNormalizedName.set(normalizedName, file.id);
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

  const normalizedPayloadContextId = normalizeCandidateId(payloadContextFileId);
  if (normalizedPayloadContextId) {
    const match = fileIdByNormalizedId.get(normalizedPayloadContextId);
    if (match) {
      return {
        resolvedTargetFileId: match,
        resolutionStrategy: 'payload_context_id',
      };
    }
  }

  const normalizedFallbackId = normalizeCandidateId(fallbackTargetFileId);
  if (normalizedFallbackId) {
    const match = fileIdByNormalizedId.get(normalizedFallbackId);
    if (match) {
      return {
        resolvedTargetFileId: match,
        resolutionStrategy: 'fallback_id',
      };
    }
  }

  const normalizedRequestedName = normalizeTargetFileName(requestedTargetFileId);
  if (normalizedRequestedName) {
    const match = fileIdByNormalizedName.get(normalizedRequestedName);
    if (match) {
      return {
        resolvedTargetFileId: match,
        resolutionStrategy: 'requested_name',
      };
    }
  }

  const normalizedPayloadContextName = normalizeTargetFileName(payloadContextFileId);
  if (normalizedPayloadContextName) {
    const match = fileIdByNormalizedName.get(normalizedPayloadContextName);
    if (match) {
      return {
        resolvedTargetFileId: match,
        resolutionStrategy: 'payload_context_name',
      };
    }
  }

  const normalizedFallbackName = normalizeTargetFileName(fallbackTargetFileId);
  if (normalizedFallbackName) {
    const match = fileIdByNormalizedName.get(normalizedFallbackName);
    if (match) {
      return {
        resolvedTargetFileId: match,
        resolutionStrategy: 'fallback_name',
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
      (file: CaseResolverFile): boolean =>
        normalizeCandidateId(file.id) === normalizedCandidateId
    ) ?? null
  );
};

const normalizePayloadCreatedAt = (value: string | null | undefined): string =>
  normalizeCandidateId(value) ?? 'missing-created-at';

const buildPromptExploderPayloadKey = (
  payload: PromptExploderBridgePayload
): string =>
  [
    normalizePayloadCreatedAt(payload.createdAt),
    payload.caseResolverContext?.fileId ?? '',
    payload.prompt,
    JSON.stringify(payload.caseResolverParties ?? null),
    JSON.stringify(payload.caseResolverMetadata ?? null),
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

export const readPendingCaseResolverPromptExploderPayload =
(): CaseResolverPromptExploderPendingPayload | null => {
  const payload = toCaseResolverPendingPayload(readPromptExploderApplyPayload());
  if (!payload) return null;
  if (!payload.prompt.trim()) return null;
  return payload;
};

export const discardPendingCaseResolverPromptExploderPayload =
(): CaseResolverPromptExploderPendingPayload | null =>
  toCaseResolverPendingPayload(consumePromptExploderApplyPromptForCaseResolver());

export const applyPendingPromptExploderPayloadToCaseResolver = ({
  payload,
  targetFileId,
  fallbackTargetFileId,
  workspaceFiles,
  updateWorkspace,
  setEditingDocumentDraft,
  filemakerDatabase,
  caseResolverCaptureSettings,
}: {
  payload?: CaseResolverPromptExploderPendingPayload | null;
  targetFileId: string;
  fallbackTargetFileId?: string | null;
  workspaceFiles: CaseResolverWorkspace['files'];
  updateWorkspace: UpdateWorkspaceFn;
  setEditingDocumentDraft: SetEditingDocumentDraftFn;
  filemakerDatabase: FilemakerDatabase;
  caseResolverCaptureSettings: CaseResolverCaptureSettings;
}): CaseResolverPromptExploderApplyResult => {
  const applyAttemptId = createId('case-prompt-apply');
  const payloadToApply = payload ?? readPendingCaseResolverPromptExploderPayload();
  const requestedTargetFileId = normalizeCandidateId(targetFileId);
  const payloadContextFileId = payloadToApply?.caseResolverContext?.fileId ?? null;
  const normalizedFallbackTargetFileId = normalizeCandidateId(fallbackTargetFileId ?? null);
  const payloadKey = payloadToApply ? buildPromptExploderPayloadKey(payloadToApply) : null;
  const hasPartiesPayload = Boolean(payloadToApply?.caseResolverParties);
  const hasMetadataPayload = Boolean(payloadToApply?.caseResolverMetadata?.placeDate);
  const precheckTargetResolution = resolvePromptExploderApplyTargetFileId({
    requestedTargetFileId,
    payloadContextFileId,
    fallbackTargetFileId: normalizedFallbackTargetFileId,
    workspaceFiles,
  });
  const buildDiagnostics = (
    input: Partial<Pick<
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
    >>
  ): CaseResolverPromptExploderApplyDiagnostics => ({
    applyAttemptId,
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

  const now = new Date().toISOString();
  const canonicalExploded = deriveDocumentContentSync({
    mode: 'wysiwyg',
    value: ensureSafeDocumentHtml(nextExplodedContent),
  });
  const explodedStoredContent = toStorageDocumentValue(canonicalExploded);

  const buildExplodedFile = (file: CaseResolverFile): CaseResolverFile => {
    const nextDocumentHistory = [
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
    ].slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT);
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
      createdAt: file.createdAt,
    });
  };

  let mutationResolvedTargetFileId = precheckTargetResolution.resolvedTargetFileId;
  const mutationResolutionStrategy = precheckTargetResolution.resolutionStrategy;
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
    ) ??
    findWorkspaceFileByNormalizedId(workspaceFiles, mutationResolvedTargetFileId);

  if (!mutationSourceFile) {
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: 'target_file_missing_mutation_snapshot',
      diagnostics: buildDiagnostics({
        mutationResolvedTargetFileId: null,
        mutationResolutionStrategy: 'unresolved',
        mutationWorkspaceFileCount,
        resolvedTargetFileId: null,
        resolutionStrategy: 'unresolved',
      }),
    };
  }

  mutationResolvedTargetFileId = mutationSourceFile.id;

  const mutationNextFile = buildExplodedFile(mutationSourceFile);
  const mutationChanged =
    buildCaseResolverFileComparableFingerprint(mutationSourceFile) !==
    buildCaseResolverFileComparableFingerprint(mutationNextFile);

  updateWorkspace((current) => {
    const liveResolution = resolvePromptExploderApplyTargetFileId({
      requestedTargetFileId,
      payloadContextFileId,
      fallbackTargetFileId: normalizedFallbackTargetFileId,
      workspaceFiles: current.files,
    });
    if (!liveResolution.resolvedTargetFileId) {
      return current;
    }

    const liveTargetFileId = liveResolution.resolvedTargetFileId;
    let fileChanged = false;
    const nextFiles = current.files.map((file: CaseResolverFile): CaseResolverFile => {
      if (file.id !== liveTargetFileId) return file;
      const candidate = buildExplodedFile(file);
      if (
        buildCaseResolverFileComparableFingerprint(file) ===
        buildCaseResolverFileComparableFingerprint(candidate)
      ) {
        return file;
      }
      fileChanged = true;
      return candidate;
    });

    const nextActiveFileId =
      current.activeFileId === liveTargetFileId
        ? current.activeFileId
        : liveTargetFileId;
    const activeFileChanged = nextActiveFileId !== current.activeFileId;
    if (!fileChanged && !activeFileChanged) {
      return current;
    }

    return {
      ...current,
      activeFileId: nextActiveFileId,
      files: fileChanged ? nextFiles : current.files,
    };
  }, {
    source: 'prompt_exploder_apply_manual',
    skipNormalization: true,
  });

  setEditingDocumentDraft((current) => {
    if (current?.id !== mutationResolvedTargetFileId) return current;
    return {
      ...mutationNextFile,
      baseDocumentContentVersion: mutationNextFile.documentContentVersion,
    };
  });

  const proposalState = buildCaseResolverCaptureProposalState(
    payloadToApply.caseResolverParties,
    mutationNextFile.id,
    filemakerDatabase,
    caseResolverCaptureSettings,
    {
      metadata: payloadToApply.caseResolverMetadata,
      sourceText: payloadToApply.prompt,
    }
  );

  const consumedPayload = consumePromptExploderApplyPromptForCaseResolver();
  if (consumedPayload) {
    const consumedPayloadKey = buildPromptExploderPayloadKey(consumedPayload);
    if (consumedPayloadKey !== payloadKey) {
      savePromptExploderApplyPromptForCaseResolver(
        consumedPayload.prompt,
        consumedPayload.caseResolverContext ?? null,
        consumedPayload.caseResolverParties ?? null,
        consumedPayload.caseResolverMetadata ?? null
      );
    }
  }

  return {
    applied: true,
    payload: payloadToApply,
    proposalState,
    workspaceChanged: mutationChanged,
    diagnostics: buildDiagnostics({
      mutationResolvedTargetFileId,
      mutationResolutionStrategy,
      mutationWorkspaceFileCount,
      resolvedTargetFileId: mutationResolvedTargetFileId,
      resolutionStrategy: mutationResolutionStrategy,
      proposalBuilt: Boolean(proposalState),
    }),
  };
};

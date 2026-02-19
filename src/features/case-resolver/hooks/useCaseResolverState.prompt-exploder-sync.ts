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

import {
  applyCaseResolverFileMutationAndRebaseDraft,
  CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT,
} from './useCaseResolverState.helpers';
import { createId } from '../utils/caseResolverUtils';

import type {
  CaseResolverFileEditDraft,
  CaseResolverWorkspace,
} from '../types';

type UpdateWorkspaceOptions = {
  persistToast?: string;
  mutationId?: string;
  source?: string;
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
  | 'target_file_missing';

export type CaseResolverPromptExploderApplyResult =
  | {
    applied: true;
    payload: CaseResolverPromptExploderPendingPayload;
    proposalState: CaseResolverCaptureProposalState | null;
    workspaceChanged: boolean;
  }
  | {
    applied: false;
    payload: CaseResolverPromptExploderPendingPayload | null;
    proposalState: null;
    reason: CaseResolverPromptExploderApplyFailureReason;
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
  workspaceFiles,
}: {
  requestedTargetFileId: string | null;
  payloadContextFileId: string | null;
  workspaceFiles: CaseResolverWorkspace['files'];
}): string | null => {
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

  const candidates = [requestedTargetFileId, payloadContextFileId];
  for (const candidate of candidates) {
    const normalizedCandidateId = normalizeCandidateId(candidate);
    if (normalizedCandidateId) {
      const byId = fileIdByNormalizedId.get(normalizedCandidateId);
      if (byId) return byId;
    }

    const normalizedCandidateName = normalizeTargetFileName(candidate);
    if (normalizedCandidateName) {
      const byName = fileIdByNormalizedName.get(normalizedCandidateName);
      if (byName) return byName;
    }
  }

  return null;
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
  workspaceFiles,
  updateWorkspace,
  setEditingDocumentDraft,
  filemakerDatabase,
  caseResolverCaptureSettings,
}: {
  payload?: CaseResolverPromptExploderPendingPayload | null;
  targetFileId: string;
  workspaceFiles: CaseResolverWorkspace['files'];
  updateWorkspace: UpdateWorkspaceFn;
  setEditingDocumentDraft: SetEditingDocumentDraftFn;
  filemakerDatabase: FilemakerDatabase;
  caseResolverCaptureSettings: CaseResolverCaptureSettings;
}): CaseResolverPromptExploderApplyResult => {
  const payloadToApply = payload ?? readPendingCaseResolverPromptExploderPayload();
  if (!payloadToApply) {
    return {
      applied: false,
      payload: null,
      proposalState: null,
      reason: 'no_payload',
    };
  }

  const requestedTargetFileId = normalizeCandidateId(targetFileId);
  const resolvedTargetFileId = resolvePromptExploderApplyTargetFileId({
    requestedTargetFileId,
    payloadContextFileId: payloadToApply.caseResolverContext?.fileId ?? null,
    workspaceFiles,
  });
  if (!resolvedTargetFileId) {
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: 'target_file_missing',
    };
  }

  const nextExplodedContent = payloadToApply.prompt;
  if (!nextExplodedContent.trim()) {
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: 'empty_prompt',
    };
  }

  const now = new Date().toISOString();
  const canonicalExploded = deriveDocumentContentSync({
    mode: 'wysiwyg',
    value: ensureSafeDocumentHtml(nextExplodedContent),
  });
  const explodedStoredContent = toStorageDocumentValue(canonicalExploded);

  const mutationResult = applyCaseResolverFileMutationAndRebaseDraft({
    fileId: resolvedTargetFileId,
    updateWorkspace,
    setEditingDocumentDraft,
    source: 'prompt_exploder_apply_manual',
    activateFile: true,
    mutate: (file) => {
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
      return {
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
      };
    },
  });

  if (!mutationResult.fileFound) {
    return {
      applied: false,
      payload: payloadToApply,
      proposalState: null,
      reason: 'target_file_missing',
    };
  }

  const proposalState = buildCaseResolverCaptureProposalState(
    payloadToApply.caseResolverParties,
    resolvedTargetFileId,
    filemakerDatabase,
    caseResolverCaptureSettings,
    {
      metadata: payloadToApply.caseResolverMetadata,
      sourceText: payloadToApply.prompt,
    }
  );

  const payloadKey = buildPromptExploderPayloadKey(payloadToApply);
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
    workspaceChanged: mutationResult.changed,
  };
};

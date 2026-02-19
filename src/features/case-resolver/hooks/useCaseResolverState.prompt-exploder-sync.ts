import { useEffect, useRef } from 'react';

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

type CaseResolverToast = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'warning' | 'info' }
) => void;

type UpdateWorkspaceOptions = {
  persistToast?: string;
  mutationId?: string;
  source?: string;
};

type UpdateWorkspaceFn = (
  updater: (current: CaseResolverWorkspace) => CaseResolverWorkspace,
  options?: UpdateWorkspaceOptions
) => void;

type FilemakerDatabase = Parameters<typeof buildCaseResolverCaptureProposalState>[2];
type CaseResolverCaptureSettings = Parameters<typeof buildCaseResolverCaptureProposalState>[3];

type UseCaseResolverStatePromptExploderSyncInput = {
  workspaceActiveFileId: string | null;
  workspaceFiles: CaseResolverWorkspace['files'];
  filemakerDatabase: FilemakerDatabase;
  caseResolverCaptureSettings: CaseResolverCaptureSettings;
  updateWorkspace: UpdateWorkspaceFn;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  setPromptExploderPartyProposal: React.Dispatch<React.SetStateAction<CaseResolverCaptureProposalState | null>>;
  setIsApplyingPromptExploderPartyProposal: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPromptExploderPartyProposalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toast: CaseResolverToast;
};

type CaseResolverPromptExploderTargetResolution =
  | {
    status: 'ready';
    targetFileId: string;
    usedActiveFallback: boolean;
  }
  | {
    status: 'pending';
    reason: 'waiting-for-files' | 'context-missing' | 'no-target';
  };

const normalizeCandidateId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildPromptExploderPayloadKey = (
  payload: PromptExploderBridgePayload
): string => [
  payload.createdAt,
  payload.caseResolverContext?.fileId ?? '',
  payload.prompt.slice(0, 64),
].join('|');

const buildNormalizedFileIdMap = (
  workspaceFiles: CaseResolverWorkspace['files']
): Map<string, string> => {
  const fileIdByNormalizedId = new Map<string, string>();
  workspaceFiles.forEach((file) => {
    const normalizedFileId = normalizeCandidateId(file.id);
    if (!normalizedFileId || fileIdByNormalizedId.has(normalizedFileId)) return;
    fileIdByNormalizedId.set(normalizedFileId, file.id);
  });
  return fileIdByNormalizedId;
};

export const resolveCaseResolverPromptExploderTarget = ({
  workspaceActiveFileId,
  workspaceFiles,
  payloadContextFileId,
}: {
  workspaceActiveFileId: string | null;
  workspaceFiles: CaseResolverWorkspace['files'];
  payloadContextFileId: string | null;
}): CaseResolverPromptExploderTargetResolution => {
  const fileIdByNormalizedId = buildNormalizedFileIdMap(workspaceFiles);
  const contextFileId = normalizeCandidateId(payloadContextFileId);
  if (contextFileId && fileIdByNormalizedId.has(contextFileId)) {
    return {
      status: 'ready',
      targetFileId: fileIdByNormalizedId.get(contextFileId) ?? contextFileId,
      usedActiveFallback: false,
    };
  }

  const activeFileId = normalizeCandidateId(workspaceActiveFileId);
  if (activeFileId && fileIdByNormalizedId.has(activeFileId)) {
    return {
      status: 'ready',
      targetFileId: fileIdByNormalizedId.get(activeFileId) ?? activeFileId,
      usedActiveFallback: Boolean(contextFileId && contextFileId !== activeFileId),
    };
  }

  if (fileIdByNormalizedId.size === 0) {
    return {
      status: 'pending',
      reason: 'waiting-for-files',
    };
  }
  if (contextFileId && !fileIdByNormalizedId.has(contextFileId)) {
    return {
      status: 'pending',
      reason: 'context-missing',
    };
  }
  return {
    status: 'pending',
    reason: 'no-target',
  };
};

export const resolveCaseResolverPromptExploderFallbackTarget = ({
  workspaceActiveFileId,
  workspaceFiles,
  excludedFileId,
}: {
  workspaceActiveFileId: string | null;
  workspaceFiles: CaseResolverWorkspace['files'];
  excludedFileId: string;
}): string | null => {
  const fileIdByNormalizedId = buildNormalizedFileIdMap(workspaceFiles);
  const excludedNormalizedFileId = normalizeCandidateId(excludedFileId);

  const activeFileId = normalizeCandidateId(workspaceActiveFileId);
  if (
    activeFileId &&
    activeFileId !== excludedNormalizedFileId &&
    fileIdByNormalizedId.has(activeFileId)
  ) {
    return fileIdByNormalizedId.get(activeFileId) ?? null;
  }

  const firstDocumentLikeFile = workspaceFiles.find((file) => {
    const normalizedId = normalizeCandidateId(file.id);
    if (!normalizedId || normalizedId === excludedNormalizedFileId) return false;
    return file.fileType === 'document' || file.fileType === 'scanfile';
  });
  if (firstDocumentLikeFile) return firstDocumentLikeFile.id;

  const firstDifferentFile = workspaceFiles.find((file) => {
    const normalizedId = normalizeCandidateId(file.id);
    return Boolean(normalizedId && normalizedId !== excludedNormalizedFileId);
  });
  return firstDifferentFile?.id ?? null;
};

export const useCaseResolverStatePromptExploderSync = ({
  workspaceActiveFileId,
  workspaceFiles,
  filemakerDatabase,
  caseResolverCaptureSettings,
  updateWorkspace,
  setEditingDocumentDraft,
  setPromptExploderPartyProposal,
  setIsApplyingPromptExploderPartyProposal,
  setIsPromptExploderPartyProposalOpen,
  toast,
}: UseCaseResolverStatePromptExploderSyncInput): void => {
  const filemakerDatabaseRef = useRef(filemakerDatabase);
  filemakerDatabaseRef.current = filemakerDatabase;
  const caseResolverCaptureSettingsRef = useRef(caseResolverCaptureSettings);
  caseResolverCaptureSettingsRef.current = caseResolverCaptureSettings;
  const unresolvedPayloadKeyRef = useRef<string | null>(null);
  const fallbackPayloadKeyRef = useRef<string | null>(null);
  const appliedPayloadKeyRef = useRef<string | null>(null);
  const missingTargetPayloadKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const payload = readPromptExploderApplyPayload();
    if (payload?.target !== 'case-resolver') return;
    if (!payload.prompt?.trim()) {
      consumePromptExploderApplyPromptForCaseResolver();
      return;
    }

    const payloadKey = buildPromptExploderPayloadKey(payload);
    if (appliedPayloadKeyRef.current === payloadKey) {
      consumePromptExploderApplyPromptForCaseResolver();
      return;
    }
    const targetResolution = resolveCaseResolverPromptExploderTarget({
      workspaceActiveFileId,
      workspaceFiles,
      payloadContextFileId: payload.caseResolverContext?.fileId ?? null,
    });
    if (targetResolution.status !== 'ready') {
      if (targetResolution.reason === 'waiting-for-files') return;
      if (unresolvedPayloadKeyRef.current === payloadKey) return;
      unresolvedPayloadKeyRef.current = payloadKey;
      if (targetResolution.reason === 'context-missing') {
        toast(
          'Prompt Exploder output is pending. Source file is missing, so open/select a destination document to apply it.',
          { variant: 'warning' }
        );
      } else {
        toast('Prompt Exploder output is pending. Select a document to apply it.', {
          variant: 'info',
        });
      }
      return;
    }
    unresolvedPayloadKeyRef.current = null;

    const payloadToApply = payload;
    const targetFileId = targetResolution.targetFileId;
    const nextExplodedContent = payloadToApply.prompt;
    const now = new Date().toISOString();
    const canonicalExploded = deriveDocumentContentSync({
      mode: 'wysiwyg',
      value: ensureSafeDocumentHtml(nextExplodedContent),
    });
    const explodedStoredContent = toStorageDocumentValue(canonicalExploded);

    const applyExplodedContentToFile = (fileId: string) =>
      applyCaseResolverFileMutationAndRebaseDraft({
        fileId,
        updateWorkspace,
        setEditingDocumentDraft,
        source: 'prompt_exploder_apply',
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

    let appliedTargetFileId = targetFileId;
    let usedMutationFallback = false;
    let mutationResult = applyExplodedContentToFile(appliedTargetFileId);
    if (!mutationResult.fileFound) {
      const fallbackTargetFileId = resolveCaseResolverPromptExploderFallbackTarget({
        workspaceActiveFileId,
        workspaceFiles,
        excludedFileId: appliedTargetFileId,
      });
      if (fallbackTargetFileId) {
        const fallbackMutationResult = applyExplodedContentToFile(fallbackTargetFileId);
        if (fallbackMutationResult.fileFound) {
          mutationResult = fallbackMutationResult;
          appliedTargetFileId = fallbackTargetFileId;
          usedMutationFallback = true;
        }
      }
    }
    if (!mutationResult.fileFound) {
      if (missingTargetPayloadKeyRef.current !== payloadKey) {
        missingTargetPayloadKeyRef.current = payloadKey;
        toast('Prompt Exploder output could not be applied because target file was not found.', {
          variant: 'warning',
        });
      }
      return;
    }
    missingTargetPayloadKeyRef.current = null;

    const proposalState = buildCaseResolverCaptureProposalState(
      payloadToApply.caseResolverParties,
      appliedTargetFileId,
      filemakerDatabaseRef.current,
      caseResolverCaptureSettingsRef.current,
      {
        metadata: payloadToApply.caseResolverMetadata,
        sourceText: payloadToApply.prompt,
      }
    );

    const latestPayload = readPromptExploderApplyPayload();
    if (
      latestPayload?.target === 'case-resolver' &&
      buildPromptExploderPayloadKey(latestPayload) === payloadKey
    ) {
      consumePromptExploderApplyPromptForCaseResolver();
    }
    appliedPayloadKeyRef.current = payloadKey;

    if (proposalState) {
      setPromptExploderPartyProposal(proposalState);
      setIsApplyingPromptExploderPartyProposal(false);
      if (caseResolverCaptureSettingsRef.current.autoOpenProposalModal) {
        setIsPromptExploderPartyProposalOpen(true);
      }
    } else {
      setPromptExploderPartyProposal(null);
      setIsPromptExploderPartyProposalOpen(false);
      setIsApplyingPromptExploderPartyProposal(false);
    }
    if (targetResolution.usedActiveFallback || usedMutationFallback) {
      if (fallbackPayloadKeyRef.current !== payloadKey) {
        fallbackPayloadKeyRef.current = payloadKey;
        if (targetResolution.usedActiveFallback) {
          toast('Exploded text applied to the active document (source file was unavailable).', {
            variant: 'warning',
          });
        } else {
          toast('Exploded text applied to a fallback document (original target became unavailable).', {
            variant: 'warning',
          });
        }
      }
      return;
    }
    fallbackPayloadKeyRef.current = null;
    toast('Exploded text returned to Case Resolver.', { variant: 'success' });
  }, [
    setEditingDocumentDraft,
    setIsApplyingPromptExploderPartyProposal,
    setIsPromptExploderPartyProposalOpen,
    setPromptExploderPartyProposal,
    toast,
    workspaceActiveFileId,
    workspaceFiles,
    updateWorkspace,
  ]);
};

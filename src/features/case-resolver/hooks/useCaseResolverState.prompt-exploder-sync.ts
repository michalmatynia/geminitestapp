import { useEffect, useRef } from 'react';

import {
  buildCaseResolverCaptureProposalState,
  stripCapturedAddressLinesFromText,
  type CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  deriveDocumentContentSync,
  toStorageDocumentValue,
} from '@/features/document-editor/content-format';
import {
  consumePromptExploderApplyPromptForCaseResolver,
  readPromptExploderApplyPayload,
} from '@/features/prompt-exploder/bridge';

import { extractCaseResolverDocumentDate } from '../settings';
import { CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT } from './useCaseResolverState.helpers';
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

export const resolveCaseResolverPromptExploderTarget = ({
  workspaceActiveFileId,
  workspaceFiles,
  payloadContextFileId,
}: {
  workspaceActiveFileId: string | null;
  workspaceFiles: CaseResolverWorkspace['files'];
  payloadContextFileId: string | null;
}): CaseResolverPromptExploderTargetResolution => {
  const fileIdSet = new Set(
    workspaceFiles
      .map((file) => normalizeCandidateId(file.id))
      .filter((id): id is string => id !== null)
  );
  const contextFileId = normalizeCandidateId(payloadContextFileId);
  if (contextFileId && fileIdSet.has(contextFileId)) {
    return {
      status: 'ready',
      targetFileId: contextFileId,
      usedActiveFallback: false,
    };
  }

  const activeFileId = normalizeCandidateId(workspaceActiveFileId);
  if (activeFileId && fileIdSet.has(activeFileId)) {
    return {
      status: 'ready',
      targetFileId: activeFileId,
      usedActiveFallback: Boolean(contextFileId && contextFileId !== activeFileId),
    };
  }

  if (fileIdSet.size === 0) {
    return {
      status: 'pending',
      reason: 'waiting-for-files',
    };
  }
  if (contextFileId && !fileIdSet.has(contextFileId)) {
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

  useEffect(() => {
    const payload = readPromptExploderApplyPayload();
    if (payload?.target !== 'case-resolver') return;
    if (!payload.prompt?.trim()) {
      consumePromptExploderApplyPromptForCaseResolver();
      return;
    }

    const payloadKey = [
      payload.createdAt,
      payload.caseResolverContext?.fileId ?? '',
      payload.prompt.slice(0, 64),
    ].join('|');
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

    const payloadToApply = consumePromptExploderApplyPromptForCaseResolver();
    if (!payloadToApply?.prompt?.trim()) return;
    appliedPayloadKeyRef.current = payloadKey;
    const targetFileId = targetResolution.targetFileId;

    const proposalState = buildCaseResolverCaptureProposalState(
      payloadToApply.caseResolverParties,
      targetFileId,
      filemakerDatabaseRef.current,
      caseResolverCaptureSettingsRef.current
    );
    const nextExplodedContent = stripCapturedAddressLinesFromText(
      payloadToApply.prompt,
      proposalState
    );
    const extractedDocumentDate = extractCaseResolverDocumentDate(nextExplodedContent);
    const now = new Date().toISOString();
    const canonicalExploded = deriveDocumentContentSync({
      mode: 'markdown',
      value: nextExplodedContent,
    });
    const explodedStoredContent = toStorageDocumentValue(canonicalExploded);

    updateWorkspace((current) => ({
      ...current,
      activeFileId: targetFileId,
      files: current.files.map((file) => {
        if (file.id !== targetFileId) return file;
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
          documentDate: extractedDocumentDate ?? file.documentDate,
          updatedAt: now,
        };
      }),
    }));

    setEditingDocumentDraft((current) => {
      if (current?.id !== targetFileId) return current;
      const currentVersion = current.documentContentVersion ?? 0;
      const nextVersion = currentVersion + 1;
      const normalizedHistory = (current.documentHistory ?? []).map((entry) => ({
        id: entry.id,
        savedAt: entry.savedAt,
        documentContentVersion: entry.documentContentVersion,
        activeDocumentVersion: entry.activeDocumentVersion ?? 'original',
        editorType: entry.editorType ?? 'wysiwyg',
        documentContent: entry.documentContent ?? '',
        documentContentMarkdown: entry.documentContentMarkdown ?? '',
        documentContentHtml: entry.documentContentHtml ?? '',
        documentContentPlainText: entry.documentContentPlainText ?? '',
      }));
      const nextDocumentHistory = [
        {
          id: createId('case-doc-history'),
          savedAt: now,
          documentContentVersion: currentVersion,
          activeDocumentVersion: current.activeDocumentVersion ?? 'original',
          editorType: current.editorType ?? 'wysiwyg',
          documentContent: current.documentContent ?? '',
          documentContentMarkdown: current.documentContentMarkdown ?? '',
          documentContentHtml: current.documentContentHtml ?? '',
          documentContentPlainText: current.documentContentPlainText ?? '',
        },
        ...normalizedHistory,
      ].slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT);
      return {
        ...current,
        originalDocumentContent: current.originalDocumentContent ?? current.documentContent ?? '',
        explodedDocumentContent: explodedStoredContent,
        activeDocumentVersion: 'exploded',
        editorType: canonicalExploded.mode,
        documentContentFormatVersion: 1,
        documentContentVersion: nextVersion,
        baseDocumentContentVersion: nextVersion,
        documentContent: explodedStoredContent,
        documentContentMarkdown: canonicalExploded.markdown,
        documentContentHtml: canonicalExploded.html,
        documentContentPlainText: canonicalExploded.plainText,
        documentHistory: nextDocumentHistory,
        documentConversionWarnings: canonicalExploded.warnings,
        lastContentConversionAt: now,
        documentDate: extractedDocumentDate ?? current.documentDate ?? '',
      };
    });

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
    if (targetResolution.usedActiveFallback) {
      if (fallbackPayloadKeyRef.current !== payloadKey) {
        fallbackPayloadKeyRef.current = payloadKey;
        toast('Exploded text applied to the active document (source file was unavailable).', {
          variant: 'warning',
        });
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

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
import { consumePromptExploderApplyPromptForCaseResolver } from '@/features/prompt-exploder/bridge';

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
  filemakerDatabase: FilemakerDatabase;
  caseResolverCaptureSettings: CaseResolverCaptureSettings;
  updateWorkspace: UpdateWorkspaceFn;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  setPromptExploderPartyProposal: React.Dispatch<React.SetStateAction<CaseResolverCaptureProposalState | null>>;
  setIsApplyingPromptExploderPartyProposal: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPromptExploderPartyProposalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toast: CaseResolverToast;
};

export const useCaseResolverStatePromptExploderSync = ({
  workspaceActiveFileId,
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

  useEffect(() => {
    const payload = consumePromptExploderApplyPromptForCaseResolver();
    if (!payload?.prompt?.trim()) return;

    const targetFileId = payload.caseResolverContext?.fileId ?? workspaceActiveFileId ?? null;
    if (!targetFileId) return;

    const proposalState = buildCaseResolverCaptureProposalState(
      payload.caseResolverParties,
      targetFileId,
      filemakerDatabaseRef.current,
      caseResolverCaptureSettingsRef.current
    );
    const nextExplodedContent = stripCapturedAddressLinesFromText(payload.prompt, proposalState);
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
      const nextVersion = current.documentContentVersion + 1;
      const nextDocumentHistory = [
        {
          id: createId('case-doc-history'),
          savedAt: now,
          documentContentVersion: current.documentContentVersion,
          activeDocumentVersion: current.activeDocumentVersion,
          editorType: current.editorType,
          documentContent: current.documentContent,
          documentContentMarkdown: current.documentContentMarkdown,
          documentContentHtml: current.documentContentHtml,
          documentContentPlainText: current.documentContentPlainText,
        },
        ...current.documentHistory,
      ].slice(0, CASE_RESOLVER_DOCUMENT_HISTORY_LIMIT);
      return {
        ...current,
        originalDocumentContent: current.originalDocumentContent || current.documentContent,
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
        documentDate: extractedDocumentDate ?? current.documentDate,
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
    toast('Exploded text returned to Case Resolver.', { variant: 'success' });
  }, [
    setEditingDocumentDraft,
    setIsApplyingPromptExploderPartyProposal,
    setIsPromptExploderPartyProposalOpen,
    setPromptExploderPartyProposal,
    toast,
    workspaceActiveFileId,
    updateWorkspace,
  ]);
};

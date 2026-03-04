'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  CaseResolverCaptureProposalState,
  CaseResolverCaptureProposal,
  CaseResolverCaptureDocumentDateAction,
} from '@/features/case-resolver-capture/proposals';
import type { CaseResolverCaptureAction } from '@/features/case-resolver-capture/settings';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { decodeFilemakerPartyReference } from '@/features/filemaker/settings';
import { logCaseResolverWorkspaceEvent } from '../../workspace-persistence';
import { useToast } from '@/shared/ui';

export function useCaptureProposalState(args: {
  workspace: CaseResolverWorkspace;
  isPromptExploderPartyProposalOpen: boolean;
  setIsPromptExploderPartyProposalOpen: (val: boolean) => void;
  promptExploderPartyProposal: CaseResolverCaptureProposalState | null;
  setPromptExploderPartyProposal: (val: CaseResolverCaptureProposalState | null) => void;
  isApplyingPromptExploderPartyProposal: boolean;
}) {
  const { toast } = useToast();
  const [promptExploderProposalDraft, setPromptExploderProposalDraft] =
    useState<CaseResolverCaptureProposalState | null>(null);

  const captureMappingDismissedRef = useRef(false);
  const captureMappingDismissToastShownRef = useRef(false);

  const captureProposalTargetFileName = useMemo(() => {
    if (!promptExploderProposalDraft) return null;
    const targetFile = args.workspace.files.find(
      (file) => file.id === promptExploderProposalDraft.targetFileId
    );
    return targetFile?.name ?? promptExploderProposalDraft.targetFileId;
  }, [promptExploderProposalDraft, args.workspace.files]);

  useEffect(() => {
    if (!args.isPromptExploderPartyProposalOpen) return;
    captureMappingDismissedRef.current = false;
    captureMappingDismissToastShownRef.current = false;
  }, [args.isPromptExploderPartyProposalOpen]);

  useEffect(() => {
    if (!args.isPromptExploderPartyProposalOpen || !args.promptExploderPartyProposal) {
      setPromptExploderProposalDraft(null);
      return;
    }
    setPromptExploderProposalDraft({
      targetFileId: args.promptExploderPartyProposal.targetFileId,
      addresser: args.promptExploderPartyProposal.addresser
        ? {
          ...args.promptExploderPartyProposal.addresser,
          candidate: { ...args.promptExploderPartyProposal.addresser.candidate },
          existingReference: args.promptExploderPartyProposal.addresser.existingReference
            ? { ...args.promptExploderPartyProposal.addresser.existingReference }
            : null,
        }
        : null,
      addressee: args.promptExploderPartyProposal.addressee
        ? {
          ...args.promptExploderPartyProposal.addressee,
          candidate: { ...args.promptExploderPartyProposal.addressee.candidate },
          existingReference: args.promptExploderPartyProposal.addressee.existingReference
            ? { ...args.promptExploderPartyProposal.addressee.existingReference }
            : null,
        }
        : null,
      documentDate: args.promptExploderPartyProposal.documentDate
        ? {
          ...args.promptExploderPartyProposal.documentDate,
        }
        : null,
    });
  }, [args.isPromptExploderPartyProposalOpen, args.promptExploderPartyProposal]);

  const handleClosePromptExploderProposalModal = useCallback((): void => {
    if (args.isApplyingPromptExploderPartyProposal) return;
    if (captureMappingDismissedRef.current) return;
    captureMappingDismissedRef.current = true;
    args.setIsPromptExploderPartyProposalOpen(false);
    setPromptExploderProposalDraft(null);
    args.setPromptExploderPartyProposal(null);
    if (!captureMappingDismissToastShownRef.current) {
      captureMappingDismissToastShownRef.current = true;
      toast('Capture mapping dismissed. No party/city/date fields were changed.', {
        variant: 'info',
      });
    }
    logCaseResolverWorkspaceEvent({
      source: 'capture_mapping_apply',
      action: 'capture_mapping_dismissed',
      message: JSON.stringify({
        targetFileId: promptExploderProposalDraft?.targetFileId ?? null,
      }),
    });
  }, [
    args.isApplyingPromptExploderPartyProposal,
    args.setIsPromptExploderPartyProposalOpen,
    args.setPromptExploderPartyProposal,
    promptExploderProposalDraft?.targetFileId,
    toast,
  ]);

  const updatePromptExploderProposalAction = useCallback(
    (role: 'addresser' | 'addressee', action: CaseResolverCaptureAction): void => {
      setPromptExploderProposalDraft((current) => {
        if (!current) return current;
        const roleProposal: CaseResolverCaptureProposal | null = current[role];
        if (!roleProposal) return current;
        return {
          ...current,
          [role]: {
            ...roleProposal,
            action,
          },
        };
      });
    },
    []
  );

  const updatePromptExploderProposalReference = useCallback(
    (role: 'addresser' | 'addressee', encodedReference: string): void => {
      setPromptExploderProposalDraft((current) => {
        if (!current) return current;
        const roleProposal: CaseResolverCaptureProposal | null = current[role];
        if (!roleProposal) return current;
        return {
          ...current,
          [role]: {
            ...roleProposal,
            existingReference: decodeFilemakerPartyReference(encodedReference),
          },
        };
      });
    },
    []
  );

  const updatePromptExploderProposalDateAction = useCallback(
    (action: CaseResolverCaptureDocumentDateAction): void => {
      setPromptExploderProposalDraft((current) => {
        if (!current?.documentDate) return current;
        return {
          ...current,
          documentDate: {
            ...current.documentDate,
            action,
          },
        };
      });
    },
    []
  );

  return {
    promptExploderProposalDraft,
    setPromptExploderProposalDraft,
    captureMappingDismissedRef,
    captureProposalTargetFileName,
    handleClosePromptExploderProposalModal,
    updatePromptExploderProposalAction,
    updatePromptExploderProposalReference,
    updatePromptExploderProposalDateAction,
  };
}

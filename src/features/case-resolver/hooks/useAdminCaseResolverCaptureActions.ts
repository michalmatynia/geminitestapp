'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { CaseResolverCaptureProposalState } from '@/features/case-resolver-capture/proposals';
import type { FilemakerDatabase } from '@/shared/contracts/filemaker';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { useCaptureProposalState } from './capture-actions/useCaptureProposalState';
import { useApplyCaptureProposal } from './capture-actions/useApplyCaptureProposal';
import { type CaseResolverFileEditDraft } from '../types';

export function useAdminCaseResolverCaptureActions({
  workspace,
  workspaceRef,
  filemakerDatabase,
  isPromptExploderPartyProposalOpen,
  setIsPromptExploderPartyProposalOpen,
  promptExploderPartyProposal,
  setPromptExploderPartyProposal,
  isApplyingPromptExploderPartyProposal,
  setIsApplyingPromptExploderPartyProposal,
  editingDocumentDraft,
  setEditingDocumentDraft,
  updateWorkspace,
  refetchSettingsStore,
  setEditorContentRevisionSeed,
}: {
  workspace: CaseResolverWorkspace;
  workspaceRef: React.MutableRefObject<CaseResolverWorkspace>;
  filemakerDatabase: FilemakerDatabase;
  isPromptExploderPartyProposalOpen: boolean;
  setIsPromptExploderPartyProposalOpen: (val: boolean) => void;
  promptExploderPartyProposal: CaseResolverCaptureProposalState | null;
  setPromptExploderPartyProposal: (val: CaseResolverCaptureProposalState | null) => void;
  isApplyingPromptExploderPartyProposal: boolean;
  setIsApplyingPromptExploderPartyProposal: (val: boolean) => void;
  editingDocumentDraft: CaseResolverFileEditDraft | null;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  updateWorkspace: any;
  refetchSettingsStore: () => void;
  setEditorContentRevisionSeed: React.Dispatch<React.SetStateAction<number>>;
}) {
  const state = useCaptureProposalState({
    workspace,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
    isApplyingPromptExploderPartyProposal,
  });

  const apply = useApplyCaptureProposal({
    workspaceRef,
    filemakerDatabase,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    promptExploderPartyProposal,
    setPromptExploderPartyProposal,
    setIsApplyingPromptExploderPartyProposal,
    editingDocumentDraft,
    setEditingDocumentDraft,
    updateWorkspace,
    refetchSettingsStore,
    setEditorContentRevisionSeed,
    promptExploderProposalDraft: state.promptExploderProposalDraft,
    setPromptExploderProposalDraft: state.setPromptExploderProposalDraft,
    captureMappingDismissedRef: state.captureMappingDismissedRef,
  });

  return {
    captureApplyDiagnostics: apply.captureApplyDiagnostics,
    promptExploderProposalDraft: state.promptExploderProposalDraft,
    captureProposalTargetFileName: state.captureProposalTargetFileName,
    handleClosePromptExploderProposalModal: state.handleClosePromptExploderProposalModal,
    updatePromptExploderProposalAction: state.updatePromptExploderProposalAction,
    updatePromptExploderProposalReference: state.updatePromptExploderProposalReference,
    updatePromptExploderProposalDateAction: state.updatePromptExploderProposalDateAction,
    handleApplyPromptExploderProposal: apply.handleApplyPromptExploderProposal,
  };
}

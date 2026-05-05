import type { CaseResolverCaptureProposalState } from '@/features/case-resolver/capture/public';
import type { CaseResolverFileEditDraft, CaseResolverStateValue } from '../../types';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver/workspace';
import type { FilemakerDatabase } from '@/shared/contracts/filemaker';

export interface UseApplyCaptureProposalArgs {
  workspaceRef: React.MutableRefObject<CaseResolverWorkspace>;
  filemakerDatabase: FilemakerDatabase;
  isPromptExploderPartyProposalOpen: boolean;
  setIsPromptExploderPartyProposalOpen: (val: boolean) => void;
  promptExploderPartyProposal: CaseResolverCaptureProposalState | null;
  setPromptExploderPartyProposal: (val: CaseResolverCaptureProposalState | null) => void;
  setIsApplyingPromptExploderPartyProposal: (val: boolean) => void;
  editingDocumentDraft: CaseResolverFileEditDraft | null;
  setEditingDocumentDraft: React.Dispatch<React.SetStateAction<CaseResolverFileEditDraft | null>>;
  updateWorkspace: CaseResolverStateValue['updateWorkspace'];
  refetchSettingsStore: () => void;
  setEditorContentRevisionSeed: React.Dispatch<React.SetStateAction<number>>;
  promptExploderProposalDraft: CaseResolverCaptureProposalState | null;
  setPromptExploderProposalDraft: (val: CaseResolverCaptureProposalState | null) => void;
  captureMappingDismissedRef: React.MutableRefObject<boolean>;
}

export interface CaptureApplyDiagnostics {
    status: 'idle' | 'success' | 'failed';
    stage: 'precheck' | 'mutation' | 'rebase' | null;
    message: string;
    targetFileId: string | null;
    resolvedTargetFileId: string | null;
    workspaceRevision: number;
    attempts: number;
    at: string;
    cleanupDurationMs?: number | null;
    mutationDurationMs?: number | null;
    totalDurationMs?: number | null;
}

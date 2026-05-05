import type { CaseResolverCaptureProposalState } from '@/features/case-resolver/capture/public';
import type { CaseResolverPromptExploderApplyUiDiagnostics, CaseResolverPromptExploderPendingPayload } from '../useCaseResolverState.prompt-exploder-sync';
import type { PromptExploderTransferUiStatus } from './prompt-exploder-transfer-lifecycle';

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

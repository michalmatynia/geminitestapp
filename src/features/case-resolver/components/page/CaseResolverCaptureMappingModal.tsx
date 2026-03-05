'use client';

import React from 'react';
import { PromptExploderCaptureMappingModal } from '../PromptExploderCaptureMappingModal';
import {
  useCaseResolverViewActionsContext,
  useCaseResolverViewStateContext,
} from '../CaseResolverViewContext';

export function CaseResolverCaptureMappingModal(): React.JSX.Element {
  const {
    state,
    promptExploderProposalDraft,
    captureProposalTargetFileName,
    captureApplyDiagnostics,
    partyOptions,
  } = useCaseResolverViewStateContext();
  const {
    handleClosePromptExploderProposalModal,
    handleApplyPromptExploderProposal,
    updatePromptExploderProposalAction,
    updatePromptExploderProposalReference,
    updatePromptExploderProposalDateAction,
    resolvePromptExploderMatchedPartyLabel,
  } = useCaseResolverViewActionsContext();

  const { isPromptExploderPartyProposalOpen, isApplyingPromptExploderPartyProposal } = state;

  return (
    <PromptExploderCaptureMappingModal
      open={isPromptExploderPartyProposalOpen}
      draft={promptExploderProposalDraft}
      applying={isApplyingPromptExploderPartyProposal}
      targetFileName={captureProposalTargetFileName}
      partyOptions={partyOptions}
      onClose={handleClosePromptExploderProposalModal}
      onApply={handleApplyPromptExploderProposal}
      onUpdateAction={updatePromptExploderProposalAction}
      onUpdateReference={updatePromptExploderProposalReference}
      onUpdateDateAction={updatePromptExploderProposalDateAction}
      resolveMatchedPartyLabel={resolvePromptExploderMatchedPartyLabel}
      diagnostics={captureApplyDiagnostics}
    />
  );
}

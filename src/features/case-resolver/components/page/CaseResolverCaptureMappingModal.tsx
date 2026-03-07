'use client';

import React from 'react';
import { PromptExploderCaptureMappingModal } from '../PromptExploderCaptureMappingModal';
import {
  PromptExploderCaptureMappingModalRuntimeProvider,
  type PromptExploderCaptureMappingModalRuntimeValue,
} from '../PromptExploderCaptureMappingModalRuntimeContext';
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
  const runtimeValue = React.useMemo<PromptExploderCaptureMappingModalRuntimeValue>(
    () => ({
      open: isPromptExploderPartyProposalOpen,
      draft: promptExploderProposalDraft,
      applying: isApplyingPromptExploderPartyProposal,
      targetFileName: captureProposalTargetFileName,
      partyOptions,
      onClose: handleClosePromptExploderProposalModal,
      onApply: handleApplyPromptExploderProposal,
      onUpdateAction: updatePromptExploderProposalAction,
      onUpdateReference: updatePromptExploderProposalReference,
      onUpdateDateAction: updatePromptExploderProposalDateAction,
      resolveMatchedPartyLabel: resolvePromptExploderMatchedPartyLabel,
      diagnostics: captureApplyDiagnostics,
    }),
    [
      isPromptExploderPartyProposalOpen,
      promptExploderProposalDraft,
      isApplyingPromptExploderPartyProposal,
      captureProposalTargetFileName,
      partyOptions,
      handleClosePromptExploderProposalModal,
      handleApplyPromptExploderProposal,
      updatePromptExploderProposalAction,
      updatePromptExploderProposalReference,
      updatePromptExploderProposalDateAction,
      resolvePromptExploderMatchedPartyLabel,
      captureApplyDiagnostics,
    ]
  );

  return (
    <PromptExploderCaptureMappingModalRuntimeProvider value={runtimeValue}>
      <PromptExploderCaptureMappingModal />
    </PromptExploderCaptureMappingModalRuntimeProvider>
  );
}

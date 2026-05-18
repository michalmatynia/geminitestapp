'use client';

import { useToast } from '@/shared/ui';

import type { UseSocialCaptureFlowsProps } from '../SocialPublishingPage.types';
import { useAttachBatchCaptureResultToActiveDraft } from './useSocialCaptureFlows.attach';
import { useSocialCaptureOnlyFlow } from './useSocialCaptureFlows.capture-only';
import { useBatchCaptureJobWaiter } from './useSocialCaptureFlows.polling';
import { useSocialProgrammableCaptureFlow } from './useSocialCaptureFlows.programmable-flow';
import { useSocialProgrammableCaptureState } from './useSocialCaptureFlows.programmable-state';
import type {
  AttachBatchCaptureResult,
  SocialCaptureFlowsResult,
  WaitForBatchCaptureJob,
} from './useSocialCaptureFlows.types';

type BuildSocialCaptureFlowsResultParams = {
  captureOnly: ReturnType<typeof useSocialCaptureOnlyFlow>;
  programmableState: ReturnType<typeof useSocialProgrammableCaptureState>;
  programmableFlow: ReturnType<typeof useSocialProgrammableCaptureFlow>;
  attachBatchCaptureResultToActiveDraft: AttachBatchCaptureResult;
  waitForBatchCaptureJob: WaitForBatchCaptureJob;
};

const buildSocialCaptureFlowsResult = ({
  captureOnly,
  programmableState,
  programmableFlow,
  attachBatchCaptureResultToActiveDraft,
  waitForBatchCaptureJob,
}: BuildSocialCaptureFlowsResultParams): SocialCaptureFlowsResult => ({
  captureOnlyPending: captureOnly.captureOnlyPending,
  captureOnlyBatchCaptureJob: captureOnly.captureOnlyBatchCaptureJob,
  captureOnlyMessage: captureOnly.captureOnlyMessage,
  captureOnlyErrorMessage: captureOnly.captureOnlyErrorMessage,
  handleCaptureImagesOnly: captureOnly.handleCaptureImagesOnly,
  isProgrammablePlaywrightModalOpen: programmableState.isProgrammablePlaywrightModalOpen,
  programmableCaptureBaseUrl: programmableState.programmableCaptureBaseUrl,
  setProgrammableCaptureBaseUrl: programmableState.setProgrammableCaptureBaseUrl,
  programmableCapturePersonaId: programmableState.programmableCapturePersonaId,
  setProgrammableCapturePersonaId: programmableState.setProgrammableCapturePersonaId,
  programmableCaptureScript: programmableState.programmableCaptureScript,
  setProgrammableCaptureScript: programmableState.setProgrammableCaptureScript,
  programmableCaptureRoutes: programmableState.programmableCaptureRoutes,
  programmableCapturePending: programmableState.programmableCapturePending,
  programmableCaptureBatchCaptureJob: programmableState.programmableCaptureBatchCaptureJob,
  programmableCaptureMessage: programmableState.programmableCaptureMessage,
  programmableCaptureErrorMessage: programmableState.programmableCaptureErrorMessage,
  handleOpenProgrammablePlaywrightModal: programmableState.handleOpenProgrammablePlaywrightModal,
  handleOpenProgrammablePlaywrightModalFromDefaults:
    programmableState.handleOpenProgrammablePlaywrightModalFromDefaults,
  handleCloseProgrammablePlaywrightModal: programmableState.handleCloseProgrammablePlaywrightModal,
  handleAddProgrammableCaptureRoute: programmableState.handleAddProgrammableCaptureRoute,
  handleUpdateProgrammableCaptureRoute: programmableState.handleUpdateProgrammableCaptureRoute,
  handleRemoveProgrammableCaptureRoute: programmableState.handleRemoveProgrammableCaptureRoute,
  handleSeedProgrammableCaptureRoutesFromPresets:
    programmableState.handleSeedProgrammableCaptureRoutesFromPresets,
  handleResetProgrammableCaptureScript: programmableState.handleResetProgrammableCaptureScript,
  handleSaveProgrammableCaptureDefaults: programmableState.handleSaveProgrammableCaptureDefaults,
  handleResetProgrammableCaptureDefaults: programmableState.handleResetProgrammableCaptureDefaults,
  handleRunProgrammablePlaywrightCapture: programmableFlow.handleRunProgrammablePlaywrightCapture,
  handleRunProgrammablePlaywrightCaptureAndPipeline:
    programmableFlow.handleRunProgrammablePlaywrightCaptureAndPipeline,
  handleRetryFailedProgrammableCaptureJob: programmableFlow.handleRetryFailedProgrammableCaptureJob,
  attachBatchCaptureResultToActiveDraft,
  waitForBatchCaptureJob,
});

export function useSocialCaptureFlows(
  props: UseSocialCaptureFlowsProps
): SocialCaptureFlowsResult {
  const { toast } = useToast();
  const attachBatchCaptureResultToActiveDraft = useAttachBatchCaptureResultToActiveDraft({
    crud: props.crud,
    editor: props.editor,
  });
  const waitForBatchCaptureJob = useBatchCaptureJobWaiter({
    readBatchCaptureJob: props.imageAddons.readBatchCaptureJob,
  });
  const captureOnly = useSocialCaptureOnlyFlow({
    props,
    attachBatchCaptureResultToActiveDraft,
    waitForBatchCaptureJob,
  });
  const programmableState = useSocialProgrammableCaptureState({
    settings: props.settings,
    clearCaptureOnlyFeedback: captureOnly.clearCaptureOnlyFeedback,
  });
  const programmableFlow = useSocialProgrammableCaptureFlow({
    props,
    programmableState,
    attachBatchCaptureResultToActiveDraft,
    waitForBatchCaptureJob,
    toast,
  });

  return buildSocialCaptureFlowsResult({
    captureOnly,
    programmableState,
    programmableFlow,
    attachBatchCaptureResultToActiveDraft,
    waitForBatchCaptureJob,
  });
}

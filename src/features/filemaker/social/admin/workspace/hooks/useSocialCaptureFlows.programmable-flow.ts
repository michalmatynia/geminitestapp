'use client';

import { useCallback } from 'react';

import type { useToast } from '@/shared/ui';

import {
  type RunProgrammableCaptureFlow,
  useRunProgrammableCaptureFlow,
} from './useSocialCaptureFlows.programmable-run';
import { useRetryFailedProgrammableCaptureJob } from './useSocialCaptureFlows.programmable-retry';
import type {
  AttachBatchCaptureResult,
  SocialCaptureFlowsProps,
  SocialCaptureFlowsResult,
  SocialProgrammableCaptureControls,
  WaitForBatchCaptureJob,
} from './useSocialCaptureFlows.types';

type ToastFn = ReturnType<typeof useToast>['toast'];

type UseSocialProgrammableCaptureFlowParams = {
  props: SocialCaptureFlowsProps;
  programmableState: SocialProgrammableCaptureControls;
  attachBatchCaptureResultToActiveDraft: AttachBatchCaptureResult;
  waitForBatchCaptureJob: WaitForBatchCaptureJob;
  toast: ToastFn;
};

type SocialProgrammableCaptureFlowHandlers = Pick<
  SocialCaptureFlowsResult,
  | 'handleRunProgrammablePlaywrightCapture'
  | 'handleRunProgrammablePlaywrightCaptureAndPipeline'
  | 'handleRetryFailedProgrammableCaptureJob'
>;

const resolveProgrammablePersonaId = (personaId: string): string | null =>
  personaId.length > 0 ? personaId : null;

const useProgrammableCaptureRunHandlers = ({
  programmableState,
  runProgrammableCaptureFlow,
}: {
  programmableState: SocialProgrammableCaptureControls;
  runProgrammableCaptureFlow: RunProgrammableCaptureFlow;
}): Pick<
  SocialCaptureFlowsResult,
  'handleRunProgrammablePlaywrightCapture' | 'handleRunProgrammablePlaywrightCaptureAndPipeline'
> => {
  const handleRunProgrammablePlaywrightCapture = useCallback(async (): Promise<void> => {
    await runProgrammableCaptureFlow({
      baseUrl: programmableState.programmableCaptureBaseUrl,
      personaId: resolveProgrammablePersonaId(programmableState.programmableCapturePersonaId),
      script: programmableState.programmableCaptureScript,
      routes: programmableState.programmableCaptureRoutes,
    });
  }, [programmableState, runProgrammableCaptureFlow]);

  const handleRunProgrammablePlaywrightCaptureAndPipeline = useCallback(
    async (): Promise<void> => {
      await runProgrammableCaptureFlow({
        baseUrl: programmableState.programmableCaptureBaseUrl,
        personaId: resolveProgrammablePersonaId(programmableState.programmableCapturePersonaId),
        script: programmableState.programmableCaptureScript,
        routes: programmableState.programmableCaptureRoutes,
        runPipelineAfterCapture: true,
      });
    },
    [programmableState, runProgrammableCaptureFlow]
  );

  return {
    handleRunProgrammablePlaywrightCapture,
    handleRunProgrammablePlaywrightCaptureAndPipeline,
  };
};

export const useSocialProgrammableCaptureFlow = ({
  props,
  programmableState,
  attachBatchCaptureResultToActiveDraft,
  waitForBatchCaptureJob,
  toast,
}: UseSocialProgrammableCaptureFlowParams): SocialProgrammableCaptureFlowHandlers => {
  const runProgrammableCaptureFlow = useRunProgrammableCaptureFlow({
    props,
    programmableState,
    attachBatchCaptureResultToActiveDraft,
    waitForBatchCaptureJob,
  });
  const runHandlers = useProgrammableCaptureRunHandlers({
    programmableState,
    runProgrammableCaptureFlow,
  });
  const retryHandlers = useRetryFailedProgrammableCaptureJob({
    props,
    programmableState,
    runProgrammableCaptureFlow,
    toast,
  });

  return {
    ...runHandlers,
    ...retryHandlers,
  };
};

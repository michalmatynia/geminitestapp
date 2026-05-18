'use client';

import { useCallback } from 'react';

import type { SocialPublishingImageAddonsBatchResult } from '@/shared/contracts/social-publishing-image-addons';
import type { ImageFileSelection } from '@/shared/contracts/files';

import {
  applyLiveProgrammableCaptureMessage,
  buildNoAttachmentFailureMessage,
  buildNoAttachmentMessage,
  buildProgrammableInitialMessage,
  buildProgrammableSuccessMessage,
  handleProgrammableFlowException,
  requireCompletedProgrammableResult,
  setProgrammableFlowFailure,
} from './useSocialCaptureFlows.programmable-runtime';
import type {
  AttachBatchCaptureResult,
  ProgrammableCaptureFlowParams,
  SocialCaptureFlowsProps,
  SocialProgrammableCaptureControls,
  WaitForBatchCaptureJob,
} from './useSocialCaptureFlows.types';

export type RunProgrammableCaptureFlow = (
  params: ProgrammableCaptureFlowParams
) => Promise<void>;

type UseRunProgrammableCaptureFlowParams = {
  props: SocialCaptureFlowsProps;
  programmableState: SocialProgrammableCaptureControls;
  attachBatchCaptureResultToActiveDraft: AttachBatchCaptureResult;
  waitForBatchCaptureJob: WaitForBatchCaptureJob;
};

type CompletedProgrammableCapture = {
  result: SocialPublishingImageAddonsBatchResult;
  attached: {
    imageAddonIds: string[];
    imageAssets: ImageFileSelection[];
  } | null;
};

type RunProgrammableCaptureJobParams = {
  props: SocialCaptureFlowsProps;
  state: SocialProgrammableCaptureControls;
  params: ProgrammableCaptureFlowParams;
  shouldRunPipeline: boolean;
  waitForBatchCaptureJob: WaitForBatchCaptureJob;
  attachBatchCaptureResultToActiveDraft: AttachBatchCaptureResult;
};

type CompleteProgrammableCaptureFlowParams = {
  props: SocialCaptureFlowsProps;
  state: SocialProgrammableCaptureControls;
  params: ProgrammableCaptureFlowParams;
  shouldRunPipeline: boolean;
  capture: CompletedProgrammableCapture;
};

const PIPELINE_BLOCKED_MESSAGE =
  'Choose a Social Publishing post model before running capture and pipeline.';

const isProgrammableCaptureBlocked = ({
  props,
  state,
  shouldRunPipeline,
}: {
  props: SocialCaptureFlowsProps;
  state: SocialProgrammableCaptureControls;
  shouldRunPipeline: boolean;
}): boolean => {
  if (props.editor.activePost === null) {
    state.setProgrammableCaptureBatchCaptureJob(null);
    setProgrammableFlowFailure(state, 'Create or select a draft before capturing images.');
    return true;
  }
  if (shouldRunPipeline && props.canGenerateSocialDraft === false) {
    setProgrammableFlowFailure(
      state,
      props.socialDraftBlockedReason ?? PIPELINE_BLOCKED_MESSAGE
    );
    return true;
  }

  return false;
};

const prepareProgrammableCaptureFlow = (
  state: SocialProgrammableCaptureControls,
  shouldRunPipeline: boolean
): void => {
  state.setProgrammableCapturePending(true);
  state.setProgrammableCaptureBatchCaptureJob(null);
  state.setProgrammableCaptureMessage(buildProgrammableInitialMessage(shouldRunPipeline));
  state.setProgrammableCaptureErrorMessage(null);
};

const runProgrammableCaptureJob = async ({
  props,
  state,
  params,
  shouldRunPipeline,
  waitForBatchCaptureJob,
  attachBatchCaptureResultToActiveDraft,
}: RunProgrammableCaptureJobParams): Promise<CompletedProgrammableCapture> => {
  const startedJob = await props.imageAddons.startBatchCapture({
    baseUrl: params.baseUrl,
    presetIds: [],
    presetLimit: null,
    playwrightPersonaId: params.personaId,
    playwrightScript: params.script,
    playwrightRoutes: params.routes,
  });
  applyLiveProgrammableCaptureMessage(startedJob, state);

  const completedJob = await waitForBatchCaptureJob(startedJob, (job) => {
    applyLiveProgrammableCaptureMessage(job, state);
  });
  const result = requireCompletedProgrammableResult(completedJob, shouldRunPipeline);

  return {
    result,
    attached: await attachBatchCaptureResultToActiveDraft(result),
  };
};

const completeProgrammableCaptureFlow = async ({
  props,
  state,
  params,
  shouldRunPipeline,
  capture,
}: CompleteProgrammableCaptureFlowParams): Promise<void> => {
  if (capture.attached === null || capture.result.addons.length === 0) {
    if (capture.result.failures.length > 0) {
      setProgrammableFlowFailure(
        state,
        buildNoAttachmentFailureMessage({
          result: capture.result,
          routes: params.routes,
          shouldRunPipeline,
        })
      );
      return;
    }
    state.setProgrammableCaptureMessage(buildNoAttachmentMessage(shouldRunPipeline));
    return;
  }

  state.setProgrammableCaptureMessage(
    buildProgrammableSuccessMessage({
      result: capture.result,
      routeCount: params.routes.length,
      routes: params.routes,
      shouldRunPipeline,
    })
  );
  if (shouldRunPipeline === false) {
    return;
  }

  state.setIsProgrammablePlaywrightModalOpen(false);
  state.setProgrammableCapturePending(false);
  await props.pipeline.handleRunFullPipelineWithOverrides(capture.attached);
};

export const useRunProgrammableCaptureFlow = ({
  props,
  programmableState,
  attachBatchCaptureResultToActiveDraft,
  waitForBatchCaptureJob,
}: UseRunProgrammableCaptureFlowParams): RunProgrammableCaptureFlow =>
  useCallback(
    async (params) => {
      const shouldRunPipeline = params.runPipelineAfterCapture === true;
      if (
        isProgrammableCaptureBlocked({ props, state: programmableState, shouldRunPipeline })
      ) {
        return;
      }
      prepareProgrammableCaptureFlow(programmableState, shouldRunPipeline);

      try {
        const capture = await runProgrammableCaptureJob({
          props,
          state: programmableState,
          params,
          shouldRunPipeline,
          waitForBatchCaptureJob,
          attachBatchCaptureResultToActiveDraft,
        });
        await completeProgrammableCaptureFlow({
          props,
          state: programmableState,
          params,
          shouldRunPipeline,
          capture,
        });
      } catch (error) {
        handleProgrammableFlowException({
          error,
          setters: programmableState,
          props,
          shouldRunPipeline,
        });
      } finally {
        programmableState.setProgrammableCapturePending(false);
      }
    },
    [
      attachBatchCaptureResultToActiveDraft,
      programmableState,
      props,
      waitForBatchCaptureJob,
    ]
  );

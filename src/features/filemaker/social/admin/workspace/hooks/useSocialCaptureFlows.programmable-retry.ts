'use client';

import { useCallback } from 'react';

import { resolveFailedSocialPublishingProgrammableCaptureRoutes } from '@/features/filemaker/social/shared/social-capture-feedback';
import { SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT } from '@/features/filemaker/social/shared/social-playwright-capture';
import type { useToast } from '@/shared/ui';
import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';

import type { RunProgrammableCaptureFlow } from './useSocialCaptureFlows.programmable-run';
import type {
  SocialCaptureFlowsProps,
  SocialCaptureFlowsResult,
  SocialProgrammableCaptureControls,
} from './useSocialCaptureFlows.types';

type ToastFn = ReturnType<typeof useToast>['toast'];

type RetryRequest = {
  baseUrl: string;
  personaId: string | null;
  script: string;
  storedRoutes: SocialPublishingProgrammableCaptureRoute[];
  failedRoutes: SocialPublishingProgrammableCaptureRoute[];
};

const readRetryStoredRoutes = (
  job: SocialPublishingImageAddonsBatchJob
): SocialPublishingProgrammableCaptureRoute[] => job.request?.playwrightRoutes ?? [];

const readRetryFailedRoutes = (
  job: SocialPublishingImageAddonsBatchJob,
  storedRoutes: SocialPublishingProgrammableCaptureRoute[]
): SocialPublishingProgrammableCaptureRoute[] =>
  resolveFailedSocialPublishingProgrammableCaptureRoutes(
    job.result?.failures ?? [],
    storedRoutes
  );

const readRetryScript = (job: SocialPublishingImageAddonsBatchJob): string =>
  job.request?.playwrightScript ?? SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT;

const buildRetryRequest = (
  job: SocialPublishingImageAddonsBatchJob,
  fallbackBaseUrl: string
): RetryRequest => {
  const storedRoutes = readRetryStoredRoutes(job);
  const failedRoutes = readRetryFailedRoutes(job, storedRoutes);

  return {
    baseUrl: job.request?.baseUrl ?? fallbackBaseUrl,
    personaId: job.request?.playwrightPersonaId ?? null,
    script: readRetryScript(job),
    storedRoutes,
    failedRoutes,
  };
};

const applyRetryRequestState = (
  state: SocialProgrammableCaptureControls,
  request: RetryRequest
): void => {
  state.setProgrammableCaptureBaseUrl(request.baseUrl);
  state.setProgrammableCapturePersonaId(request.personaId ?? '');
  state.setProgrammableCaptureScript(request.script);
  state.setProgrammableCaptureRoutes(request.storedRoutes);
};

export const useRetryFailedProgrammableCaptureJob = ({
  props,
  programmableState,
  runProgrammableCaptureFlow,
  toast,
}: {
  props: SocialCaptureFlowsProps;
  programmableState: SocialProgrammableCaptureControls;
  runProgrammableCaptureFlow: RunProgrammableCaptureFlow;
  toast: ToastFn;
}): Pick<SocialCaptureFlowsResult, 'handleRetryFailedProgrammableCaptureJob'> => {
  const handleRetryFailedProgrammableCaptureJob = useCallback(
    async (job: SocialPublishingImageAddonsBatchJob): Promise<void> => {
      const request = buildRetryRequest(job, props.settings.batchCaptureBaseUrl);

      if (request.failedRoutes.length === 0) {
        toast('This run has no failed programmable routes to retry.', {
          variant: 'warning',
        });
        return;
      }

      applyRetryRequestState(programmableState, request);
      await runProgrammableCaptureFlow({
        baseUrl: request.baseUrl,
        personaId: request.personaId,
        script: request.script,
        routes: request.failedRoutes,
      });
    },
    [programmableState, props.settings.batchCaptureBaseUrl, runProgrammableCaptureFlow, toast]
  );

  return { handleRetryFailedProgrammableCaptureJob };
};
